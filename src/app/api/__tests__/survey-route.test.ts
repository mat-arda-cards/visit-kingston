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
