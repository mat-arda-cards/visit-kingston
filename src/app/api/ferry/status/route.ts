// Live ferry status for client-side refresh (the ferry page polls this).

import { getRouteAlerts, getTerminalStatus, getTodaysSailings } from "@/lib/wsf";
import { getFastFerrySailings } from "@/lib/kitsap";

export async function GET() {
  const [wsf, kingston, edmonds, alerts] = await Promise.all([
    getTodaysSailings(),
    getTerminalStatus("kingston"),
    getTerminalStatus("edmonds"),
    getRouteAlerts(),
  ]);
  const fast = getFastFerrySailings();

  return Response.json({
    carFerry: wsf,
    fastFerry: fast,
    terminals: { kingston, edmonds },
    alerts,
  });
}
