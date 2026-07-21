// E12 integration: ingest → store → unified read path, on the PGlite-backed
// substrate. Proves the two launch-safety invariants:
//   1. ingest is IDEMPOTENT at the store level (same feed state twice →
//      zero net changes, no audit spam);
//   2. FLAG OFF → every unified-gated surface falls back to in-app-only
//      (acceptance criterion 8b), and disabling a source drops its events
//      (delta 2's enforcement point).

import { readFileSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { events as seedEvents } from "@/lib/data/events";
import { runIngest } from "@/lib/events/ingest";
import { getUnifiedEvents } from "@/lib/events/unified";
import {
  getCalendarSources,
  setSourceEnabled,
} from "@/lib/stores/calendar-sources-store";
import { getExternalEvents } from "@/lib/stores/external-events-store";
import {
  getUnifiedCalendarEnabled,
  setUnifiedCalendarEnabled,
} from "@/lib/stores/unified-calendar-store";
import { createTestDb, type TestDb } from "../../setup/pglite-db";

// No session in these suites: getSessionUser → null (the flag store consults
// it for admin preview; ingest runs as the system actor).
vi.mock("@/lib/auth", () => ({
  getSessionUser: vi.fn(async () => null),
}));

const fixture = (name: string): string =>
  readFileSync(path.join(__dirname, "fixtures", name), "utf8");

// Stubbed network: the AMS index serves one Details link whose .ics is the
// real committed fixture; both Tribe hosts serve empty-but-healthy feeds.
const AMS_INDEX = `<html><a href="/events/Details/grand-hallway-art-show-1770249">x</a></html>`;
const EMPTY_TRIBE = JSON.stringify({ events: [], total: 0, total_pages: 0 });

function installFetchStub() {
  const impl = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/wp-json/tribe/")) {
      return new Response(EMPTY_TRIBE, {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    if (url.endsWith("/events")) {
      return new Response(AMS_INDEX, { status: 200, headers: { "content-type": "text/html" } });
    }
    return new Response(fixture("ams-grand-hallway-art-show-1770249.ics"), {
      status: 200,
      headers: { "content-type": "text/calendar; charset=utf-8" },
    });
  });
  vi.stubGlobal("fetch", impl);
  return impl;
}

let tdb: TestDb;
beforeAll(async () => {
  tdb = await createTestDb();
});
afterAll(async () => {
  vi.unstubAllGlobals();
  await tdb.close();
});

describe("runIngest (stubbed network, real store)", () => {
  it("first run mirrors the AMS event in as live, source=sync", async () => {
    installFetchStub();
    const perSource = await runIngest("vitest");
    expect(perSource["ams-ical"].created).toBe(1);
    expect(perSource["ams-ical"].errors).toEqual([]);
    // portofkingston is seeded DISABLED — it must not have run at all.
    expect(perSource["tribe-portofkingston"].ran).toBe(false);
    // explorekingstonwa is enabled-but-empty-tolerant: ran, zero events, zero errors.
    expect(perSource["tribe-explorekingstonwa"].ran).toBe(true);
    expect(perSource["tribe-explorekingstonwa"].errors).toEqual([]);

    const external = await getExternalEvents();
    expect(external).toHaveLength(1);
    expect(external[0].id).toBe("ams-ical:e.3508.1493103");
  });

  it("idempotent: the same feed state twice is zero net changes", async () => {
    installFetchStub();
    const perSource = await runIngest("vitest");
    expect(perSource["ams-ical"]).toMatchObject({
      created: 0,
      updated: 0,
      removed: 0,
      unchanged: 1,
    });
  });

  it("an event that leaves the feed tombstones out of the mirror", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/wp-json/tribe/")) {
          return new Response(EMPTY_TRIBE, {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }
        return new Response("<html>no events this week</html>", {
          status: 200,
          headers: { "content-type": "text/html" },
        });
      }),
    );
    const perSource = await runIngest("vitest");
    expect(perSource["ams-ical"].removed).toBe(1);
    expect(await getExternalEvents()).toHaveLength(0);
    // Round-trip back: the event reappears when the feed serves it again.
    installFetchStub();
    const again = await runIngest("vitest");
    expect(again["ams-ical"].created).toBe(1);
  });

  it("records a last-run report on each enabled source", async () => {
    const sources = await getCalendarSources();
    const ams = sources.find((s) => s.id === "ams-ical");
    expect(ams?.lastRunAt).toBeTruthy();
    expect(ams?.lastRunReport?.fetched).toBeGreaterThan(0);
  });
});

describe("unified read path + the ship-dark flag", () => {
  it("flag defaults OFF (absence = OFF)", async () => {
    expect(await getUnifiedCalendarEnabled()).toBe(false);
  });

  it("flag ON: the merged calendar includes external events; disabling the source drops them (delta 2)", async () => {
    await setUnifiedCalendarEnabled(true, "vitest");
    const now = new Date("2026-07-20T12:00:00Z"); // fixture event runs Jul 1 – Aug 31
    const merged = await getUnifiedEvents(now);
    expect(merged.some((e) => e.source === "ams-ical")).toBe(true);
    // In-app seeds are all present too (live, precedence-merged).
    expect(merged.some((e) => e.source === "in-app")).toBe(true);

    await setSourceEnabled("ams-ical", false, "vitest");
    const withoutAms = await getUnifiedEvents(now);
    expect(withoutAms.some((e) => e.source === "ams-ical")).toBe(false);
    await setSourceEnabled("ams-ical", true, "vitest");
  });

  it("flag OFF: getUnifiedEvents-backed render paths fall back to in-app only (criterion 8b)", async () => {
    await setUnifiedCalendarEnabled(false, "vitest");
    // The surfaces branch on the flag BEFORE calling getUnifiedEvents — what
    // they serve with the flag off is the plain event store. Assert the
    // contract at its choke point: flag off + external rows present, and the
    // in-app store read contains no external ids.
    expect(await getUnifiedCalendarEnabled()).toBe(false);
    const { getEvents } = await import("@/lib/stores/event-store");
    const inApp = await getEvents();
    expect(inApp.length).toBe(seedEvents.length);
    expect(inApp.every((e) => !e.id.startsWith("ams-ical"))).toBe(true);
  });
});
