// Serves a stored feature image (public — public maps display these).

import { NextRequest, NextResponse } from "next/server";
import { isTrustedBlobUrl } from "@/lib/blob-store";
import { readFeatureImage } from "@/lib/stores/map-store";

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("p") ?? "";

  // Prod: the stored value is a full Vercel Blob URL — redirect to the CDN.
  // Only OUR blob host is trusted here — isBlobUrl() elsewhere is just a
  // storage-form detector (URL vs fs path), not a redirect allowlist.
  if (isTrustedBlobUrl(name)) return NextResponse.redirect(name, 302);

  // Legacy / local dev: stream from the filesystem (name strictly validated).
  const img = await readFeatureImage(name);
  if (!img) return new Response("not found", { status: 404 });
  return new Response(new Uint8Array(img.bytes), {
    headers: {
      "Content-Type": img.type,
      "Cache-Control": "public, max-age=86400",
    },
  });
}
