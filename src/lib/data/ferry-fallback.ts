// Bundled Edmonds–Kingston schedule used when no WSDOT_API_KEY is set.
// APPROXIMATE seasonal times — the UI labels this data "not live" and links
// to wsdot.wa.gov/ferries for confirmation. With an API key configured,
// src/lib/wsf.ts serves the real schedule instead and this file is unused.

import type { Sailing } from "../types";
import { pacificWallTimeToISO, todayPacific } from "../time";

// Typical two-boat summer service, ~50 minute headways, ~30 minute crossing.
const FROM_KINGSTON = [
  "04:45", "05:35", "06:25", "07:15", "08:00", "08:50", "09:40", "10:30",
  "11:20", "12:10", "13:00", "13:50", "14:40", "15:30", "16:20", "17:10",
  "18:00", "18:50", "19:40", "20:30", "21:20", "22:10", "23:00",
];

const FROM_EDMONDS = [
  "05:10", "06:00", "06:50", "07:40", "08:25", "09:15", "10:05", "10:55",
  "11:45", "12:35", "13:25", "14:15", "15:05", "15:55", "16:45", "17:35",
  "18:25", "19:15", "20:05", "20:55", "21:45", "22:35", "23:25",
];

const CROSSING_MINUTES = 30;

function addMinutes(dateStr: string, hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const hh = String(Math.floor(total / 60) % 24).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return pacificWallTimeToISO(dateStr, `${hh}:${mm}`);
}

export function fallbackSailings(): Sailing[] {
  const today = todayPacific();
  const build = (times: string[], direction: Sailing["direction"]): Sailing[] =>
    times.map((t) => ({
      route: "edmonds-kingston" as const,
      direction,
      departs: pacificWallTimeToISO(today, t),
      arrives: addMinutes(today, t, CROSSING_MINUTES),
      notes: "Approximate seasonal time — confirm with WSDOT",
    }));
  return [
    ...build(FROM_EDMONDS, "to-kingston"),
    ...build(FROM_KINGSTON, "from-kingston"),
  ];
}
