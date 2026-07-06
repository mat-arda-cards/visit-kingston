import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { isTrustedBlobUrl } from "@/lib/blob-store";
import { GET as mapImageGet } from "@/app/api/map/image/route";
import { GET as huntsPhotoGet } from "@/app/api/hunts/photo/route";

const TRUSTED = "https://abc123.public.blob.vercel-storage.com/map/images/x.jpg";
const EVIL = "https://evil.example/phish";
const SUBSTRING_TRICK = "https://evil.example/.public.blob.vercel-storage.com";

function get(path: string, p: string) {
  return new NextRequest(`http://localhost${path}?p=${encodeURIComponent(p)}`);
}

describe("open-redirect fix on image routes", () => {
  it("map/image redirects only the trusted blob host", async () => {
    expect((await mapImageGet(get("/api/map/image", EVIL))).status).toBe(404);
    const trusted = await mapImageGet(get("/api/map/image", TRUSTED));
    expect(trusted.status).toBe(302);
    expect(trusted.headers.get("location")).toBe(TRUSTED);
    expect((await mapImageGet(get("/api/map/image", SUBSTRING_TRICK))).status).toBe(404);
  });

  it("hunts/photo redirects only the trusted blob host", async () => {
    expect((await huntsPhotoGet(get("/api/hunts/photo", EVIL))).status).toBe(404);
    const trusted = await huntsPhotoGet(get("/api/hunts/photo", TRUSTED));
    expect(trusted.status).toBe(302);
    expect(trusted.headers.get("location")).toBe(TRUSTED);
    expect((await huntsPhotoGet(get("/api/hunts/photo", SUBSTRING_TRICK))).status).toBe(404);
  });

  it("isTrustedBlobUrl requires a dot boundary before the hostname suffix", () => {
    expect(isTrustedBlobUrl("https://xpublic.blob.vercel-storage.com")).toBe(false);
    expect(isTrustedBlobUrl(TRUSTED)).toBe(true);
  });
});
