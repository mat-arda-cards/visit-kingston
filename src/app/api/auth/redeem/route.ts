import { NextRequest, NextResponse } from "next/server";
import { makeSessionToken, redeemInvite, sessionCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  let body: { code?: string; email?: string; name?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
  if (!body.code || !body.email || !body.name || !body.password || body.password.length < 8) {
    return NextResponse.json(
      { error: "invite code, email, name, and a password of 8+ characters required" },
      { status: 400 },
    );
  }
  try {
    const user = await redeemInvite(body.code.trim(), {
      email: body.email,
      name: body.name,
      password: body.password,
    });
    const res = NextResponse.json({ ok: true, role: user.role });
    res.cookies.set(sessionCookie.name, makeSessionToken(user.id), sessionCookie.options);
    return res;
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "could not redeem invite" },
      { status: 400 },
    );
  }
}
