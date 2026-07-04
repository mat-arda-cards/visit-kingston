// Ferry observation log — the data that lets the trip planner learn over time.
//
// WSF exposes live "drive-up spaces remaining" per upcoming sailing and a live
// per-direction delay, but never ARCHIVES either. So we snapshot them (throttled)
// from the same feed the ferry pages already fetch, append them here, and
// aggregate them into an empirical busyness table the forecast blends in
// (src/lib/ferry-forecast). Append-only, same filesystem/DB seam as
// analytics-store.ts; retention pruning keeps the row count bounded.
//
// Scope: Edmonds–Kingston only (terminals 8/12), matching the planner.

import { appendFile, mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

import { dataPath } from "../data-dir";
import { hasDb, db, ensureSchema } from "../db";
import type { Direction } from "../types";
import type { SailingSpace, RouteDelays } from "../wsf";
import { empiricalBucketKey, type EmpiricalTable } from "../ferry-forecast";

const TZ = "America/Los_Angeles";
const DATA_FILE = dataPath("ferry", "observations.jsonl");

// Snapshot at most this often (any process): the pages poll every 60s and many
// tabs can be open, but ~10 min captures the fill trajectory without flooding.
const THROTTLE_MS = 10 * 60 * 1000;
// Record the next couple of upcoming sailings per direction (near-term space is
// the meaningful signal; further-out sailings barely move).
const SAILINGS_PER_DIR = 2;
const RETENTION_DAYS = 90;
const PRUNE_EVERY = 48; // prune roughly every ~8h of snapshots
const CACHE_TTL_MS = 10 * 60 * 1000; // aggregate cache

/** One logged snapshot of a single Edmonds–Kingston sailing. */
export interface FerryObservation {
  /** When this snapshot was taken (ISO). */
  ts: string;
  dir: Direction;
  /** The sailing's scheduled departure (ISO) — its identity across snapshots. */
  departs: string;
  /** Drive-up car spaces still open at ts (null when WSF isn't reporting). */
  driveUp: number | null;
  /** Total drive-up capacity for the sailing (null when unknown). */
  max: number | null;
  /** That direction's live delay in minutes at ts (only on the soonest sailing). */
  delayMin: number | null;
}

export interface EmpiricalResult {
  table: EmpiricalTable;
  /** Total sailing snapshots with usable fullness behind the table. */
  sampleCount: number;
  /** Distinct Pacific days we've collected on. */
  days: number;
  updatedAt: string;
}

let lastRecordAt = 0;
let writesSincePrune = 0;
let aggCache: { at: number; value: EmpiricalResult } | null = null;

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/** ISO instant → Kingston-local date "YYYY-MM-DD" + minutes-since-midnight. */
function pacificParts(iso: string): { date: string; minutes: number } {
  const d = new Date(iso);
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
  const t = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const get = (x: string) => Number(t.find((p) => p.type === x)?.value ?? 0);
  return { date, minutes: get("hour") * 60 + get("minute") };
}

/**
 * Snapshot current Edmonds–Kingston sailing fullness + delay, throttled to at
 * most one write per THROTTLE_MS. Best-effort and fire-and-forget from the
 * status pipeline — callers should not await it on a user's critical path.
 * Returns true when it actually wrote.
 */
export async function recordSailingSpaceSnapshot(
  space: { kingston: SailingSpace[]; edmonds: SailingSpace[] },
  delays: RouteDelays,
): Promise<boolean> {
  const now = Date.now();
  if (now - lastRecordAt < THROTTLE_MS) return false;
  lastRecordAt = now; // claim the slot synchronously so concurrent polls don't double-write

  const ts = new Date(now).toISOString();
  const build = (list: SailingSpace[], dir: Direction, delay: number | null): FerryObservation[] =>
    list.slice(0, SAILINGS_PER_DIR).map((s, i) => ({
      ts,
      dir,
      departs: s.departs,
      driveUp: s.driveUpSpaces,
      max: s.maxSpaces,
      delayMin: i === 0 ? delay : null,
    }));

  const observations: FerryObservation[] = [
    // Leaving Kingston = eastbound = "from-kingston".
    ...build(space.kingston, "from-kingston", delays.fromKingston),
    // Leaving Edmonds = westbound = "to-kingston".
    ...build(space.edmonds, "to-kingston", delays.toKingston),
  ];
  if (observations.length === 0) return false;

  if (hasDb()) {
    await ensureSchema();
    const sql = db();
    for (const obs of observations) {
      await sql`INSERT INTO ferry_observation (obs) VALUES (${JSON.stringify(obs)}::jsonb)`;
    }
  } else {
    await mkdir(path.dirname(DATA_FILE), { recursive: true });
    await appendFile(DATA_FILE, observations.map((o) => JSON.stringify(o)).join("\n") + "\n", "utf8");
  }

  aggCache = null; // fresh data — let the next read recompute
  if (++writesSincePrune >= PRUNE_EVERY) {
    writesSincePrune = 0;
    void prune(now).catch(() => {});
  }
  return true;
}

async function readObservations(): Promise<FerryObservation[]> {
  if (hasDb()) {
    await ensureSchema();
    const sql = db();
    const rows = (await sql`SELECT obs FROM ferry_observation`) as { obs: FerryObservation }[];
    return rows.map((r) => r.obs);
  }
  let lines: string[] = [];
  try {
    lines = (await readFile(DATA_FILE, "utf8")).split("\n").filter(Boolean);
  } catch {
    return []; // nothing logged yet
  }
  const out: FerryObservation[] = [];
  for (const line of lines) {
    try {
      out.push(JSON.parse(line) as FerryObservation);
    } catch {
      // skip a corrupt line rather than losing the aggregate
    }
  }
  return out;
}

/**
 * Aggregate logged observations into the empirical busyness table the forecast
 * blends in: per direction × season × weekday × hour, the mean observed
 * fullness (0–100) nudged up a little by mean delay. Cached briefly so repeated
 * forecasts don't rescan the log.
 */
export async function getEmpiricalBusyness(): Promise<EmpiricalResult> {
  if (aggCache && Date.now() - aggCache.at < CACHE_TTL_MS) return aggCache.value;

  const observations = await readObservations();
  const acc = new Map<string, { sumFull: number; nFull: number; sumDelay: number; nDelay: number }>();
  const days = new Set<string>();
  let sampleCount = 0;

  for (const o of observations) {
    const at = pacificParts(o.departs);
    const key = empiricalBucketKey(o.dir, at.date, at.minutes);
    const entry = acc.get(key) ?? { sumFull: 0, nFull: 0, sumDelay: 0, nDelay: 0 };

    if (typeof o.max === "number" && o.max > 0 && typeof o.driveUp === "number" && o.driveUp >= 0) {
      entry.sumFull += clamp01(1 - o.driveUp / o.max) * 100;
      entry.nFull += 1;
      sampleCount += 1;
    }
    if (typeof o.delayMin === "number" && o.delayMin > 0) {
      entry.sumDelay += o.delayMin;
      entry.nDelay += 1;
    }
    acc.set(key, entry);
    days.add(pacificParts(o.ts).date);
  }

  const table: EmpiricalTable = {};
  for (const [key, e] of acc) {
    if (e.nFull === 0) continue; // need at least one fullness reading for a score
    const meanFull = e.sumFull / e.nFull;
    // A modest delay bump: a chronically late direction is a busier one, but
    // fullness is the primary signal — cap the boost at +12 for a 30-min mean.
    const delayBoost = e.nDelay > 0 ? (Math.min(e.sumDelay / e.nDelay, 30) / 30) * 12 : 0;
    table[key] = { s: Math.max(0, Math.min(100, Math.round(meanFull + delayBoost))), n: e.nFull };
  }

  const value: EmpiricalResult = {
    table,
    sampleCount,
    days: days.size,
    updatedAt: new Date().toISOString(),
  };
  aggCache = { at: Date.now(), value };
  return value;
}

/** Drop observations older than the retention window. Best-effort. */
async function prune(nowMs: number): Promise<void> {
  const cutoff = nowMs - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  if (hasDb()) {
    await ensureSchema();
    const sql = db();
    await sql`DELETE FROM ferry_observation WHERE ts < ${new Date(cutoff).toISOString()}`;
    return;
  }
  let lines: string[] = [];
  try {
    lines = (await readFile(DATA_FILE, "utf8")).split("\n").filter(Boolean);
  } catch {
    return;
  }
  const kept = lines.filter((line) => {
    try {
      return Date.parse((JSON.parse(line) as FerryObservation).ts) >= cutoff;
    } catch {
      return false; // drop corrupt lines while we're rewriting anyway
    }
  });
  if (kept.length !== lines.length) {
    await writeFile(DATA_FILE, kept.length ? kept.join("\n") + "\n" : "", "utf8");
  }
}
