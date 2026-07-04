// Admin API for the forecast-accuracy panel on /admin/ferry-info.
//
// GET  — admin: { latest, history } (the recorded accuracy snapshots).
// POST — admin: runs the backtest now and records a fresh snapshot, then returns
//        { latest, history }. Lets staff validate on demand instead of waiting
//        for the daily cron.
//
// 401 signed out · 403 signed in but not admin.

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getAccuracy, recordAccuracySnapshot } from "@/lib/stores/ferry-observations";

export const dynamic = "force-dynamic";

async function requireAdmin(): Promise<NextResponse | null> {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Chamber admins only" }, { status: 403 });
  return null;
}

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  return NextResponse.json(await getAccuracy());
}

export async function POST() {
  const denied = await requireAdmin();
  if (denied) return denied;
  await recordAccuracySnapshot();
  return NextResponse.json({ ok: true, ...(await getAccuracy()) });
}
