// Kingston runs on Pacific time; the server may not.
// These helpers keep all wall-clock math anchored to America/Los_Angeles.

const TZ = "America/Los_Angeles";

/** Today's date in Kingston as "YYYY-MM-DD". */
export function todayPacific(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
}

/** Convert a Pacific wall time ("YYYY-MM-DD", "HH:mm") to a real ISO instant. */
export function pacificWallTimeToISO(dateStr: string, hhmm: string): string {
  // Find the UTC offset in effect on that date (handles PDT vs PST).
  const probe = new Date(`${dateStr}T12:00:00Z`);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    timeZoneName: "longOffset",
  }).formatToParts(probe);
  const offset =
    parts.find((p) => p.type === "timeZoneName")?.value.replace("GMT", "") || "-08:00";
  return `${dateStr}T${hhmm}:00${offset}`;
}

/** Format an ISO instant as a Kingston wall-clock time, e.g. "2:35 PM". */
export function formatPacificTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** Format an ISO instant as a Kingston date, e.g. "Thu, Jul 2". */
export function formatPacificDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}
