#!/usr/bin/env node
// events-source-probe.mjs — re-probes the three external event sources behind
// docs/adr/ADR-0005-events-canonical-source.md (E12) so source drift is a
// re-runnable check, not a memory. Zero dependencies: global fetch (Node >= 20).
// GET-only by construction — the single `get` helper below hardcodes the
// method; there is no other request path in this file.
//
// Sources probed (the compile-time SOURCE_ALLOWLIST in src/lib/events/types.ts
// mirrors this set):
//   1. explorekingstonwa.com     — Chamber WordPress, Tribe REST (empty so far)
//   2. portofkingston.org        — Port of Kingston, Tribe REST (live events)
//   3. business.kingstonchamber.com — GrowthZone tenant 3508 (legacy
//      ChamberMaster naming), per-event iCal files; TRANSITIONAL — the feed
//      ends at the GrowthZone cancellation (~April 2027, ADR-0002/roll-off §4).
//
// Verified traps this script encodes (ADR-0001, probes of 2026-07-04/05):
//   - /events/ical (no slug) is a SOFT-404: HTTP 200 + text/html + "Event is
//     not found." — every probe checks status AND content-type AND body prefix.
//   - Never grep the events index for "ical" — titles containing "classical"
//     false-positive. Derive .ics URLs from the /events/Details/{slug} links.
//
// Usage: npm run events:probe            (add --json to dump the snapshot)
//        --save-fixtures <dir>           also write raw bodies for test fixtures
// Writes: docs/adr/events-source-probe.json
// Exit 0 iff all REQUIRED checks pass. explorekingstonwa returning total:0 is
// the EXPECTED, documented state (enabled-but-empty-tolerant source config) —
// its REQUIRED check is endpoint health, never the event count.

import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import process from "node:process";

const USER_AGENT =
  "visit-kingston-events-ingest/1.0 (Greater Kingston Chamber tourism app)";
const REQUEST_DELAY_MS = 500;
const REQUEST_TIMEOUT_MS = 15_000;

const OUT_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "docs",
  "adr",
  "events-source-probe.json",
);

const fixturesDirArg = (() => {
  const i = process.argv.indexOf("--save-fixtures");
  return i !== -1 ? process.argv[i + 1] : null;
})();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let firstRequest = true;
// The one and only HTTP helper. Read-only against the outside world: the
// method is the hardcoded literal below, requests run sequentially with a
// polite delay, and callers get a uniform shape even on network failure.
async function get(url) {
  if (!firstRequest) await sleep(REQUEST_DELAY_MS);
  firstRequest = false;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      redirect: "follow",
    });
    const body = await res.text();
    return {
      status: res.status,
      contentType: res.headers.get("content-type") ?? "",
      body,
    };
  } catch (err) {
    return { status: 0, contentType: "", body: "", error: String(err?.message ?? err) };
  }
}

// Strip a UTF-8 BOM so "starts with" checks test the real first characters.
const bodyPrefix = (body) => body.replace(/^﻿/, "");

async function saveFixture(name, body) {
  if (!fixturesDirArg) return;
  await mkdir(fixturesDirArg, { recursive: true });
  await writeFile(path.join(fixturesDirArg, name), body);
  console.log(`  fixture saved: ${path.join(fixturesDirArg, name)}`);
}

// Levels: REQUIRED entries gate the exit code; PROBE entries are per-item
// results feeding a REQUIRED aggregate; INFO entries are record-only.
const results = [];
function record(level, name, ok, detail) {
  results.push({ level, name, ok, detail });
  const tag = level === "INFO" ? "INFO " : ok ? "PASS " : "fail ";
  console.log(`[${tag}] ${level.padEnd(8)} ${name} — ${detail}`);
}

