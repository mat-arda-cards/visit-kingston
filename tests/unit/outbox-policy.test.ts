// E13 outbox policy floor. src/lib/outbox.ts exports two pure helpers that
// decide the fate of a write queued while the visitor had no signal, and both
// are load-bearing in ways a reviewer cannot see from the call site:
//
//   • shouldDrop  — the ONLY thing keeping the queue bounded. Loosen it and
//     the outbox holds a visitor's submission (and its metadata) on their
//     device indefinitely; tighten it and a weekend in the SR-104 dead zone
//     silently eats real LTAC survey evidence.
//   • isDeliveredStatus — the poison-pill guard. 400/409/413 must delete so a
//     stuck entry can't block the queue behind it, and 429/5xx must NOT, or a
//     throttled device deletes answers the server never stored.
//
// So both bounds are probed from BOTH sides of every boundary: a later
// "helpful" refactor cannot loosen or invert one without turning this red.
//
// Deliberately no IndexedDB coverage: both vitest configs are
// environment:"node" and fake-indexeddb is not a dependency (nor is it going
// to become one). The storage layer of outbox.ts is exercised by hand on
// device per docs/PWA.md; the policy is exercised here.

import { describe, expect, it } from "vitest";

import { isDeliveredStatus, shouldDrop, type OutboxEntry } from "@/lib/outbox";

const DAY_MS = 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * DAY_MS;

/** A freshly queued survey POST, created at epoch so `nowMs` reads as an age. */
function entry(overrides: Partial<OutboxEntry> = {}): OutboxEntry {
  return {
    id: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
    url: "/api/survey",
    body: '{"distanceBand":"local","overnight":false}',
    contentType: "application/json",
    createdAt: 0,
    attempts: 0,
    ...overrides,
  };
}

describe("shouldDrop — the 7-day age bound", () => {
  it("keeps an entry queued right up to seven days old", () => {
    expect(shouldDrop(entry(), 0)).toBe(false);
    expect(shouldDrop(entry(), SEVEN_DAYS_MS - 1)).toBe(false);
    // Exactly seven days is still a keep — the bound is `>`, not `>=`.
    expect(shouldDrop(entry(), SEVEN_DAYS_MS)).toBe(false);
  });

  it("drops one millisecond past seven days", () => {
    expect(shouldDrop(entry(), SEVEN_DAYS_MS + 1)).toBe(true);
    expect(shouldDrop(entry(), SEVEN_DAYS_MS + DAY_MS)).toBe(true);
  });

  it("measures age from createdAt, not from an absolute clock", () => {
    const queuedAt = 1_800_000_000_000;
    expect(shouldDrop(entry({ createdAt: queuedAt }), queuedAt + SEVEN_DAYS_MS)).toBe(false);
    expect(shouldDrop(entry({ createdAt: queuedAt }), queuedAt + SEVEN_DAYS_MS + 1)).toBe(true);
  });
});

describe("shouldDrop — the 25-attempt bound", () => {
  it("keeps an entry through its twenty-fifth attempt", () => {
    expect(shouldDrop(entry({ attempts: 24 }), 0)).toBe(false);
    // Exactly 25 is still a keep — the bound is "more than 25".
    expect(shouldDrop(entry({ attempts: 25 }), 0)).toBe(false);
  });

  it("drops on the twenty-sixth", () => {
    expect(shouldDrop(entry({ attempts: 26 }), 0)).toBe(true);
    expect(shouldDrop(entry({ attempts: 100 }), 0)).toBe(true);
  });

  it("treats the two bounds as independent — either one alone drops", () => {
    // Young but exhausted:
    expect(shouldDrop(entry({ attempts: 26 }), DAY_MS)).toBe(true);
    // Untried but stale:
    expect(shouldDrop(entry({ attempts: 0 }), SEVEN_DAYS_MS + 1)).toBe(true);
    // Neither:
    expect(shouldDrop(entry({ attempts: 25 }), SEVEN_DAYS_MS)).toBe(false);
  });
});

describe("isDeliveredStatus — statuses that retire an entry", () => {
  it("treats every 2xx as delivered", () => {
    for (const status of [200, 201, 202, 204, 299]) {
      expect(isDeliveredStatus(status)).toBe(true);
    }
  });

  it("treats 409 as delivered — the intake already has this key", () => {
    expect(isDeliveredStatus(409)).toBe(true);
  });

  it("treats 400 and 413 as delivered — permanently unfixable bodies", () => {
    // Retrying either forever would wedge the queue behind one bad entry.
    expect(isDeliveredStatus(400)).toBe(true);
    expect(isDeliveredStatus(413)).toBe(true);
  });

  it("does NOT treat 429 as delivered — throttling is not rejection", () => {
    // /api/survey allows 5 posts per 10 minutes per IP. A device that queued
    // six answers offline would otherwise delete the sixth on the way in.
    expect(isDeliveredStatus(429)).toBe(false);
  });

  it("does NOT treat 5xx as delivered — the write may still land on retry", () => {
    for (const status of [500, 502, 503]) {
      expect(isDeliveredStatus(status)).toBe(false);
    }
  });

  it("pins the 2xx range edges", () => {
    expect(isDeliveredStatus(199)).toBe(false);
    expect(isDeliveredStatus(300)).toBe(false);
  });
});
