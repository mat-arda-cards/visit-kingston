// schema.org structured data for restaurant listings.
//
// Google (and Bing/Apple crawlers) read this as a machine-readable signal for
// name, hours, phone, and location — so a listing page carrying this markup
// helps search results stay in step with the portal's canonical hours even
// before any direct API sync exists.
//
// Server-safe: renders a single <script type="application/ld+json"> tag.
// Not wired into any page here — pages import LocalBusinessJsonLd themselves.

import type { Restaurant, WeeklyHours } from "@/lib/types";

const DAY_ORDER: { key: keyof WeeklyHours; dayOfWeek: string }[] = [
  { key: "mon", dayOfWeek: "https://schema.org/Monday" },
  { key: "tue", dayOfWeek: "https://schema.org/Tuesday" },
  { key: "wed", dayOfWeek: "https://schema.org/Wednesday" },
  { key: "thu", dayOfWeek: "https://schema.org/Thursday" },
  { key: "fri", dayOfWeek: "https://schema.org/Friday" },
  { key: "sat", dayOfWeek: "https://schema.org/Saturday" },
  { key: "sun", dayOfWeek: "https://schema.org/Sunday" },
];

/**
 * One OpeningHoursSpecification per open span per day; closed days (empty
 * arrays) are simply omitted. Past-midnight spans (close <= open, e.g.
 * 17:00–01:00) emit closes as the raw time — acceptable per schema.org,
 * which documents "opens > closes" as spanning midnight.
 */
function openingHoursSpecs(weekly: WeeklyHours) {
  const specs: Array<{
    "@type": "OpeningHoursSpecification";
    dayOfWeek: string;
    opens: string;
    closes: string;
  }> = [];
  for (const { key, dayOfWeek } of DAY_ORDER) {
    for (const [opens, closes] of weekly[key] ?? []) {
      specs.push({ "@type": "OpeningHoursSpecification", dayOfWeek, opens, closes });
    }
  }
  return specs;
}

/**
 * Listing addresses are single strings like
 * "11264 NE State Hwy 104, Kingston, WA 98346" — split on commas, with
 * Kingston/WA fallbacks since every listing in this directory is local.
 */
function postalAddress(address: string) {
  const parts = address.split(",").map((p) => p.trim());
  // End-anchored so a 5-digit street number ("11264 NE State Hwy 104")
  // can never be mistaken for the zip.
  const tail = /\b([A-Z]{2})\s+(\d{5}(?:-\d{4})?)\s*$/.exec(address);
  const region = tail?.[1];
  const zip = tail?.[2];
  return {
    "@type": "PostalAddress" as const,
    streetAddress: parts[0] || address,
    addressLocality: parts.length >= 3 ? parts[1] : "Kingston",
    addressRegion: region ?? "WA",
    ...(zip ? { postalCode: zip } : {}),
    addressCountry: "US",
  };
}

export function LocalBusinessJsonLd({ restaurant }: { restaurant: Restaurant }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: restaurant.name,
    address: postalAddress(restaurant.address),
    ...(restaurant.phone ? { telephone: restaurant.phone } : {}),
    ...(restaurant.website ? { url: restaurant.website } : {}),
    ...(restaurant.menuUrl ? { hasMenu: restaurant.menuUrl } : {}),
    servesCuisine: restaurant.cuisine,
    priceRange: "$".repeat(restaurant.priceLevel),
    geo: {
      "@type": "GeoCoordinates",
      latitude: restaurant.lat,
      longitude: restaurant.lng,
    },
    ...(restaurant.weeklyHours
      ? { openingHoursSpecification: openingHoursSpecs(restaurant.weeklyHours) }
      : {}),
  };

  return (
    <script
      type="application/ld+json"
      // "<" escaped so listing text can never close the script tag early.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
