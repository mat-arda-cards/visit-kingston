// Live Edmonds–Kingston vessel positions for the ferry-page map to poll.
// Never cached — WSDOT updates positions every few seconds; the client throttles.

import { getVesselLocations } from "@/lib/wsf";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getVesselLocations();
  return Response.json(data, { headers: { "Cache-Control": "no-store" } });
}
