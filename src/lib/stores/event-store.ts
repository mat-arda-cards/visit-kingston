// Portal-editable events calendar.
// Seed data ships in src/lib/data/events.ts; portal edits overlay it.

import type { EventItem } from "../types";
import { events as seed } from "../data/events";
import { readMerged, writeOverlayRecord } from "./json-store";

const STORE = "events";

export async function getEvents(): Promise<EventItem[]> {
  const all = await readMerged<EventItem>(STORE, seed);
  return all.sort((a, b) => a.start.localeCompare(b.start));
}

export async function getEvent(id: string): Promise<EventItem | undefined> {
  return (await getEvents()).find((e) => e.id === id);
}

export async function saveEvent(record: EventItem): Promise<void> {
  await writeOverlayRecord(STORE, record);
}

export async function deleteEvent(id: string): Promise<void> {
  await writeOverlayRecord(STORE, { id, _deleted: true } as EventItem & { _deleted: true });
}

/** Other events on the same Pacific calendar date — the deconfliction check. */
export async function eventsSharingDate(
  dateIso: string,
  excludeId?: string,
): Promise<EventItem[]> {
  const day = dateIso.slice(0, 10);
  return (await getEvents()).filter(
    (e) => e.start.slice(0, 10) === day && e.id !== excludeId,
  );
}
