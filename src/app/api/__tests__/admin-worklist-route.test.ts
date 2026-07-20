// E08 admin worklist dispatcher: list filters + subject snapshots, the
// approve path, and the epic's re-validation constraint — a proposal that no
// longer passes the store write-gate at approval time is auto-REJECTED with
// the validation message in the resolution note, never force-written.

import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { restaurants as restaurantSeed } from "@/lib/data/restaurants";
import { getRestaurant } from "@/lib/stores/business-store";
import {
  createWorklistItem,
  getWorklistItem,
  listWorklistItems,
} from "@/lib/stores/worklist-store";
import { createTestDb, type TestDb } from "../../../../tests/setup/pglite-db";

const authState = vi.hoisted(() => ({
  user: null as null | { id: string; role: string; email: string },
}));

vi.mock("@/lib/auth", () => ({
  getSessionUser: vi.fn(async () => authState.user),
  requireAdmin: vi.fn(async () =>
    authState.user?.role === "admin"
      ? null
      : Response.json({ error: "Sign in first" }, { status: 401 }),
  ),
}));

import { GET, POST } from "@/app/api/admin/worklist/route";

const seedRestaurant = restaurantSeed[0];

function get(query = "") {
  return GET(new NextRequest(`http://localhost/api/admin/worklist${query}`));
}
function post(body: Record<string, unknown>) {
  return POST(
    new NextRequest("http://localhost/api/admin/worklist", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    }),
  );
}

let tdb: TestDb;
beforeAll(async () => {
  tdb = await createTestDb();
  authState.user = { id: "admin-1", role: "admin", email: "admin@example.test" };
});
afterAll(async () => {
  await tdb.close();
});

describe("/api/admin/worklist", () => {
  it("GET lists items with subject snapshots and zero-filled counts", async () => {
    await createWorklistItem(
      {
        type: "moderation",
        subjectStore: "restaurants",
        subjectId: seedRestaurant.id,
        subjectLabel: seedRestaurant.name,
        payload: {
          kind: "edit",
          proposed: { ...seedRestaurant, description: "Fresh words" },
        },
      },
      { actor: "member@example.test", source: "portal" },
    );

    const res = await get("?type=moderation&state=active");
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.items).toHaveLength(1);
    // The subject snapshot lets the UI diff without a second round trip;
    // seed-backed records read as live.
    expect(data.items[0].subject).toMatchObject({ id: seedRestaurant.id, status: "live" });
    expect(data.counts.moderation.open).toBe(1);
    expect(data.counts.privacy_request.open).toBe(0);

    expect((await get("?type=nonsense")).status).toBe(400);
  });

  it("POST approve publishes the proposal and resolves the item", async () => {
    const [item] = await listWorklistItems({ type: "moderation", state: "open" });
    const res = await post({ action: "approve", id: item.id });
    expect(res.status).toBe(200);
    expect((await getRestaurant(seedRestaurant.id))?.description).toBe("Fresh words");
    expect((await getWorklistItem(item.id))?.resolution).toBe("approved");
  });

  it("POST approve of a proposal that fails the write-gate auto-rejects with the message in the note", async () => {
    // A proposal that predates a schema tightening: missing the store's
    // required `name`. The payload schema allows it (id only) — the store
    // write-gate is what must catch it at approval time.
    const { item } = await createWorklistItem(
      {
        type: "moderation",
        subjectStore: "restaurants",
        subjectId: seedRestaurant.id,
        subjectLabel: seedRestaurant.name,
        payload: { kind: "edit", proposed: { id: seedRestaurant.id, name: "" } },
      },
      { actor: "member@example.test", source: "portal" },
    );

    const res = await post({ action: "approve", id: item.id });
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ rejected: true });

    const after = await getWorklistItem(item.id);
    expect(after?.state).toBe("resolved");
    expect(after?.resolution).toBe("rejected");
    expect(after?.resolutionNote).toContain("Failed re-validation");
    // Never force-written: the live record kept the approved description.
    expect((await getRestaurant(seedRestaurant.id))?.description).toBe("Fresh words");
  });

  it("POST reject requires a note; verify wires the staleness stamp", async () => {
    const { item } = await createWorklistItem(
      {
        type: "moderation",
        subjectStore: "restaurants",
        subjectId: "another-subject",
        subjectLabel: "Another",
        payload: { kind: "new" },
      },
      { actor: "member@example.test", source: "portal" },
    );
    expect((await post({ action: "reject", id: item.id })).status).toBe(400);
    expect((await post({ action: "reject", id: item.id, note: "why" })).status).toBe(200);

    const stale = await createWorklistItem(
      {
        type: "staleness",
        subjectStore: "restaurants",
        subjectId: seedRestaurant.id,
        subjectLabel: seedRestaurant.name,
        payload: { lastVerifiedAt: null, intervalDays: 90 },
      },
      { actor: "system", source: "system" },
    );
    expect((await post({ action: "verify", id: stale.item.id })).status).toBe(200);
    expect((await getWorklistItem(stale.item.id))?.resolution).toBe("verified");
  });

  it("unknown actions and missing items fail cleanly", async () => {
    expect((await post({ action: "explode", id: "x" })).status).toBe(404);
    expect(
      (
        await post({
          action: "explode",
          id: "00000000-0000-0000-0000-000000000000",
        })
      ).status,
    ).toBe(404);
  });
});
