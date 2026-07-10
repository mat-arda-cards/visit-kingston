// Runtime-env-driven robots.txt. Both explore-kingston (production) and
// explore-kingston-staging build the SAME image, so the noindex decision is
// made at request time via NOINDEX rather than at build time:
//   NOINDEX=1 (staging only) -> disallow everything, keep it out of search.
//   unset (production)      -> disallow only the private/admin surfaces.
// `dynamic = "force-dynamic"` opts this metadata route out of static
// generation caching so it re-reads the env on every request.
import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  if (process.env.NOINDEX === "1") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return { rules: { userAgent: "*", disallow: ["/admin", "/portal", "/api"] } };
}
