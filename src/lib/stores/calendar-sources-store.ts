// Per-source ingest configuration (E12): which external calendar sources run,
// plus their last-run reports. The seed defaults live in CODE (readMerged's
// seed argument), so flipping a source is an overlay write — an admin toggle,
// no deploy — which delta 2 makes load-bearing: the GrowthZone source ends at
// the R3 freeze (~April 2027) by being disabled right here (an R4 gate item,
// not an E12 action; procedure in docs/OPERATIONS.md).
//
// Source states per ADR-0005:
//   ams-ical                enabled  (transitional; ends ~April 2027)
//   tribe-explorekingstonwa enabled  (healthy-but-empty-tolerant — total: 0
//                                    on 2026-07-04/05/20; fills with no deploy)
//   tribe-portofkingston    disabled (built, pending Chamber sign-off — ask-first)
//
// Base URLs are NOT stored: they derive from the compile-time
// SOURCE_ALLOWLIST. The one configurable URL is the staff-generated GrowthZone
// whole-calendar feed (record field, env fallback AMS_CALENDAR_FEED_URL) —
// docs/OPERATIONS.md §9 item 6b.

import "server-only";

import type { EventSource, IngestReport } from "@/lib/events/types";
import { readMerged, writeOverlayRecord, type WriteMeta } from "./json-store";

const STORE = "calendar-sources";

export type IngestSourceId = Exclude<EventSource, "in-app">;

export interface CalendarSourceRecord {
  id: IngestSourceId;
  enabled: boolean;
  /** GrowthZone whole-calendar feed URL (ams-ical only) — see header. */
  feedUrl?: string;
  lastRunAt?: string;
  lastRunReport?: IngestReport & { created?: number; updated?: number; removed?: number };
  setBy?: string;
  setAt?: string;
}

const SEED: CalendarSourceRecord[] = [
  { id: "ams-ical", enabled: true },
  { id: "tribe-explorekingstonwa", enabled: true },
  { id: "tribe-portofkingston", enabled: false },
];

export async function getCalendarSources(): Promise<CalendarSourceRecord[]> {
  const rows = await readMerged<CalendarSourceRecord>(STORE, SEED);
  // Seed order is the display + ingest order; overlay rows keep their slot.
  return SEED.map((s) => rows.find((r) => r.id === s.id) ?? s).concat(
    rows.filter((r) => !SEED.some((s) => s.id === r.id)),
  );
}

export async function getCalendarSource(
  id: IngestSourceId,
): Promise<CalendarSourceRecord | undefined> {
  return (await getCalendarSources()).find((r) => r.id === id);
}

export async function getEnabledSourceIds(): Promise<IngestSourceId[]> {
  return (await getCalendarSources()).filter((r) => r.enabled).map((r) => r.id);
}

export async function setSourceEnabled(
  id: IngestSourceId,
  enabled: boolean,
  setBy: string,
  meta?: WriteMeta,
): Promise<void> {
  const current = await getCalendarSource(id);
  await writeOverlayRecord<CalendarSourceRecord>(
    STORE,
    { ...(current ?? { id, enabled }), id, enabled, setBy, setAt: new Date().toISOString() },
    meta,
  );
}

export async function recordSourceRun(
  id: IngestSourceId,
  report: NonNullable<CalendarSourceRecord["lastRunReport"]>,
  meta?: WriteMeta,
): Promise<void> {
  const current = await getCalendarSource(id);
  await writeOverlayRecord<CalendarSourceRecord>(
    STORE,
    {
      ...(current ?? { id, enabled: false }),
      id,
      lastRunAt: new Date().toISOString(),
      lastRunReport: report,
    },
    meta,
  );
}
