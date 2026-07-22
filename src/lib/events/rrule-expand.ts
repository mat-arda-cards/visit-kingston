// Recurrence expansion (E12 pure core): the thin wrapper over the `rrule`
// package — the ONE place recurrence math happens (hand-rolling RRULE logic
// anywhere else is charter-forbidden).
//
// ── The DST trap this file exists for ─────────────────────────────────────
// `rrule` does naive UTC arithmetic and mishandles zoned datetimes: expanding
// "weekly at 18:30 Pacific" as real instants drifts an hour when DST flips.
// Strategy (per the epic): expand in FLOATING time — the series start's
// Pacific wall-clock components faked as UTC — then re-anchor every
// occurrence's wall time to America/Los_Angeles with the Intl helper. A
// weekly 18:30 event stays 18:30 local on both sides of 2026-11-01 (fall
// back) and 2027-03-14 (spring forward); the unit tests cross both.

import { RRule } from "rrule";
import { instantToWallTime, pacificDateKey, toUtcBasic, wallTimeToInstant } from "./tz";
import type { NormalizedEvent } from "./types";

const ZONE = "America/Los_Angeles";

/** Hard cap per series (epic constraint): a runaway RRULE (missing UNTIL or
 *  COUNT on a daily rule) may not flood the calendar.
 *
 *  NOTE this caps what we KEEP, not what we BUILD — `between()` materialises
 *  the whole window first and only then is this slice applied. That is why the
 *  frequency guard below exists: past a certain FREQ the cost is set by the
 *  rule, not by this number. */
export const MAX_OCCURRENCES_PER_SERIES = 62;

/** Finest recurrence this calendar will expand; anything faster is refused.
 *
 *  rrule orders its Frequency enum coarse->fine (YEARLY=0 ... SECONDLY=6), so
 *  "faster than hourly" is `freq > FINEST_SUPPORTED_FREQ`. Hourly is the last
 *  frequency that is both plausible for a community calendar (an on-the-hour
 *  tour or shuttle loop) and cheap to expand — see the guard for the numbers. */
export const FINEST_SUPPORTED_FREQ = RRule.HOURLY;

const FREQ_NAME: Record<number, string> = {
  [RRule.YEARLY]: "YEARLY",
  [RRule.MONTHLY]: "MONTHLY",
  [RRule.WEEKLY]: "WEEKLY",
  [RRule.DAILY]: "DAILY",
  [RRule.HOURLY]: "HOURLY",
  [RRule.MINUTELY]: "MINUTELY",
  [RRule.SECONDLY]: "SECONDLY",
};

export interface ExpandOptions {
  /** Window start/end as real instants; the epic's read path passes
   *  [today − 1 day, today + 180 days]. Pure: the caller supplies `now`. */
  windowStart: Date;
  windowEnd: Date;
}

export interface ExpandResult {
  events: NormalizedEvent[];
  warnings: string[];
}

/** Real instant → the same wall-clock reading faked as UTC (floating time). */
function toFloating(iso: string): Date {
  const w = instantToWallTime(ZONE, new Date(iso));
  return new Date(Date.UTC(w.y, w.mo - 1, w.d, w.h, w.mi, w.s));
}

/** Floating (faked-UTC) date → the real Pacific instant it denotes. */
function fromFloating(floating: Date): Date {
  return wallTimeToInstant(
    ZONE,
    floating.getUTCFullYear(),
    floating.getUTCMonth() + 1,
    floating.getUTCDate(),
    floating.getUTCHours(),
    floating.getUTCMinutes(),
    floating.getUTCSeconds(),
  );
}

function occurrenceKeyFor(e: NormalizedEvent, originalStartIso: string): string {
  return `${e.source}:${e.externalId}:${toUtcBasic(originalStartIso)}`;
}

/**
 * Expand every recurring series in `events` over the window; pass
 * non-recurring events through unchanged. RECURRENCE-ID override events
 * (same source+externalId as a series) replace the occurrence whose ORIGINAL
 * start matches their recurrenceId — and keep that occurrence's key, so an
 * override changing the time does not orphan admin dedupe verdicts. EXDATEs
 * remove occurrences. Orphan overrides (no series or no matching occurrence)
 * degrade to standalone events rather than vanishing.
 */
