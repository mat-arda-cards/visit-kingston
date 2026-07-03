// Streams a stored hunt image (reference photo or player submission).
// GET /api/hunts/photo?p=<path relative to .data/hunts>
//
// The path is strictly sanitized in hunt-store (no traversal, image
// extensions only, resolved inside .data/hunts). Local-only app — no auth;
// see the note in /api/hunts/route.ts.

import { NextRequest, NextResponse } from "next/server";
import { isBlobUrl, readPhoto } from "@/lib/hunt-store";

export async function GET(request: NextRequest) {
  const relPath = request.nextUrl.searchParams.get("p");
  if (!relPath) return new Response("Missing ?p", { status: 400 });

  // Prod: the stored value is a full Vercel Blob URL — redirect to the CDN.
  if (isBlobUrl(relPath)) return NextResponse.redirect(relPath, 302);

  // Legacy / local dev: stream from the filesystem (path strictly sanitized).
  const photo = await readPhoto(relPath);
  if (!photo) return new Response("Not found", { status: 404 });

  return new Response(photo.data, {
    headers: {
      "Content-Type": photo.contentType,
      "Content-Length": String(photo.data.byteLength),
      // Reference photos can be replaced under the same name — don't cache.
      "Cache-Control": "private, no-store",
    },
  });
}
