// Public read API for a resolved map view — powers the <FeatureMap> component.

import { NextRequest, NextResponse } from "next/server";
import { resolveMapView } from "@/lib/map/resolve";
import { getMapView } from "@/lib/stores/map-store";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ viewId: string }> }) {
  const { viewId } = await ctx.params;

  const view = await getMapView(viewId);
  if (!view) {
    return NextResponse.json({ error: "unknown view" }, { status: 404 });
  }
  // Unpublished (draft) views are only served to admins.
  if (!view.published) {
    const { getSessionUser } = await import("@/lib/auth");
    const user = await getSessionUser();
    if (user?.role !== "admin") {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
  }

  const resolved = await resolveMapView(viewId);
  if (!resolved) {
    return NextResponse.json({ error: "unknown view" }, { status: 404 });
  }
  return NextResponse.json(resolved, {
    headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=300" },
  });
}
