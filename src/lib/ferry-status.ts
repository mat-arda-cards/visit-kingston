// One assembled ferry-status snapshot, shared by the /api/ferry/status route
// (client polling) and the server pages that render the initial state — so the
// home widget hydrates from the same shape it later polls.

import {
  getRouteAlerts,
  getRouteDelays,
  getSailingSpace,
  getTerminalStatus,
  getTodaysSailings,
  type BoardingPassStatus,
  type RouteDelays,
  type SailingSpace,
} from "./wsf";
import { getEffectiveBoardingPass } from "./stores/boarding-pass-store";
import { recordSailingSpaceSnapshot } from "./stores/ferry-observations";
import { getFastFerrySailings } from "./kitsap";
import type { Sailing, TerminalStatus } from "./types";

export interface FerryStatusSnapshot {
  /**
   * E13. ISO timestamp stamped when THIS payload was assembled — NOT when WSDOT
   * last reported. The sub-fetches in ./wsf sit behind Next's Data Cache with
   * 30s–900s revalidate windows, so upstream data can be materially older than
   * this value. Never word it as "WSDOT last reported at". It exists so a copy
   * served from the service-worker cache can be bounded: it tells you how old
   * the *snapshot* is, which is the ceiling on how fresh anything in it can be.
   */
  generatedAt: string;
  carFerry: { sailings: Sailing[]; live: boolean };
  fastFerry: { sailings: Sailing[]; live: boolean };
  terminals: { kingston: TerminalStatus; edmonds: TerminalStatus };
  alerts: string[];
  delays: RouteDelays;
  sailingSpace: { kingston: SailingSpace[]; edmonds: SailingSpace[] };
  boardingPass: BoardingPassStatus;
}

export async function getFerryStatusSnapshot(): Promise<FerryStatusSnapshot> {
  const [carFerry, kingston, edmonds, alerts, delays, spaceFromKingston, spaceFromEdmonds, boardingPass] =
    await Promise.all([
      getTodaysSailings(),
      getTerminalStatus("kingston"),
      getTerminalStatus("edmonds"),
      getRouteAlerts(),
      getRouteDelays(),
      getSailingSpace("kingston"),
      getSailingSpace("edmonds"),
      getEffectiveBoardingPass(),
    ]);
  const sailingSpace = { kingston: spaceFromKingston, edmonds: spaceFromEdmonds };

  // Best-effort: log this snapshot's per-sailing fullness + delay so the trip
  // planner's busyness model can refine against real data over time. Throttled
  // internally and never awaited, so it can't slow or break the status response.
  void recordSailingSpaceSnapshot(sailingSpace, delays).catch(() => {});

  // Stamped here, at the single assembly point, so every path that can produce a
  // snapshot carries it (there is exactly one return — no early exits, no
  // try/catch — and any future early return must stamp it too).
  return {
    generatedAt: new Date().toISOString(),
    carFerry,
    fastFerry: getFastFerrySailings(),
    terminals: { kingston, edmonds },
    alerts,
    delays,
    sailingSpace,
    boardingPass,
  };
}
