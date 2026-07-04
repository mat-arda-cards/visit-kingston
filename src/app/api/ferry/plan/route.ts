// GET /api/ferry/plan?date=YYYY-MM-DD
//
// Real Edmonds–Kingston sailings for a chosen Pacific date, so the trip planner
// can snap its busyness estimate to actual departure times. When the date is
// today, it also returns live drive-up space so "the 4:40 boat" can show the
// real spots-open count alongside the estimate. The busyness forecast itself is
// computed in the browser (src/lib/ferry-forecast.ts) — this route only serves
// the schedule + any live corroboration.

import type { NextRequest } from "next/server";
import { getSailingsForDate, getSailingSpace } from "@/lib/wsf";
import { todayPacific } from "@/lib/time";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** True when dateStr is a real calendar date within [today, today+365d] Pacific. */
function isPlannableDate(dateStr: string, today: string): boolean {
  if (!DATE_RE.test(dateStr)) return false;
  const [y, m, d] = dateStr.split("-").map(Number);
  const asUtc = new Date(Date.UTC(y, m - 1, d));
  // Reject overflow like 2026-02-31 (Date normalizes it to a different day).
  if (asUtc.getUTCFullYear() !== y || asUtc.getUTCMonth() !== m - 1 || asUtc.getUTCDate() !== d) {
    return false;
  }
  if (dateStr < today) return false;
  const [ty, tm, td] = today.split("-").map(Number);
  const horizon = new Date(Date.UTC(ty, tm - 1, td + 365));
  return asUtc.getTime() <= horizon.getTime();
}

export async function GET(request: NextRequest) {
  const today = todayPacific();
  const date = request.nextUrl.searchParams.get("date") ?? today;

  if (!isPlannableDate(date, today)) {
    return Response.json({ error: "Invalid or out-of-range date." }, { status: 400 });
  }

  const isToday = date === today;
  const schedule = await getSailingsForDate(date);

  const sailingSpace = isToday
    ? {
        kingston: await getSailingSpace("kingston"),
        edmonds: await getSailingSpace("edmonds"),
      }
    : undefined;

  return Response.json({
    date,
    isToday,
    sailings: schedule.sailings,
    live: schedule.live,
    sailingSpace,
  });
}
