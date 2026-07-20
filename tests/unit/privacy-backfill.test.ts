// E11: the one-time privacy backfill (scripts/privacy-backfill.ts) — the
// data-layer half, proven against PGlite. Seeds legacy-shaped rows exactly
// as v1 wrote them (rounded lat/lng on geo-pings, stored food-bank outbound
// taps, homeZip/homeState survey fields) and asserts the counts, the
// targeted deletes, the in-place key strips, and — as important — that
// non-target rows survive untouched.

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  appendAnalyticsEvent,
  appendSurveyResponse,
  readAnalyticsEvents,
  readSurveyResponses,
} from "@/lib/db/append";
import {
  countBackfillTargets,
  deleteSensitiveOutboundEvents,
  stripLatLngKeys,
  stripSurveyPiiFields,
} from "@/lib/db/privacy-backfill";
import { isSensitiveOutbound } from "@/lib/privacy/policy";
import { createTestDb, type TestDb } from "../setup/pglite-db";

let tdb: TestDb;

beforeAll(async () => {
  tdb = await createTestDb();

  // Legacy v1 rows, verbatim shapes:
  await appendAnalyticsEvent({
    ts: "2026-01-01T10:00:00.000Z",
    type: "geo-ping",
    path: "/",
    sessionId: "legacy-geo",
    geo: { source: "unknown" },
    lat: 47.796,
    lng: -122.496,
    area: "ferry-terminal",
  });
  await appendAnalyticsEvent({
    ts: "2026-01-02T10:00:00.000Z",
    type: "outbound",
    path: "/give",
    sessionId: "legacy-foodbank",
    geo: { source: "unknown" },
    href: "https://sharenetfoodbank.org",
    label: "ShareNet Food Bank",
  });
  await appendAnalyticsEvent({
    ts: "2026-01-03T10:00:00.000Z",
    type: "outbound",
    path: "/eat",
    sessionId: "legacy-restaurant",
    geo: { source: "unknown" },
    href: "https://example-restaurant.com/menu",
    label: "Menu",
  });
  await appendAnalyticsEvent({
    ts: "2026-01-04T10:00:00.000Z",
    type: "pageview",
    path: "/ferry",
    sessionId: "legacy-pageview",
    geo: { source: "unknown" },
  });
  await appendSurveyResponse({
    submittedAt: "2026-01-05T10:00:00.000Z",
    distanceBand: "10-50mi",
    overnight: true,
    homeZip: "98346",
    homeState: "WA",
    lodgingNights: 2,
  });
  await appendSurveyResponse({
    submittedAt: "2026-01-06T10:00:00.000Z",
    distanceBand: "local",
    overnight: false,
  });
});

afterAll(async () => {
  await tdb.close();
});

describe("privacy-backfill data layer", () => {
  it("dry-run counts every target class and changes nothing", async () => {
    const counts = await countBackfillTargets(isSensitiveOutbound);
    expect(counts).toEqual({
      latLngEvents: 1,
      sensitiveOutboundEvents: 1,
      surveyPiiRows: 1,
    });
    // Nothing changed by counting:
    expect(await readAnalyticsEvents()).toHaveLength(4);
    expect(await readSurveyResponses()).toHaveLength(2);
  });

  it("apply: deletes the food-bank tap, strips coords and survey PII, spares the rest", async () => {
    // Delete-before-update ordering is part of the contract (ctids shift).
    expect(await deleteSensitiveOutboundEvents(isSensitiveOutbound)).toBe(1);
    expect(await stripLatLngKeys()).toBe(1);
    expect(await stripSurveyPiiFields()).toBe(1);

    const events = await readAnalyticsEvents<Record<string, unknown>>();
    expect(events).toHaveLength(3);
    // The food-bank tap is gone entirely — not redacted, GONE:
    expect(events.some((e) => e.sessionId === "legacy-foodbank")).toBe(false);
    // The geo-ping survives with its area bucket but no coordinates:
    const geo = events.find((e) => e.sessionId === "legacy-geo");
    expect(geo).toBeDefined();
    expect(geo).not.toHaveProperty("lat");
    expect(geo).not.toHaveProperty("lng");
    expect(geo?.area).toBe("ferry-terminal");
    // The innocent outbound tap and pageview are untouched:
    const restaurant = events.find((e) => e.sessionId === "legacy-restaurant");
    expect(restaurant?.href).toBe("https://example-restaurant.com/menu");
    expect(events.some((e) => e.sessionId === "legacy-pageview")).toBe(true);

    const surveys = await readSurveyResponses<Record<string, unknown>>();
    expect(surveys).toHaveLength(2);
    for (const s of surveys) {
      expect(s).not.toHaveProperty("homeZip");
      expect(s).not.toHaveProperty("homeState");
    }
    // Non-PII survey fields survive the strip:
    const overnight = surveys.find((s) => s.overnight === true);
    expect(overnight?.lodgingNights).toBe(2);

    // Re-count: all three target classes now report zero (the --apply
    // verification step the CLI runs).
    expect(await countBackfillTargets(isSensitiveOutbound)).toEqual({
      latLngEvents: 0,
      sensitiveOutboundEvents: 0,
      surveyPiiRows: 0,
    });
  });
});
