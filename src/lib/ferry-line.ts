// Where to send drivers when the SR-104 vehicle boarding-pass system is ON.
//
// The destination is NOT the dock — it's the staging point at the end of the
// SR-104 holding line, given by the Chamber. Just handing Google the point,
// though, lets it route a driver in from the wrong side and U-turn straight
// into the line. So the route is FORCED through a turnaround road as a
// waypoint, sized to how long the line is:
//   - normal wait (≤ 2 hr): via Barber Cutoff Rd — the line ends around here.
//   - wait OVER 2 hr: the line backs up PAST Barber Cutoff, so the loop has to
//     go further out to Miller Bay Rd (George's Corner).
// Either way everyone comes down SR 104 from the west into the back of the
// line — no mid-highway U-turn.

/** End of the SR-104 ferry holding line — the navigate destination when a pass is required. */
export const FERRY_LINE_STAGING = { lat: 47.8036774, lng: -122.506024 } as const;

/** SR 104 & NE Barber Cutoff Rd — the turnaround/approach for a normal (≤2 hr) line. */
export const FERRY_LINE_APPROACH_BARBER = { lat: 47.8085, lng: -122.518 } as const;

/** NE Miller Bay Rd near SR 104 (George's Corner) — the turnaround once the line tops 2 hr. */
export const FERRY_LINE_APPROACH_MILLER = { lat: 47.80955, lng: -122.54155 } as const;

const HOUR_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
};

/**
 * Largest wait, in hours, mentioned in a WSDOT staff wait note
 * (e.g. "Two Hour Wait for Drivers", "3-hour wait", "2+ hour"), or null.
 */
export function parseWaitHours(note: string | undefined | null): number | null {
  if (!note) return null;
  const t = note.toLowerCase();
  let max: number | null = null;
  const bump = (n: number) => {
    if (max === null || n > max) max = n;
  };
  // digit form: "2 hour", "2-hour", "2.5 hour", "2+ hour" (the + nudges it over 2)
  for (const m of t.matchAll(/(\d+(?:\.\d+)?)\s*(\+)?\s*-?\s*hour/g)) {
    bump(parseFloat(m[1]) + (m[2] ? 0.1 : 0));
  }
  // word form: "two hour", "three-hour"
  for (const [w, n] of Object.entries(HOUR_WORDS)) {
    if (new RegExp(`\\b${w}[\\s-]?hour`).test(t)) bump(n);
  }
  return max;
}

/**
 * True when the SR-104 line has backed up PAST Barber Cutoff — i.e. the driver
 * wait is over 2 hours. That's the only time drivers should route via Miller
 * Bay Rd instead of Barber Cutoff.
 */
export function lineBacksPastBarberCutoff(waitNote: string | undefined | null): boolean {
  const hours = parseWaitHours(waitNote);
  return hours !== null && hours > 2;
}

/**
 * Google Maps driving directions to the ferry line staging point, forced
 * through the turnaround road so drivers never U-turn into the line early.
 * `longWait` = the line is past Barber Cutoff (wait > 2 hr) → route via Miller
 * Bay Rd; otherwise via Barber Cutoff. No API key — one waypoint.
 */
export function ferryLineNavUrl(longWait = false): string {
  const via = longWait ? FERRY_LINE_APPROACH_MILLER : FERRY_LINE_APPROACH_BARBER;
  const params = new URLSearchParams({
    api: "1",
    destination: `${FERRY_LINE_STAGING.lat},${FERRY_LINE_STAGING.lng}`,
    waypoints: `${via.lat},${via.lng}`,
    travelmode: "driving",
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