export function expandEvents(
  events: NormalizedEvent[],
  opts: ExpandOptions,
): ExpandResult {
  const warnings: string[] = [];
  const out: NormalizedEvent[] = [];

  // Overrides indexed by series identity, then by original-start instant (ms).
  const overrides = new Map<string, Map<number, NormalizedEvent>>();
  const consumedOverrides = new Set<NormalizedEvent>();
  for (const e of events) {
    if (!e.recurrenceId) continue;
    const seriesKey = `${e.source}:${e.externalId}`;
    const byStart = overrides.get(seriesKey) ?? new Map<number, NormalizedEvent>();
    byStart.set(new Date(e.recurrenceId).getTime(), e);
    overrides.set(seriesKey, byStart);
  }

  for (const e of events) {
    if (e.recurrenceId) continue; // emitted (or degraded) via its series below

    if (!e.rrule) {
      out.push({ ...e, occurrenceKey: e.occurrenceKey || occurrenceKeyFor(e, e.startIso) });
      continue;
    }

    // ---- recurring series ----
    // Emit the series as a standalone event and say why. Shared by BOTH
    // refusal paths below, so a series we decline to expand degrades exactly
    // like an unparseable one — it never silently vanishes, and the reason
    // lands in the source's run report where an admin will see it.
    const keepAsSingle = (why: string): void => {
      warnings.push(`${e.source}:${e.externalId}: ${why} — kept as a single event`);
      const { rrule: _rrule, exdates: _exdates, ...single } = e;
      out.push({ ...single, occurrenceKey: e.occurrenceKey || occurrenceKeyFor(e, e.startIso) });
    };

    let rule: RRule;
    try {
      const parsed = RRule.parseString(e.rrule);

      // REFUSE anything faster than hourly, before an RRule is ever built.
      //
      // `between()` below materialises EVERY occurrence in the window and only
      // then applies the MAX_OCCURRENCES_PER_SERIES slice, so the cost is set
      // by the RULE, not by the cap. Measured over the real 181-day window
      // (2026-07-22): DAILY builds 182 dates (+3 MB) and HOURLY 4,345 (+7 MB),
      // but MINUTELY builds 260,641 (+87 MB) and SECONDLY 15,638,400 — the
      // last of which exhausts the container's heap before one event reaches
      // the calendar. The cap cannot help: it runs after the allocation.
      //
      // Refusing beats bounding the generation. A lazy iterator would fix the
      // MEMORY, but a SECONDLY series whose DTSTART is years back still has to
      // step through millions of occurrences just to reach windowStart — that
      // trades a memory bomb for a CPU one. Nothing on a community events
      // calendar recurs every minute, so a sub-daily rule is malformed input
      // rather than a shape we are choosing not to support, and .ics feeds are
      // third-party input we do not control.
      if (parsed.freq !== undefined && parsed.freq > FINEST_SUPPORTED_FREQ) {
        keepAsSingle(
          `FREQ=${FREQ_NAME[parsed.freq] ?? parsed.freq} recurs faster than ` +
            `${FREQ_NAME[FINEST_SUPPORTED_FREQ]} and is not expanded`,
        );
        continue;
      }

      // UNTIL arrives as a real instant; re-anchor it into floating time so
      // every comparison inside rrule happens in one (wall-clock) frame.
      if (parsed.until) parsed.until = toFloating(parsed.until.toISOString());
      rule = new RRule({ ...parsed, dtstart: toFloating(e.startIso) });
    } catch (err) {
      keepAsSingle(
        `unparseable RRULE "${e.rrule}" (${String((err as Error)?.message ?? err)})`,
      );
      continue;
    }

    const floatingOccs = rule
      .between(toFloating(opts.windowStart.toISOString()), toFloating(opts.windowEnd.toISOString()), true)
      .slice(0, MAX_OCCURRENCES_PER_SERIES);

    const exdateMs = new Set((e.exdates ?? []).map((x) => new Date(x).getTime()));
    const wallDurationMs =
      e.endIso !== undefined
        ? toFloating(e.endIso).getTime() - toFloating(e.startIso).getTime()
        : 0;
    const seriesOverrides = overrides.get(`${e.source}:${e.externalId}`);

    for (const floating of floatingOccs) {
      const occStart = fromFloating(floating);
      const originalStartIso = occStart.toISOString();
      if (exdateMs.has(occStart.getTime())) continue;

      const override = seriesOverrides?.get(occStart.getTime());
      const key = occurrenceKeyFor(e, originalStartIso);
      if (override) {
        consumedOverrides.add(override);
        const { rrule: _r, exdates: _x, recurrenceId: _id, ...rest } = override;
        out.push({ ...rest, occurrenceKey: key });
        continue;
      }

      const occEndIso =
        wallDurationMs > 0
          ? fromFloating(new Date(floating.getTime() + wallDurationMs)).toISOString()
          : undefined;
      const { rrule: _r, exdates: _x, ...rest } = e;
      out.push({
        ...rest,
        startIso: e.allDay ? pacificDateKeyToMidnightIso(originalStartIso) : originalStartIso,
        endIso: occEndIso,
        occurrenceKey: key,
      });
    }
  }

  // Orphan overrides: series absent from input, or no occurrence matched
  // (e.g. the original start fell outside the window). Standalone beats lost.
  for (const e of events) {
    if (!e.recurrenceId || consumedOverrides.has(e)) continue;
    const { rrule: _r, exdates: _x, recurrenceId, ...rest } = e;
    out.push({
      ...rest,
      occurrenceKey: e.occurrenceKey || occurrenceKeyFor(e, recurrenceId),
    });
  }

  return { events: out, warnings };
}

/** All-day occurrences re-emit as clean Pacific midnights (guards against a
 *  series whose faked start drifted sub-day fields). */
function pacificDateKeyToMidnightIso(iso: string): string {
  const day = pacificDateKey(iso);
  const [y, mo, d] = day.split("-").map(Number);
  return wallTimeToInstant(ZONE, y, mo, d).toISOString();
}
