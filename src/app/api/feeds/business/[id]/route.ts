// Public JSON feed for one business listing — the thing a restaurant's own
// website can poll so its hours never drift from the portal's canonical copy.
//
// GET /api/feeds/business/<id> →
//   { name, hours, weeklyHours, address, phone, links, openNow, ... }
//
// openNow/openLabel are computed server-side at response time via the same
// getOpenStatus math that powers the site's live badge. Cache is short
// (s-maxage=60) because open/closed flips on minute boundaries; everything
// else in the payload changes rarely.
//
// Access-Control-Allow-Origin: * on purpose — this is public directory data
// and business sites fetch it cross-origin.

import type { NextRequest } from "next/server";
import { getRestaurant } from "@/lib/stores/business-store";
import { getOpenStatus } from "@/lib/hours";

const SHARED_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const listing = await getRestaurant(id);
  if (!listing) {
    return Response.json(
      { error: "Listing not found" },
      { status: 404, headers: { "Access-Control-Allow-Origin": "*" } },
    );
  }

  const status = listing.weeklyHours ? getOpenStatus(listing.weeklyHours) : null;

  return Response.json(
    {
      id: listing.id,
      name: listing.name,
      cuisine: listing.cuisine,
      address: listing.address,
      phone: listing.phone ?? null,
      hours: listing.hours ?? null,
      weeklyHours: listing.weeklyHours ?? null,
      hoursVerified: listing.hoursVerified ?? null,
      links: {
        website: listing.website ?? null,
        menu: listing.menuUrl ?? null,
        ordering: listing.orderingUrl ?? null,
      },
      openNow: status ? status.open : null,
      openLabel: status ? status.label : null,
      asOf: new Date().toISOString(),
    },
    { headers: SHARED_HEADERS },
  );
}
