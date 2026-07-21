// Admin dedupe verdicts (E12): "these two calendar entries are NOT the same
// event" (FR-EVT-02's admin override). Each record pins one occurrence-key
// pair apart; mergeCalendar honors the pair transitively. Keys reference the
// ORIGINAL-start occurrence stamps, which survive upstream reschedules.

import "server-only";

import type { DedupeOverride } from "@/lib/events/dedupe";
import { readMerged, writeOverlayRecord, type WriteMeta } from "./json-store";

const STORE = "event-overrides";

export interface EventOverrideRecord {
  id: string;
  keyA: string;
  keyB: string;
  verdict: "not-duplicate";
  setBy: string;
  setAt: string;
}

/** Canonical id for a pair — order-independent, so the same verdict entered
 *  from either direction upserts one record. */
export function overrideId(keyA: string, keyB: string): string {
  const [a, b] = keyA < keyB ? [keyA, keyB] : [keyB, keyA];
  return `${a}|${b}`;
}

export async function listEventOverrides(): Promise<EventOverrideRecord[]> {
  return readMerged<EventOverrideRecord>(STORE, []);
}

/** The shape mergeCalendar consumes. */
export async function listDedupeOverrides(): Promise<DedupeOverride[]> {
  return (await listEventOverrides()).map(({ keyA, keyB, verdict }) => ({
    keyA,
    keyB,
    verdict,
  }));
}

export async function addEventOverride(
  keyA: string,
  keyB: string,
  setBy: string,
  meta?: WriteMeta,
): Promise<EventOverrideRecord> {
  const record: EventOverrideRecord = {
    id: overrideId(keyA, keyB),
    keyA,
    keyB,
    verdict: "not-duplicate",
    setBy,
    setAt: new Date().toISOString(),
  };
  await writeOverlayRecord(STORE, record, meta);
  return record;
}

export async function removeEventOverride(id: string, meta?: WriteMeta): Promise<void> {
  await writeOverlayRecord(STORE, { id, _deleted: true } as EventOverrideRecord & {
    _deleted: true;
  }, meta);
}
