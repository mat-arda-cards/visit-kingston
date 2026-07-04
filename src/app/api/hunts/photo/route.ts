// Streams a stored hunt image (reference photo or player submission).
// GET /api/hunts/photo?p=<path relative to .data/hunts>
//
// The path is strictly sanitized in hunt-store (no traversal, image
// extensions only, resolved inside .data/hunts).
//
// Access: reference photos ("refs/…") are PUBLIC — players see them on the
// hunt pages ("what you're looking for"). Player submissions ("photos/…") are
// PRIVATE — only the Chamber reviews them — so those require an admin session.
// (Filesystem mode only; when images live in the public Vercel Blob store the
// URL itself is unguessable-but-public — see ROADMAP for a private-blob follow-up.)

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { isBlobUrl, readPhoto } from "@/lib/hunt-store";

export async function GET(request: NextRequest) {
  const relPath = request.nextUrl.searchParams.get("p");
  if (!relPath) return new Response("Missing ?p", { status: 400 });

  // Player submissions are admin-only; reference photos are public.
  if (!isBlobUrl(relPath) && relPath.startsWith("photos/")) {
    const denied = await requireAdmin();
    if (denied) return denied;
  }

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
