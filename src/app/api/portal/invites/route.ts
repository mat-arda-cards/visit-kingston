// Admin-only invite management.
// GET  → all invite codes (pending + redeemed).
// POST → mint a new code for a role, optionally linked to listings/orgs.
//
// Both verbs re-check the session server-side: 401 with no session, 403 for
// any non-admin. linkedIds are validated against the real stores so a typo'd
// or malicious id can never grant edit rights to a listing that exists later.

import { NextRequest, NextResponse } from "next/server";
import { createInvite, getSessionUser, listInvites, type Role } from "@/lib/auth";
import { getRestaurants } from "@/lib/stores/business-store";
import { getCharities } from "@/lib/stores/charity-store";

const ROLES: readonly Role[] = ["business", "nonprofit", "admin"];

/** Null when the caller is an admin; otherwise the error response to return. */
async function requireAdmin(): Promise<NextResponse | null> {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "admin only" }, { status: 403 });
  return null;
}

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  return NextResponse.json({ invites: await listInvites() });
}

export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  let body: { role?: unknown; linkedIds?: unknown; note?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  const role = body.role as Role;
  if (!ROLES.includes(role)) {
    return NextResponse.json(
      { error: "role must be business, nonprofit, or admin" },
      { status: 400 },
    );
  }

  // Admin invites never carry linked ids — admins can edit everything anyway.
  const linkedIds =
    role === "admin"
      ? []
      : Array.isArray(body.linkedIds)
        ? [...new Set(body.linkedIds.filter((x): x is string => typeof x === "string"))]
        : [];

  if (linkedIds.length > 0) {
    const records = role === "business" ? await getRestaurants() : await getCharities();
    const valid = new Set(records.map((r) => r.id));
    const unknown = linkedIds.filter((id) => !valid.has(id));
    if (unknown.length > 0) {
      return NextResponse.json(
        {
          error: `unknown ${role === "business" ? "restaurant" : "charity"} id(s): ${unknown.join(", ")}`,
        },
        { status: 400 },
      );
    }
  }

  const note =
    typeof body.note === "string" && body.note.trim() !== ""
      ? body.note.trim().slice(0, 200)
      : undefined;

  const invite = await createInvite({ role, linkedIds, note });
  return NextResponse.json({ ok: true, invite });
}
