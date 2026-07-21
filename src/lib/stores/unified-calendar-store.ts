// Admin on/off switch for the UNIFIED events calendar (E12) — the ship-dark
// flag, cloned from ferry-prediction-store.ts (the established pattern).
//
// With the flag OFF (the default — absence = OFF), the public /events page,
// /api/feeds/events, and the embed render byte-for-byte the same in-app-only
// data they render today; ingest still runs (data flows dark) and signed-in
// admins get a preview. E15 flips this at launch cutover — turning it ON in
// production is E15's call, not E12's.

import { getSessionUser } from "../auth";
import { readMerged, writeOverlayRecord, type WriteMeta } from "./json-store";

const STORE = "unified-calendar";
const RECORD_ID = "settings";

interface UnifiedCalendarRecord {
  id: typeof RECORD_ID;
  enabled: boolean;
  /** ISO timestamp it was last changed, for the admin display. */
  setAt: string;
  /** Who changed it (name or email), for the admin display. */
  setBy: string;
}

/** The stored setting, or null when never set (treated as OFF). */
export async function getUnifiedCalendarSetting(): Promise<UnifiedCalendarRecord | null> {
  const rows = await readMerged<UnifiedCalendarRecord>(STORE, []);
  return rows.find((r) => r.id === RECORD_ID) ?? null;
}

/** Whether the unified calendar is live for everyone. Defaults to OFF. */
export async function getUnifiedCalendarEnabled(): Promise<boolean> {
  return (await getUnifiedCalendarSetting())?.enabled ?? false;
}

/** Turn the public unified calendar on or off. */
export async function setUnifiedCalendarEnabled(
  enabled: boolean,
  setBy: string,
  meta?: WriteMeta,
): Promise<void> {
  await writeOverlayRecord<UnifiedCalendarRecord>(
    STORE,
    { id: RECORD_ID, enabled, setAt: new Date().toISOString(), setBy },
    meta,
  );
}

export interface UnifiedCalendarAccess {
  /** True when the unified calendar is live for everyone. */
  enabled: boolean;
  /** True when it's off publicly but the current admin may preview it. */
  adminPreview: boolean;
}

/**
 * Resolve whether the current request should see the unified calendar.
 * `visible = enabled || adminPreview` — same contract as the ferry flag.
 */
export async function getUnifiedCalendarAccess(): Promise<UnifiedCalendarAccess> {
  if (await getUnifiedCalendarEnabled()) return { enabled: true, adminPreview: false };
  const user = await getSessionUser();
  return { enabled: false, adminPreview: user?.role === "admin" };
}
