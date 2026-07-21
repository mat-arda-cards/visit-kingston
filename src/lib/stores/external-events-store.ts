// Ingested external calendar events (E12): the persisted mirror of the
// enabled sources' feeds, keyed `${source}:${externalId}` (colon ids — this
// store has its own ID rule in store-schemas.ts, like ops-markers).
//
// Records land `status: "live"` by design: these are the Chamber's (and
// Port's) ALREADY-PUBLISHED calendars, moderated upstream — the E08
// hold-by-default floor governs submissions, not aggregation (rationale
// recorded in docs/adr/ADR-0005-events-canonical-source.md). Rendering stays
// flag-gated regardless: data flows dark until E15 flips the flag.
//
// Sync semantics are MIRROR + idempotent: an unchanged upstream event writes
// nothing (no audit spam); a changed one upserts; one absent from its
// source's current feed tombstones (cancelled upstream — and disabling a
// source drops its events from the merged output at read time either way).

import "server-only";

import type { EventSource, NormalizedEvent } from "@/lib/events/types";
import {
  readMergedAdmin,
  readOverlay,
  writeOverlayRecord,
  type WriteMeta,
} from "./json-store";

const STORE = "external-events";

export type ExternalEventRecord = NormalizedEvent & { id: string };

export function externalEventRecordId(source: string, externalId: string): string {
  return `${source}:${externalId}`;
}

/** Live external events, optionally narrowed to the given sources — the
 *  unified read path passes the ENABLED source ids (delta 2: disabling a
 *  source must cleanly drop its events from the merged output). */
export async function getExternalEvents(opts?: {
  sources?: readonly string[];
}): Promise<ExternalEventRecord[]> {
  const all = await readMergedAdmin<ExternalEventRecord>(STORE, [], { statuses: ["live"] });
  const rows = all.map(({ status: _status, ...rest }) => rest as ExternalEventRecord);
  if (!opts?.sources) return rows;
  const allowed = new Set(opts.sources);
  return rows.filter((r) => allowed.has(r.source));
}

/**
 * Idempotent per-source sync: upsert new/changed, tombstone rows of this
 * source that the feed no longer serves. Returns counts for the run report.
 * Same feed state twice → { created: 0, updated: 0, removed: 0 }.
 */
export async function syncExternalEvents(
  source: EventSource,
  events: NormalizedEvent[],
  meta?: WriteMeta,
): Promise<{ created: number; updated: number; removed: number; unchanged: number }> {
  const existing = await readOverlay<ExternalEventRecord>(STORE);
  const mine = new Map(
    existing
      .filter((r) => r.source === source)
      .map((r) => [r.id, r] as const),
  );

  const writeMeta: WriteMeta = {
    actor: meta?.actor ?? "system",
    source: meta?.source ?? "sync",
    status: "live",
  };

  let created = 0;
  let updated = 0;
  let unchanged = 0;
  const seen = new Set<string>();
  for (const event of events) {
    const id = externalEventRecordId(event.source, event.externalId);
    if (seen.has(id)) continue; // same series id twice in a feed: first wins
    seen.add(id);
    const record: ExternalEventRecord = { id, ...event };
    const before = mine.get(id);
    if (before && !before._deleted && sameDoc(before, record)) {
      unchanged++;
      continue;
    }
    await writeOverlayRecord(STORE, record, { ...writeMeta, externalId: event.externalId });
    if (before && !before._deleted) updated++;
    else created++;
  }

  let removed = 0;
  for (const [id, row] of mine) {
    if (seen.has(id) || row._deleted) continue;
    await writeOverlayRecord(STORE, { id, _deleted: true } as ExternalEventRecord & {
      _deleted: true;
    }, writeMeta);
    removed++;
  }

  return { created, updated, removed, unchanged };
}

/** Doc equality modulo the overlay bookkeeping key order — cheap and exact:
 *  both sides came through JSON, so a stable stringify comparison holds. */
function sameDoc(a: ExternalEventRecord, b: ExternalEventRecord): boolean {
  return stableStringify(a) === stableStringify(b);
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([k, v]) => v !== undefined && k !== "_deleted")
      .sort(([x], [y]) => x.localeCompare(y))
      .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`);
    return `{${entries.join(",")}}`;
  }
  return JSON.stringify(value);
}