// ---------------------------------------------------------------------------
// Tribe REST probes. Same endpoint shape on both hosts; explorekingstonwa is
// healthy-but-empty (total: 0 on 2026-07-04 and 2026-07-05 — the ADR-0005
// evidence trail), portofkingston serves real events and is the live fixture
// source. REQUIRED = endpoint health (200 + JSON + a numeric `total`), never
// the count.
// ---------------------------------------------------------------------------
async function probeTribe(host) {
  const url = `https://${host}/wp-json/tribe/events/v1/events?per_page=5`;
  const res = await get(url);
  let parsed = null;
  let parseError = null;
  if (res.status === 200) {
    try {
      parsed = JSON.parse(bodyPrefix(res.body));
    } catch (err) {
      parseError = String(err?.message ?? err);
    }
  }
  const total = typeof parsed?.total === "number" ? parsed.total : null;
  const events = Array.isArray(parsed?.events) ? parsed.events : [];
  const firstGlobalId = events[0]?.global_id ?? null;
  const ok =
    res.status === 200 &&
    /json/i.test(res.contentType) &&
    parsed !== null &&
    total !== null;
  record(
    "REQUIRED",
    `Tribe REST ${host}`,
    ok,
    res.error
      ? `request failed: ${res.error}`
      : parseError
        ? `HTTP ${res.status} but body is not JSON: ${parseError}`
        : `HTTP ${res.status}, ${res.contentType}; total=${total ?? "?"}` +
          (firstGlobalId ? `; first global_id=${firstGlobalId}` : "; no events (empty feed)"),
  );
  if (ok && events.length > 0) {
    await saveFixture(`tribe-${host.replace(/\W/g, "-")}-page1.json`, res.body);
  }
  return {
    source: host,
    kind: "tribe-rest",
    url,
    status: res.status,
    contentType: res.contentType,
    total,
    eventCount: events.length,
    firstGlobalId,
    pass: ok,
    ...(res.error ? { error: res.error } : {}),
    ...(parseError ? { parseError } : {}),
  };
}

const explorekingstonwa = await probeTribe("explorekingstonwa.com");
const portofkingston = await probeTribe("portofkingston.org");

