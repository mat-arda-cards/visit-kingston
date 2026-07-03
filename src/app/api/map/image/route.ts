// Serves a stored feature image (public — public maps display these).

import { NextRequest } from "next/server";
import { readFeatureImage } from "@/lib/stores/map-store";

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("p") ?? "";
  const img = await readFeatureImage(name);
  if (!img) return new Response("not found", { status: 404 });
  return new Response(new Uint8Array(img.bytes), {
    headers: {
      "Content-Type": img.type,
      "Cache-Control": "public, max-age=86400",
    },
  });
}
