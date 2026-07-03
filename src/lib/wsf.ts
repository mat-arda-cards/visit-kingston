// WSDOT Ferries API adapter (Edmonds–Kingston route).
//
// Live mode uses the free WSDOT access code in the WSDOT_API_KEY env var:
// sign up at https://wsdot.wa.gov/traffic/api/ — instant, no cost. The key
// rides in the URL query string, so these calls must stay server-side.
// Without a key, every function falls back to the bundled seasonal schedule
// in ./data/ferry-fallback so the app still works, marked live:false.
//
// API facts verified 2026-07-02 (see docs/DATA_SOURCES.md):
// Edmonds TerminalID = 8, Kingston TerminalID = 12, Ed-King RouteID = 6.
// Dates are WCF "/Date(ms-0700)/" strings. No published rate limits —
// self-throttle via fetch revalidation and be a good citizen.

import type { Sailing, TerminalStatus } from "./types";
import { fallbackSailings } from "./data/ferry-fallback";

const API_KEY = process.env.WSDOT_API_KEY;

export const TERMINAL_IDS = { edmonds: 8, kingston: 12 } as const;
export const ED_KING_ROUTE_ID = 6;

const SCHEDULE_BASE = "https://www.wsdot.wa.gov/ferries/api/schedule/rest";
const TERMINALS_BASE = "https://www.wsdot.wa.gov/ferries/api/terminals/rest";

/** Unwrap WCF "/Date(1719936000000-0700)/" strings to ISO 8601. */
function parseWsdotDate(raw: string): string {
  const match = /\/Date\((\d+)(?:[-+]\d{4})?\)\//.exec(raw);
  if (!match) return raw;
  return new Date(Number(match[1])).toISOString();
}

async function wsfFetch<T>(url: string, revalidateSeconds: number): Promise<T | null> {
  if (!API_KEY) return null;
  try {
    const res = await fetch(`${url}${url.includes("?") ? "&" : "?"}apiaccesscode=${API_KEY}`, {
      next: { revalidate: revalidateSeconds },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

interface WsfScheduleTime {
  DepartingTime: string;
  ArrivingTime: string | null;
  VesselName: string;
}

interface WsfScheduleResponse {
  TerminalCombos: {
    DepartingTerminalID: number;
    Times: WsfScheduleTime[];
  }[];
}

/**
 * Today's Edmonds–Kingston sailings in both directions via /scheduletoday
 * (no date math, WSDOT handles the seasonal schedule). Falls back to the
 * bundled schedule when the API is unreachable or no key is set.
 */
export async function getTodaysSailings(): Promise<{ sailings: Sailing[]; live: boolean }> {
  const [toKingston, toEdmonds] = await Promise.all([
    wsfFetch<WsfScheduleResponse>(
      `${SCHEDULE_BASE}/scheduletoday/${TERMINAL_IDS.edmonds}/${TERMINAL_IDS.kingston}/false`,
      900,
    ),
    wsfFetch<WsfScheduleResponse>(
      `${SCHEDULE_BASE}/scheduletoday/${TERMINAL_IDS.kingston}/${TERMINAL_IDS.edmonds}/false`,
      900,
    ),
  ]);

  if (toKingston && toEdmonds) {
    const toSailings = (r: WsfScheduleResponse, direction: Sailing["direction"]): Sailing[] =>
      r.TerminalCombos.flatMap((combo) =>
        combo.Times.map((t) => ({
          route: "edmonds-kingston" as const,
          direction,
          departs: parseWsdotDate(t.DepartingTime),
          arrives: t.ArrivingTime ? parseWsdotDate(t.ArrivingTime) : undefined,
          vessel: t.VesselName,
        })),
      );
    return {
      sailings: [
        ...toSailings(toKingston, "to-kingston"),
        ...toSailings(toEdmonds, "from-kingston"),
      ],
      live: true,
    };
  }
  return { sailings: fallbackSailings(), live: false };
}

interface WsfSpaceResponse {
  DepartingSpaces: {
    Departure: string;
    SpaceForArrivalTerminals: { DriveUpSpaceCount: number | null }[];
  }[];
}

interface WsfWaitTimeResponse {
  WaitTimes: { RouteID: number | null; WaitTimeNotes: string | null }[];
}

/**
 * Live drive-up space for the next departure plus staff-entered wait notes.
 * Ed-King has no vehicle reservations, so drive-up space is the number that
 * matters. DriveUpSpaceCount can be -1/null when unavailable.
 */
export async function getTerminalStatus(
  terminal: keyof typeof TERMINAL_IDS,
): Promise<TerminalStatus> {
  const base: TerminalStatus = {
    terminal,
    alerts: [],
    live: false,
    asOf: new Date().toISOString(),
  };

  const [space, waits] = await Promise.all([
    wsfFetch<WsfSpaceResponse>(`${TERMINALS_BASE}/terminalsailingspace/${TERMINAL_IDS[terminal]}`, 60),
    wsfFetch<WsfWaitTimeResponse>(`${TERMINALS_BASE}/terminalwaittimes/${TERMINAL_IDS[terminal]}`, 300),
  ]);
  if (!space) return base;

  const count = space.DepartingSpaces?.[0]?.SpaceForArrivalTerminals?.[0]?.DriveUpSpaceCount;
  const waitNote =
    waits?.WaitTimes?.find((w) => w.RouteID === ED_KING_ROUTE_ID && w.WaitTimeNotes)
      ?.WaitTimeNotes ?? undefined;
  return {
    ...base,
    live: true,
    driveUpSpaces: typeof count === "number" && count >= 0 ? count : undefined,
    waitEstimate: waitNote ?? undefined,
  };
}

interface WsfAlert {
  AlertFullTitle: string;
  AllRoutesFlag: boolean;
  AffectedRouteIDs: number[] | null;
}

/** Current WSF service alerts affecting the Edmonds–Kingston route. */
export async function getRouteAlerts(): Promise<string[]> {
  const alerts = await wsfFetch<WsfAlert[]>(`${SCHEDULE_BASE}/alerts`, 300);
  if (!alerts) return [];
  return alerts
    .filter((a) => a.AllRoutesFlag || a.AffectedRouteIDs?.includes(ED_KING_ROUTE_ID))
    .map((a) => a.AlertFullTitle);
}
