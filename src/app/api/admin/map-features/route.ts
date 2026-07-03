// Admin map-features API — backs the /admin/maps builder.
//
// GET [?view=id] — admin: all features, optionally only those on one view.
// POST           — admin: create/update one feature. Geometry must match the
//                  kind (marker→point, line/trail→path≥2, area→polygon≥3) and
//                  every point is sanity-checked against a greater-Kingston box
//                  so a fat-fingered drag can't fling a feature into the ocean.
//                  views[] must reference existing view ids.
// DELETE ?id=X   — admin: tombstone a feature (hides seed entries too).
//
// 401 signed out · 403 signed in but not admin. The /admin layout gates the
// editor UI; these handlers re-check because API routes bypass layouts.

import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import type { FeatureKind, MapFeature } from "@/lib/map/types";
import { deleteMapFeature, getMapFeatures, saveMapFeature } from "@/lib/stores/map-store";
import { getMapViews } from "@/lib/stores/map-store";

const KINDS: FeatureKind[] = ["marker", "line", "trail", "area"];

// Greater Kingston, WA — anything outside this box is a data-entry mistake.
const LAT_MIN = 47.5;
const LAT_MAX = 48.1;
const LNG_MIN = -123;
const LNG_MAX = -122.2;

function isLatLng(p: unknown): p is [number, number] {
  return (
    Array.isArray(p) &&
    p.length === 2 &&
    typeof p[0] === "number" &&
    typeof p[1] === "number" &&
    Number.isFinite(p[0]) &&
    Number.isFinite(p[1]) &&
    p[0] >= LAT_MIN &&
    p[0] <= LAT_MAX &&
    p[1] >= LNG_MIN &&
    p[1] <= LNG_MAX
  );
}

/** Admin gate: null when allowed, otherwise the 401/403 response to return. */
async function requireAdmin(): Promise<NextResponse | null> {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Chamber admins only" }, { status: 403 });
  }
  return null;
}

export async function GET(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const view = request.nextUrl.searchParams.get("view");
  const features = await getMapFeatures();
  return NextResponse.json({
    features: view ? features.filter((f) => f.views.includes(view)) : features,
  });
}

export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id.trim() : "";
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/i.test(id)) {
    return NextResponse.json(
      { error: "id required: letters, numbers, and dashes (max 64 chars)" },
      { status: 400 },
    );
  }

  const kind = body.kind as FeatureKind;
  if (!KINDS.includes(kind)) {
    return NextResponse.json({ error: "kind must be marker, line, trail, or area" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

  // Geometry must match the kind.
  let point: [number, number] | undefined;
  let path: [number, number][] | undefined;
  let polygon: [number, number][] | undefined;

  if (kind === "marker") {
    if (!isLatLng(body.point)) {
      return NextResponse.json(
        { error: "marker needs point [lat, lng] within the Kingston area" },
        { status: 400 },
      );
    }
    point = [body.point[0], body.point[1]];
  } else if (kind === "line" || kind === "trail") {
    if (!Array.isArray(body.path) || body.path.length < 2) {
      return NextResponse.json(
        { error: `${kind} needs a path of at least 2 [lat, lng] points` },
        { status: 400 },
      );
    }
    if (!body.path.every(isLatLng)) {
      return NextResponse.json(
        { error: "every path point must be [lat, lng] within the Kingston area" },
        { status: 400 },
      );
    }
    path = body.path.map((p) => [p[0], p[1]] as [number, number]);
  } else {
    // area
    if (!Array.isArray(body.polygon) || body.polygon.length < 3) {
      return NextResponse.json(
        { error: "area needs a polygon of at least 3 [lat, lng] points" },
        { status: 400 },
      );
    }
    if (!body.polygon.every(isLatLng)) {
      return NextResponse.json(
        { error: "every polygon point must be [lat, lng] within the Kingston area" },
        { status: 400 },
      );
    }
    polygon = body.polygon.map((p) => [p[0], p[1]] as [number, number]);
  }

  // views[] must be a non-empty array of existing view ids.
  if (!Array.isArray(body.views) || body.views.length === 0 || !body.views.every((v) => typeof v === "string")) {
    return NextResponse.json({ error: "assign the feature to at least one view" }, { status: 400 });
  }
  const knownIds = new Set((await getMapViews()).map((v) => v.id));
  const views = [...new Set(body.views as string[])];
  const unknown = views.filter((v) => !knownIds.has(v));
  if (unknown.length) {
    return NextResponse.json(
      { error: `unknown view id(s): ${unknown.join(", ")}` },
      { status: 400 },
    );
  }

  const category =
    typeof body.category === "string" && body.category.trim() ? body.category.trim() : undefined;
  const color =
    typeof body.color === "string" && /^#[0-9a-f]{6}$/i.test(body.color.trim())
      ? body.color.trim()
      : undefined;
  const notes = typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : undefined;
  const link =
    typeof body.link === "string" && /^https?:\/\//.test(body.link.trim())
      ? body.link.trim()
      : undefined;
  const imageUrl =
    typeof body.imageUrl === "string" && body.imageUrl.trim() ? body.imageUrl.trim() : undefined;

  const feature: MapFeature = {
    id,
    kind,
    title,
    views,
    ...(notes ? { notes } : {}),
    ...(category ? { category } : {}),
    ...(color ? { color } : {}),
    ...(imageUrl ? { imageUrl } : {}),
    ...(link ? { link } : {}),
    ...(point ? { point } : {}),
    ...(path ? { path } : {}),
    ...(polygon ? { polygon } : {}),
  };

  await saveMapFeature(feature);
  return NextResponse.json({ ok: true, feature });
}

export async function DELETE(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  if (!(await getMapFeatures()).some((f) => f.id === id)) {
    return NextResponse.json({ error: "Feature not found" }, { status: 404 });
  }

  await deleteMapFeature(id);
  return NextResponse.json({ ok: true });
}
