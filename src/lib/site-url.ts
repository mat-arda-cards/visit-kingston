// The absolute public origin, in ONE place.
//
// `layout.tsx` (metadataBase → OG/canonical URLs), `sitemap.ts` and `robots.ts`
// must all agree: a sitemap advertising a different origin than the canonical
// tags is a self-inflicted SEO problem, and it is the kind of drift that only
// shows up once a crawler has already indexed the wrong host.
//
// NEXT_PUBLIC_* is INLINED AT BUILD TIME. Changing this value on Render does
// nothing until the image is rebuilt — a deploy, not a restart. That is why the
// launch runbook sets it and redeploys in the same step.

const FALLBACK = "http://localhost:3000";

/**
 * Absolute origin with any trailing slash removed, so callers can always
 * template `${siteUrl()}/path` without producing a double slash.
 */
export function siteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  return (configured && configured.length > 0 ? configured : FALLBACK).replace(/\/+$/, "");
}

/** Absolute URL for a site-relative path, e.g. absoluteUrl("/ferry"). */
export function absoluteUrl(path: string): string {
  return `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}
