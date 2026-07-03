// Kitsap Transit Kingston–Seattle passenger-only fast ferry (routes 401/404).
//
// Times below were extracted from Kitsap Transit's official GTFS feed
// (https://pride.kitsaptransit.com/gtfs/google_transit.zip, feed S1000066,
// valid 2026-06-14 → 2026-09-12). The feed turns over seasonally — refresh
// these when the fall schedule drops, or wire up the GTFS ingest job in
// docs/DATA_SOURCES.md. Live boat positions: https://kttracker.com/map?routes=401,404

import type { Sailing } from "./types";
import { pacificWallTimeToISO, todayPacific } from "./time";

const CROSSING_MINUTES = 39;

const WEEKDAY_FROM_KINGSTON = ["05:25", "07:05", "08:45", "14:30", "16:10", "17:55"];
const WEEKDAY_FROM_SEATTLE = ["06:15", "07:55", "10:45", "15:20", "17:00", "18:45"];
// Saturday service runs summer season only (roughly May–September).
const SATURDAY_FROM_KINGSTON = ["09:20", "11:00", "12:45", "14:25", "17:20", "19:05", "20:45", "22:25"];
const SATURDAY_FROM_SEATTLE = ["10:10", "11:50", "13:35", "16:25", "18:15", "19:55", "21:35", "23:10"];

export const FAST_FERRY_FACTS = {
  /** Direction-based fares surprise visitors — call this out prominently. */
  fares:
    "$2.00 to Seattle, $13.00 coming back (about $15 round trip). Youth 18 and under ride free. ORCA, contactless credit/debit tap, cash, or the Transit GO Ticket app.",
  seattleTerminal:
    "Pier 50 (801 Alaskan Way) — the small passenger-only dock just north of the big WSF Colman Dock, shared with the King County Water Taxi.",
  kingstonTerminal:
    "Kingston ferry dock at the foot of Washington Blvd, right beside the car-ferry holding lanes.",
  boarding:
    "Walk-on only, first-come first-served (350-seat MV Finest). Arrive 10 minutes early; no reservations on the Kingston route. Bikes welcome.",
  noSundayService: "No fast-ferry service on Sundays — take the Edmonds–Kingston car ferry instead.",
  trackerUrl: "https://kttracker.com/map?routes=401,404",
  scheduleUrl: "https://www.kitsaptransit.com/service/fast-ferry/kingston-fast-ferry",
} as const;

function pacificParts(): { dow: number; month: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    weekday: "short",
    month: "numeric",
  }).formatToParts(new Date());
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "Sun";
  const month = Number(parts.find((p) => p.type === "month")?.value ?? "1");
  return { dow: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday), month };
}

function addMinutes(dateStr: string, hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const hh = String(Math.floor(total / 60) % 24).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return pacificWallTimeToISO(dateStr, `${hh}:${mm}`);
}

/**
 * Today's fast-ferry sailings from the bundled GTFS-derived schedule.
 * Empty on Sundays and on Saturdays outside the summer season.
 */
export function getFastFerrySailings(): { sailings: Sailing[]; live: boolean } {
  const { dow, month } = pacificParts();
  const today = todayPacific();

  let fromKingston: string[] = [];
  let fromSeattle: string[] = [];
  if (dow >= 1 && dow <= 5) {
    fromKingston = WEEKDAY_FROM_KINGSTON;
    fromSeattle = WEEKDAY_FROM_SEATTLE;
  } else if (dow === 6 && month >= 5 && month <= 9) {
    fromKingston = SATURDAY_FROM_KINGSTON;
    fromSeattle = SATURDAY_FROM_SEATTLE;
  }

  const build = (times: string[], direction: Sailing["direction"]): Sailing[] =>
    times.map((t) => ({
      route: "kingston-seattle-fast" as const,
      direction,
      departs: pacificWallTimeToISO(today, t),
      arrives: addMinutes(today, t, CROSSING_MINUTES),
    }));

  return {
    sailings: [...build(fromSeattle, "to-kingston"), ...build(fromKingston, "from-kingston")],
    live: false,
  };
}