// ---------------------------------------------------------------------------
// GrowthZone (legacy ChamberMaster naming) per-event iCal. Index → Details
// slugs → derived .ics URLs, truth triple on every fetch.
// ---------------------------------------------------------------------------
const AMS_HOST = "business.kingstonchamber.com";
const AMS_BASE = `https://${AMS_HOST}`;
let amsResult;
{
  const indexUrl = `${AMS_BASE}/events`;
  const res = await get(indexUrl);
  const found = new Set();
  for (const m of res.body.matchAll(/events\/Details\/([A-Za-z0-9-]+-\d+)/g)) {
    found.add(m[1]);
    if (found.size >= 3) break;
  }
  const slugs = [...found];
  const indexOk = res.status === 200 && slugs.length >= 1;
  record(
    "REQUIRED",
    `events index ${AMS_HOST}`,
    indexOk,
    res.error
      ? `request failed: ${res.error}`
      : `HTTP ${res.status}; ${slugs.length} Details slug(s): ${slugs.join(", ") || "none"}`,
  );

  const perEventIcs = [];
  let savedIcsFixture = false;
  for (const slug of slugs) {
    const url = `${AMS_BASE}/events/ICal/${slug}.ics`;
    const icsRes = await get(url);
    const body = bodyPrefix(icsRes.body);
    const pass =
      icsRes.status === 200 &&
      icsRes.contentType.startsWith("text/calendar") &&
      body.startsWith("BEGIN:VCALENDAR") &&
      body.includes("BEGIN:VEVENT");
    const publishedTtl = body.match(/^X-PUBLISHED-TTL:(.*)$/m)?.[1]?.trim() ?? null;
    const prodId = body.match(/^PRODID:(.*)$/m)?.[1]?.trim() ?? null;
    perEventIcs.push({
      url,
      status: icsRes.status,
      contentType: icsRes.contentType,
      pass,
      prodId,
      publishedTtl,
      hasLosAngelesTzid: body.includes("TZID:America/Los_Angeles"),
      ...(icsRes.error ? { error: icsRes.error } : {}),
    });
    record(
      "PROBE",
      `per-event iCal ${slug}`,
      pass,
      icsRes.error
        ? `request failed: ${icsRes.error}`
        : `HTTP ${icsRes.status}, ${icsRes.contentType || "(no content-type)"}; PRODID=${prodId ?? "(none)"}; TTL=${publishedTtl ?? "(none)"}`,
    );
    if (pass && !savedIcsFixture) {
      savedIcsFixture = true;
      await saveFixture(`ams-${slug}.ics`, icsRes.body);
    }
  }
  const anyIcs = perEventIcs.some((p) => p.pass);
  record(
    "REQUIRED",
    "per-event iCal (>= 1 of probed events)",
    anyIcs,
    `${perEventIcs.filter((p) => p.pass).length}/${perEventIcs.length} probed feeds valid`,
  );

  // The verified soft-404: HTTP 200 + text/html + "Event is not found." A
  // status-only check would call this a calendar feed; the truth triple is why
  // it isn't. Recorded as INFO — its existence is expected, not a failure.
  const softUrl = `${AMS_BASE}/events/ical`;
  const softRes = await get(softUrl);
  const isSoft404 =
    softRes.status === 200 &&
    softRes.contentType.startsWith("text/html") &&
    softRes.body.includes("Event is not found");
  const becameRealFeed =
    softRes.contentType.startsWith("text/calendar") &&
    bodyPrefix(softRes.body).startsWith("BEGIN:VCALENDAR");
  record(
    "INFO",
    "soft-404 check /events/ical",
    true,
    softRes.error
      ? `request failed: ${softRes.error}`
      : isSoft404
        ? "soft-404 as documented (200 + HTML 'Event is not found.')"
        : becameRealFeed
          ? "now a REAL calendar feed — update the source config and ADR-0005"
          : `changed: HTTP ${softRes.status}, ${softRes.contentType || "(no content-type)"}`,
  );

  // Delta 2 (RE-CHARTER): Chamber staff can mint a whole-calendar feed URL from
  // the GrowthZone back office (docs/OPERATIONS.md §9 item 6b). It is
  // configuration, never hardcoded — when present in the env, probe it too.
  let wholeCalendarFeed = null;
  const feedUrl = process.env.AMS_CALENDAR_FEED_URL;
  if (feedUrl) {
    const feedRes = await get(feedUrl);
    const body = bodyPrefix(feedRes.body);
    const pass =
      feedRes.status === 200 &&
      feedRes.contentType.startsWith("text/calendar") &&
      body.startsWith("BEGIN:VCALENDAR");
    wholeCalendarFeed = {
      url: feedUrl,
      status: feedRes.status,
      contentType: feedRes.contentType,
      pass,
      ...(feedRes.error ? { error: feedRes.error } : {}),
    };
    record(
      "INFO",
      "whole-calendar feed (AMS_CALENDAR_FEED_URL)",
      true,
      feedRes.error
        ? `request failed: ${feedRes.error}`
        : `HTTP ${feedRes.status}, ${feedRes.contentType} — ${pass ? "valid VCALENDAR" : "NOT a calendar feed"}`,
    );
  } else {
    record(
      "INFO",
      "whole-calendar feed (AMS_CALENDAR_FEED_URL)",
      true,
      "not configured — staff-generated URL not yet delivered (docs/OPERATIONS.md §9 item 6b); per-event iCal remains the path",
    );
  }

  amsResult = {
    source: AMS_HOST,
    kind: "growthzone-ical",
    url: indexUrl,
    status: res.status,
    contentType: res.contentType,
    detailsSlugsFound: slugs,
    perEventIcs,
    softNotFound: {
      url: softUrl,
      status: softRes.status,
      contentType: softRes.contentType,
      isSoft404,
    },
    wholeCalendarFeed,
    pass: indexOk && anyIcs,
    ...(res.error ? { error: res.error } : {}),
  };
}

// ---------------------------------------------------------------------------
// Snapshot + verdict.
// ---------------------------------------------------------------------------
const requiredChecksPass = results
  .filter((r) => r.level === "REQUIRED")
  .every((r) => r.ok);

const snapshot = {
  generatedAt: new Date().toISOString(),
  sources: {
    "explorekingstonwa.com": explorekingstonwa,
    "portofkingston.org": portofkingston,
    "business.kingstonchamber.com": amsResult,
  },
  requiredChecksPass,
};

await mkdir(path.dirname(OUT_PATH), { recursive: true });
await writeFile(OUT_PATH, JSON.stringify(snapshot, null, 2) + "\n");
console.log(`\nSnapshot written: ${path.relative(process.cwd(), OUT_PATH)}`);

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(snapshot, null, 2));
}

console.log(`\nREQUIRED CHECKS: ${requiredChecksPass ? "PASS" : "FAIL"}`);
process.exitCode = requiredChecksPass ? 0 : 1;
