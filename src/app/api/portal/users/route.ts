// Admin-only user listing. Password hashes never leave the server.

import { NextResponse } from "next/server";
import { getSessionUser, listUsers } from "@/lib/auth";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "admin only" }, { status: 403 });

  const users = (await listUsers()).map(({ passwordHash: _passwordHash, ...safe }) => safe);
  return NextResponse.json({ users });
}
