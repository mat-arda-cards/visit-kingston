// POST /api/track — anonymous, cookie-less visit counting for LTAC reporting.
//
// The client (src/components/tracker.tsx) sends events via
// navigator.sendBeacon, which posts JSON with a text/plain content type — so
// we always read the raw text and parse it ourselves instead of relying on
// request.json().
//
// Geography is derived server-side from connection headers only — coarse
// country/region/city, no permission prompt, and the IP itself is NEVER
// stored (it is inspected once, below, purely to tell "local dev" from
// "unknown"). Note: IP geolocation cannot reliably produce zip codes; the
// anonymous survey (/api/survey) remains the only zip source.
//
// This endpoint always answers { ok: true } — telemetry must never break or
// slow down a visitor's session.

import { NextRequest } from "next/server";
import { saveEvent, type AnalyticsEvent, type AnalyticsGeo } from "@/lib/analytics-store";

const MAX_PATH = 200;
const MAX_SESSION_ID = 64;
const MAX_HREF = 500;
const MAX_LABEL = 120;
const MAX_GEO_FIELD = 80;

function trunc(value: unknown, max: number): string | undefined {
  return typeof value === "string" && value.length > 0 ? value.slice(0, max) : undefined;
}

/** Loopback / RFC-1918 / link-local check — used only to label dev traffic. */
function isLoopbackOrPrivate(ip: string): boolean {
  const v = ip.replace(/^::ffff:/i, "").toLowerCase();
  if (v === "::1" || v === "localhost") return true;
  if (/^127\./.test(v) || /^10\./.test(v) || /^192\.168\./.test(v)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(v)) return true;
  if (/^169\.254\./.test(v)) return true; // link-local
  if (/^f[cd]/.test(v) || /^fe80/.test(v)) return true; // IPv6 ULA / link-local
  return false;
}

function deriveGeo(request: NextRequest): AnalyticsGeo {
  // On Vercel, the platform injects coarse IP-derived geography headers.
  const country = request.headers.get("x-vercel-ip-country");
  if (country) {
    const rawCity = request.headers.get("x-vercel-ip-city");
    let city: string | undefined;
    if (rawCity) {
      try {
        city = decodeURIComponent(rawCity); // header is URL-encoded, e.g. "S%C3%A9attle"
      } catch {
        city = rawCity;
      }
    }
    return {
      country: trunc(country, MAX_GEO_FIELD),
      region: trunc(request.headers.get("x-vercel-ip-country-region"), MAX_GEO_FIELD),
      city: trunc(city, MAX_GEO_FIELD),
      source: "vercel-headers",
    };
  }

  // No platform geo headers. Peek at the connection IP ONLY to classify the
  // request as local development traffic — the IP is never stored or logged.
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = (forwarded?.split(",")[0] ?? request.headers.get("x-real-ip") ?? "").trim();
  if (ip && isLoopbackOrPrivate(ip)) {
    return { source: "dev-local" };
  }
  return { source: "unknown" };
}

export async function POST(request: NextRequest) {
  try {
    // sendBeacon delivers JSON as text/plain; fetch fallback sends it as
    // application/json — reading raw text handles both.
    const raw = await request.text();
    const body = JSON.parse(raw) as Record<string, unknown>;

    const type = body.type === "outbound" ? "outbound" : body.type === "pageview" ? "pageview" : null;
    const path = trunc(body.path, MAX_PATH);
    const sessionId = trunc(body.sessionId, MAX_SESSION_ID)?.replace(/[^A-Za-z0-9_-]/g, "");

    // Drop malformed events and anything from the admin dashboard itself
    // (the client tracker already skips /admin; this is defense in depth).
    if (!type || !path || !path.startsWith("/") || !sessionId || path.startsWith("/admin")) {
      return Response.json({ ok: true });
    }

    const event: AnalyticsEvent = {
      ts: new Date().toISOString(),
      type,
      path,
      sessionId,
      geo: deriveGeo(request),
      ...(type === "outbound"
        ? { href: trunc(body.href, MAX_HREF), label: trunc(body.label, MAX_LABEL) }
        : {}),
    };

    await saveEvent(event);
  } catch {
    // Bad JSON, read-only filesystem, whatever — never fail the visitor.
  }
  return Response.json({ ok: true });
}
