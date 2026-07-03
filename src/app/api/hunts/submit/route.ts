// Player photo submission → the check-off endpoint.
//
// POST multipart/form-data: photo (File), huntId, stopId, lat?, lng?
// Responds { ok: true, verified, distanceMeters }.
//
// Decision: verified = coords were sent AND the haversine distance from the
// player to the stop is within the stop's radiusMeters. No/denied GPS still
// accepts the photo, just with verified: false (honor system). The photo and
// coords are stored under .data/hunts for admin review — player-facing copy
// discloses this. Local-only app — no auth; see /api/hunts/route.ts.

import { NextRequest } from "next/server";
import { MAX_PHOTO_BYTES, imageExtension, saveSubmission } from "@/lib/hunt-store";

export async function POST(request: NextRequest) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ ok: false, error: "expected multipart/form-data" }, { status: 400 });
  }

  const photo = form.get("photo");
  const huntId = form.get("huntId");
  const stopId = form.get("stopId");
  if (!(photo instanceof File) || typeof huntId !== "string" || typeof stopId !== "string") {
    return Response.json(
      { ok: false, error: "photo, huntId, and stopId are required" },
      { status: 400 },
    );
  }

  if (photo.size === 0) {
    return Response.json({ ok: false, error: "empty photo" }, { status: 400 });
  }
  if (photo.size > MAX_PHOTO_BYTES) {
    return Response.json({ ok: false, error: "photo too large (max 8 MB)" }, { status: 413 });
  }
  const ext = imageExtension(photo.type, photo.name);
  if (!ext) {
    return Response.json(
      { ok: false, error: "unsupported image type (jpeg, png, webp, or heic only)" },
      { status: 415 },
    );
  }

  const lat = parseCoord(form.get("lat"), 90);
  const lng = parseCoord(form.get("lng"), 180);

  try {
    const submission = await saveSubmission({
      huntId,
      stopId,
      photo: new Uint8Array(await photo.arrayBuffer()),
      ext,
      lat,
      lng,
    });
    return Response.json({
      ok: true,
      verified: submission.verified,
      distanceMeters: submission.distanceMeters ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "could not save submission";
    const status = message.includes("not found") ? 404 : 400;
    return Response.json({ ok: false, error: message }, { status });
  }
}

function parseCoord(value: FormDataEntryValue | null, bound: number): number | undefined {
  if (typeof value !== "string" || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) && Math.abs(n) <= bound ? n : undefined;
}
