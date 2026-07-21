import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { POST } from "@/app/api/survey/route";
import { readSurveyResponses } from "@/lib/db/append";
import { createTestDb, type TestDb } from "../../../../tests/setup/pglite-db";

let tdb: TestDb;
beforeAll(async () => {
  tdb = await createTestDb();
});
afterAll(async () => {
  await tdb.close();
});

function post(ip: string, body?: string) {
  return POST(
    new NextRequest("http://localhost/api/survey", {
      method: "POST",
      body: body ?? JSON.stringify({ distanceBand: "local" }),
      headers: { "content-type": "application/json", "x-forwarded-for": ip },
    }),
  );
}

/** Same as post(), plus the E13 idempotency header. Separate helper so the
 *  header-less calls above keep proving the backward-compatible path. */
function postWithKey(ip: string, key: string, body?: string) {
  return POST(
    new NextRequest("http://localhost/api/survey", {
      method: "POST",
      body: body ?? JSON.stringify({ distanceBand: "local" }),
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": ip,
        "X-Idempotency-Key": key,
      },
    }),
  );
}

describe("POST /api/survey rate limit", () => {
  it("allows 5 then 429s the 6th from the same IP, but a different IP still passes", async () => {
    const ip = "203.0.113.10";
    for (let i = 0; i < 5; i++) {
      const res = await post(ip);
      expect(res.status).toBe(200);
    }
    const sixth = await post(ip);
    expect(sixth.status).toBe(429);
    expect(sixth.headers.get("Retry-After")).toBeTruthy();

    const otherIp = await post("203.0.113.20");
    expect(otherIp.status).toBe(200);
  });
});

describe("POST /api/survey privacy surface (E11)", () => {
  it("rejects an oversized body before parsing (413) and stores nothing", async () => {
    const countBefore = (await readSurveyResponses()).length;
    const res = await post(
      "203.0.113.30",
      JSON.stringify({ distanceBand: "local", lodgingType: "x".repeat(9_000) }),
    );
    expect(res.status).toBe(413);
    // Count-based proof: a row-shape assertion can be satisfied vacuously
    // (the route truncates lodgingType anyway); an unchanged count cannot.
    expect((await readSurveyResponses()).length).toBe(countBefore);
  });

  it("never persists homeZip/homeState even when a client sends them (dead PII surface closed)", async () => {
    const res = await post(
      "203.0.113.31",
      JSON.stringify({
        distanceBand: "10-50mi",
        overnight: true,
        homeZip: "98346",
        homeState: "WA",
        lodgingNights: 3,
      }),
    );
    expect(res.status).toBe(200);
    const rows = await readSurveyResponses<Record<string, unknown>>();
    const saved = rows.find((r) => r.lodgingNights === 3);
    expect(saved).toBeDefined();
    expect(saved).not.toHaveProperty("homeZip");
    expect(saved).not.toHaveProperty("homeState");
  });
});

// Fresh IPs per case: the rate limiter's hit map is module-level and shared
// across this whole file (5 POSTs / 10 min / IP), and .10/.20/.30/.31 are
// already spent above.
describe("POST /api/survey idempotent intake (E13)", () => {
  it("stores the first submission and answers a replay of the same key without a second row", async () => {
    const key = "e13-survey-replay-0001";
    // partySize is the marker: it makes the row countable without depending on
    // row order or on how many rows earlier cases left behind.
    const body = JSON.stringify({ distanceBand: "out-of-state", overnight: true, partySize: 37 });
    const countOf = async () =>
      (await readSurveyResponses<Record<string, unknown>>()).filter((r) => r.partySize === 37)
        .length;

    const first = await postWithKey("203.0.113.40", key, body);
    expect(first.status).toBe(200);
    const firstJson = await first.json();
    expect(firstJson).toEqual({ ok: true });
    expect(await countOf()).toBe(1);

    // Same key, same body — what flushOutbox does when the 200 never reached
    // the device. Must be success, and must NOT persist again.
    const replay = await postWithKey("203.0.113.40", key, body);
    expect(replay.status).toBe(200);
    expect(await replay.json()).toEqual({ ok: true, duplicate: true });
    // The real proof: an unchanged row count. A shape assertion would pass
    // vacuously against a duplicated row.
    expect(await countOf()).toBe(1);
  });

  it("still accepts a submission with no idempotency header (embed + old cached clients)", async () => {
    const before = (await readSurveyResponses()).length;
    const res = await post("203.0.113.41", JSON.stringify({ distanceBand: "10-50mi" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect((await readSurveyResponses()).length).toBe(before + 1);
  });

  it("rejects a malformed idempotency key with 400 and stores nothing", async () => {
    const before = (await readSurveyResponses()).length;
    // Too short for the /^[A-Za-z0-9-]{8,64}$/ contract.
    const res = await postWithKey("203.0.113.42", "short");
    expect(res.status).toBe(400);
    expect((await readSurveyResponses()).length).toBe(before);
  });
});
