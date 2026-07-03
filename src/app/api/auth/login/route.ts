import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail, makeSessionToken, sessionCookie, verifyPassword } from "@/lib/auth";

export async function POST(request: NextRequest) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
  if (!body.email || !body.password) {
    return NextResponse.json({ error: "email and password required" }, { status: 400 });
  }

  const user = await findUserByEmail(body.email);
  if (!user || !verifyPassword(body.password, user.passwordHash)) {
    return NextResponse.json({ error: "wrong email or password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true, role: user.role });
  res.cookies.set(sessionCookie.name, makeSessionToken(user.id), sessionCookie.options);
  return res;
}
