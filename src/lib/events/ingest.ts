// Ingest orchestration (E12): run every ENABLED source's adapter
// sequentially, mirror the results into the external-events store, and stamp
// each source's last-run report. This is the one function both callers share
// — the token-gated cron route (POST /api/events/ingest) and the admin
// page's "Sync now" server action.
//
// Ingest runs regardless of the unified-calendar flag: data flows dark; only
// render paths are flag-gated. Per-source failures never abort the run —
// each lands in that source's report (delta 2 fail-soft), and the next
// source still syncs.

import "server-only";

import { fetchAmsIcalEvents } from "./ams-ical-adapter";
import { fetchTribeEvents } from "./tribe-adapter";
import type { IngestReport, NormalizedEvent } from "./types";
import {
  getCalendarSources,
  recordSourceRun,
  type IngestSourceId,
} from "@/lib/stores/calendar-sources-store";
import { syncExternalEvents } from "@/lib/stores/external-events-store";

/** Base URLs derive from the compile-time allowlist — never from config. */
const BASE_URLS: Record<IngestSourceId, string> = {
  "ams-ical": "https://business.kingstonchamber.com",
  "tribe-explorekingstonwa": "https://explorekingstonwa.com",
  "tribe-portofkingston": "https://portofkingston.org",
};

export interface SourceRunResult extends IngestReport {
  enabled: boolean;
  ran: boolean;
  created?: number;
  updated?: number;
  removed?: number;
  unchanged?: number;
}

export type IngestRunResult = Record<string, SourceRunResult>;

export async function runIngest(actor: string): Promise<IngestRunResult> {
  const sources = await getCalendarSources();
  const perSource: IngestRunResult = {};

  for (const source of sources) {
    if (!source.enabled) {
      perSource[source.id] = {
        enabled: false,
        ran: false,
        fetched: 0,
        parsed: 0,
        skipped: 0,
        errors: [],
      };
      continue;
    }

    let events: NormalizedEvent[] = [];
    let report: IngestReport = { fetched: 0, parsed: 0, skipped: 0, errors: [] };
    try {
      if (source.id === "ams-ical") {
        const feedUrl = source.feedUrl || process.env.AMS_CALENDAR_FEED_URL || undefined;
        ({ events, report } = await fetchAmsIcalEvents({
          baseUrl: BASE_URLS[source.id],
          feedUrl,
        }));
      } else {
        ({ events, report } = await fetchTribeEvents({
          baseUrl: BASE_URLS[source.id],
          source: source.id,
        }));
      }
    } catch (err) {
      // Config-level failures (e.g. an off-allowlist feedUrl) — recorded,
      // never fatal to the other sources.
      report.errors.push(String((err as Error)?.message ?? err));
    }

    let counts: { created: number; updated: number; removed: number; unchanged: number } = {
      created: 0,
      updated: 0,
      removed: 0,
      unchanged: 0,
    };
    // Only sync when the fetch produced a usable read of the feed: a run
    // that died at the index/first page must not tombstone the whole mirror.
    const fetchDied = events.length === 0 && report.errors.length > 0 && report.parsed === 0;
    if (!fetchDied) {
      counts = await syncExternalEvents(source.id, events, { actor, source: "sync" });
    }

    const result: SourceRunResult = { enabled: true, ran: !fetchDied, ...report, ...counts };
    perSource[source.id] = result;
    await recordSourceRun(source.id, { ...report, ...counts }, { actor, source: "sync" });
  }

  return perSource;
}
