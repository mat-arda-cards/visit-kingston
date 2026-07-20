// E08 report-inaccurate intake: anonymous, allowlisted stores only, size
// caps, dual-bucket rate limits, and merge-on-duplicate (one open worklist
// item per disputed record no matter how many visitors report it).

import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { restaurants as restaurantSeed } from "@/lib/data/restaurants";
import { listWorklistItems } from "@/lib/stores/worklist-store";
import { createTestDb, type TestDb } from "../../../../tests/setup/pglite-db";
import { POST } from "@/app/api/report/route";

const seedId = restaurantSeed[0].id;

function post(body: Record<string, unknown>, ip = "203.0.113.7") {
  return POST(
    new NextRequest("http://localhost/api/report", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json", "x-forwarded-for": ip },
    }),
  );
}

let tdb: TestDb;
beforeAll(async () => {
  tdb = await createTestDb();
});
afterAll(async () => {
  await tdb.close();
});

describe("POST /api/report", () => {
  it("accepts a minimal anonymous report and opens one item", async () => {
    const res = await post({ store: "restaurants", id: seedId, message: "hours wrong" });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true });

    const items = await listWorklistItems({ type: "report_inaccurate", state: "open" });
    expect(items).toHaveLength(1);
    expect(items[0].subjectId).toBe(seedId);
    expect(items[0].payload.count).toBe(1);
    expect(items[0].createdBy).toBeNull();
  });

  it("a second report on the same record merges: still one open item, count 2, contact kept", async () => {
    const res = await post(
      { store: "restaurants", id: seedId, message: "phone disconnected", contact: "me@x.test" },
      "203.0.113.8",
    );
    expect(res.status).toBe(200);

    const items = await listWorklistItems({ type: "report_inaccurate", state: "open" });
    expect(items).toHaveLength(1);
    expect(items[0].payload.count).toBe(2);
    const messages = items[0].payload.messages as { message: string; contact?: string }[];
    expect(messages).toHaveLength(2);
    expect(messages[1].contact).toBe("me@x.test");
  });

  it("rejects oversized fields, unknown stores, and unknown records", async () => {
    expect(
      (
        await post(
          { store: "restaurants", id: seedId, message: "a".repeat(2001) },
          "203.0.113.9",
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await post(
          { store: "restaurants", id: seedId, message: "ok", contact: "c".repeat(201) },
          "203.0.113.10",
        )
      ).status,
    ).toBe(400);
    expect(
      (await post({ store: "auth-users", id: "u1", message: "nope" }, "203.0.113.11")).status,
    ).toBe(400);
    expect(
      (await post({ store: "site-copy", id: "home.hero", message: "nope" }, "203.0.113.11"))
        .status,
    ).toBe(400);
    expect(
      (await post({ store: "restaurants", id: "no-such-place", message: "hm" }, "203.0.113.12"))
        .status,
    ).toBe(404);
    expect((await post({ store: "restaurants", id: seedId, message: "" }, "203.0.113.13")).status).toBe(
      400,
    );
  });

  it("the IP bucket trips: 5 requests pass the gate, the 6th from the same IP is 429", async () => {
    const ip = "198.51.100.42";
    for (let i = 0; i < 5; i += 1) {
      const res = await post(
        { store: "restaurants", id: seedId, message: `report ${i}` },
        ip,
      );
      expect(res.status).toBe(200);
    }
    const sixth = await post({ store: "restaurants", id: seedId, message: "one more" }, ip);
    expect(sixth.status).toBe(429);
    expect(sixth.headers.get("Retry-After")).toBeTruthy();
  });

  it("the per-record bucket trips across many IPs (10/hour per record)", async () => {
    // The merge tests above already consumed some of seedId's budget — use a
    // second seed record for a clean count.
    const target = restaurantSeed[1]?.id;
    if (!target) return; // seed set too small — the IP-bucket test covers the pattern
    let last = 0;
    for (let i = 0; i < 11; i += 1) {
      const res = await post(
        { store: "restaurants", id: target, message: `crowd report ${i}` },
        `192.0.2.${i + 1}`,
      );
      last = res.status;
    }
    expect(last).toBe(429);
  });
});
