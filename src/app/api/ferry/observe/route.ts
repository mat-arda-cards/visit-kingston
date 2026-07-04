// GET|POST /api/ferry/observe
//
// Records one snapshot of Edmonds–Kingston sailing fullness + delay into the
// observation log, so the trip planner's busyness model keeps learning even
// when nobody's on the site. The status pipeline already captures snapshots on
// organic traffic (throttled); point a free scheduler (e.g. GitHub Actions
// cron, every ~15 min during service hours) at this to cover overnight gaps.
//
// The write is throttled internally, so hitting this more often than the
// throttle window is harmless (it just returns recorded:false). If
// FERRY_OBSERVE_TOKEN is set, a matching ?token= or `Authorization: Bearer`
// is required; otherwise it's open (writes are throttled + store only public
// ferry data, so the blast radius is nil).

import type { NextRequest } from "next/server";
import { getRouteDelays, getSailingSpace } from "@/lib/wsf";
import { recordSailingSpaceSnapshot } from "@/lib/stores/ferry-observations";

// This route mutates state on every hit — never prerender or cache it.
export const dynamic = "force-dynamic";

async function handle(request: NextRequest): Promise<Response> {
  const expected = process.env.FERRY_OBSERVE_TOKEN;
  if (expected) {
    const provided =
      request.nextUrl.searchParams.get("token") ??
      request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
      "";
    if (provided !== expected) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const [kingston, edmonds, delays] = await Promise.all([
    getSailingSpace("kingston"),
    getSailingSpace("edmonds"),
    getRouteDelays(),
  ]);
  const recorded = await recordSailingSpaceSnapshot({ kingston, edmonds }, delays);

  return Response.json({ ok: true, recorded });
}

export async function GET(request: NextRequest): Promise<Response> {
  return handle(request);
}

export async function POST(request: NextRequest): Promise<Response> {
  return handle(request);
}
