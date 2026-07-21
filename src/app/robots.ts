// Runtime-env-driven robots.txt. Both explore-kingston (production) and
// explore-kingston-staging build the SAME image, so the noindex decision is
// made at request time via NOINDEX rather than at build time:
//   NOINDEX=1 (staging only) -> disallow everything, keep it out of search.
//   unset (production)      -> disallow only the private/admin surfaces.
// `dynamic = "force-dynamic"` opts this metadata route out of static
// generation caching so it re-reads the env on every request.
import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  if (process.env.NOINDEX === "1") {
    // Staging: no sitemap either — advertising one invites crawling the very
    // host we are trying to keep out of search.
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: { userAgent: "*", disallow: ["/admin", "/portal", "/api"] },
    // Absolute by spec — a sitemap directive must be a full URL, and it has to
    // agree with the origin in metadataBase (both come from siteUrl()).
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
