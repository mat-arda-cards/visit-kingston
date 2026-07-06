import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/survey/route";

function post(ip: string) {
  return POST(
    new NextRequest("http://localhost/api/survey", {
      method: "POST",
      body: JSON.stringify({ distanceBand: "local" }),
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
