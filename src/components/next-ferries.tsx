"use client";

// Live "Next Ferries" module for the Edmonds–Kingston car ferry — the home page's
// hero widget. Per direction it shows the delay, the next couple of sailings with
// a live countdown and open car spots, plus a service-alert banner and a
// boarding-pass indicator, and expands to the full day's times.
//
// Receives server-fetched data as props (so it renders instantly and works
// without JS), then polls /api/ferry/status every 60s and ticks the countdown
// every 20s. Pauses polling while the tab is hidden.
//
// `tone` themes it for its surroundings: "light" = a white card (the original
// look, kept for reuse on pale backgrounds); "dark" = bare, light-on-navy so it
// lives inside the hero's blue live-strip. All colors flow from the THEME map so
// the two variants never drift.

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatPacificTime } from "@/lib/time";

interface Sailing {
  direction: "to-kingston" | "from-kingston";
  departs: string;
  vessel?: string;
}
interface SailingSpace {
  departs: string;
  vessel: string;
  driveUpSpaces: number | null;
  maxSpaces: number | null;
}
export interface FerryStatus {
  carFerry: { sailings: Sailing[]; live: boolean };
  alerts: string[];
  delays: { toKingston: number | null; fromKingston: number | null };
  sailingSpace: { kingston: SailingSpace[]; edmonds: SailingSpace[] };
  boardingPass: { active: boolean; reason: string };
}

type Tone = "light" | "dark";

// Every color the widget uses, per tone. Layout classes stay inline in the JSX;
// only the palette lives here, so "light" and "dark" render identically in
// structure and can never fall out of sync.
const THEME: Record<
  Tone,
  {
    root: string;
    heading: string;
    live: string;
    liveDot: string;
    link: string;
    boarding: string;
    alert: string;
    dirLabel: string;
    delayLate: string;
    delayOnTime: string;
    spotsFull: string;
    spotsLow: string;
    spotsPlenty: string;
    time: string;
    countdown: string;
    done: string;
    expander: string;
    note: string;
    noteLink: string;
  }
> = {
  light: {
    root: "rounded-2xl border border-sand bg-white p-5 shadow-[0_1px_3px_rgba(22,64,94,0.08)]",
    heading: "text-sound-deep",
    live: "bg-fern/10 text-fern",
    liveDot: "bg-fern",
    link: "text-tide-deep hover:text-sound",
    boarding: "bg-coral/10 text-coral-deep",
    alert: "bg-amber-50 text-amber-900",
    dirLabel: "text-sound-deep",
    delayLate: "bg-coral/15 text-coral-deep",
    delayOnTime: "bg-fern/10 text-fern",
    spotsFull: "bg-coral/15 text-coral-deep",
    spotsLow: "bg-amber-100 text-amber-800",
    spotsPlenty: "bg-fern/10 text-fern",
    time: "text-ink",
    countdown: "text-ink-soft",
    done: "text-ink-soft",
    expander: "text-tide-deep hover:text-sound",
    note: "text-ink-soft",
    noteLink: "underline",
  },
  dark: {
    root: "",
    heading: "text-white",
    live: "bg-fern/25 text-white",
    liveDot: "bg-fern",
    link: "text-seaglass hover:text-white",
    boarding: "bg-coral/25 text-white",
    alert: "bg-amber-300/15 text-amber-100",
    dirLabel: "text-white",
    delayLate: "bg-coral text-white",
    delayOnTime: "bg-fern/25 text-white",
    spotsFull: "bg-coral text-white",
    spotsLow: "bg-amber-300/25 text-amber-100",
    spotsPlenty: "bg-fern/30 text-white",
    time: "text-white",
    countdown: "text-seaglass",
    done: "text-white/70",
    expander: "text-seaglass hover:text-white",
    note: "text-seaglass/80",
    noteLink: "text-white underline",
  },
};

type Theme = (typeof THEME)[Tone];

const POLL_MS = 60_000;
const TICK_MS = 20_000;

function countdown(iso: string, now: number): string {
  const mins = Math.round((Date.parse(iso) - now) / 60_000);
  if (mins <= 0) return "now";
  if (mins < 60) return `in ${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `in ${h} hr ${m} min` : `in ${h} hr`;
}

/** Match a sailing to its open-space record by nearest departure time (±3 min). */
function spaceFor(space: SailingSpace[], departs: string): SailingSpace | undefined {
  const t = Date.parse(departs);
  let best: SailingSpace | undefined;
  let bestDiff = 3 * 60_000;
  for (const s of space) {
    const diff = Math.abs(Date.parse(s.departs) - t);
    if (diff < bestDiff) {
      best = s;
      bestDiff = diff;
    }
  }
  return best;
}

function SpotsBadge({ space, t }: { space?: SailingSpace; t: Theme }) {
  if (!space || space.driveUpSpaces === null) return null;
  const n = space.driveUpSpaces;
  const tone = n === 0 ? t.spotsFull : n < 20 ? t.spotsLow : t.spotsPlenty;
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${tone}`}>
      {n === 0 ? "Boat full" : `${n} car spots`}
    </span>
  );
}

function DirectionColumn({
  label,
  sailings,
  space,
  delayMin,
  now,
  expanded,
  t,
}: {
  label: string;
  sailings: Sailing[];
  space: SailingSpace[];
  delayMin: number | null;
  now: number;
  expanded: boolean;
  t: Theme;
}) {
  const upcoming = sailings
    .filter((s) => Date.parse(s.departs) > now - 90_000)
    .sort((a, b) => Date.parse(a.departs) - Date.parse(b.departs));
  const shown = expanded ? upcoming : upcoming.slice(0, 2);

  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-center justify-between gap-2">
        <p className={`font-nav text-sm font-semibold tracking-wide uppercase ${t.dirLabel}`}>
          → {label}
        </p>
        {delayMin !== null && delayMin >= 5 && (
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${t.delayLate}`}>
            ~{delayMin} min late
          </span>
        )}
        {delayMin !== null && delayMin < 5 && (
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${t.delayOnTime}`}>
            On time
          </span>
        )}
      </div>
      {shown.length === 0 ? (
        <p className={`mt-2 text-sm ${t.done}`}>Done for today</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {shown.map((s) => (
            <li key={s.departs} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className={`text-lg font-semibold ${t.time}`}>{formatPacificTime(s.departs)}</span>
              <span className={`text-sm ${t.countdown}`}>· {countdown(s.departs, now)}</span>
              <SpotsBadge space={spaceFor(space, s.departs)} t={t} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function NextFerries({
  initial,
  tone = "light",
}: {
  initial: FerryStatus;
  tone?: Tone;
}) {
  const t = THEME[tone];
  const [data, setData] = useState<FerryStatus>(initial);
  const [now, setNow] = useState(() => Date.now());
  const [expanded, setExpanded] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), TICK_MS);
    async function refresh() {
      try {
        const res = await fetch("/api/ferry/status");
        if (res.ok) {
          const json = (await res.json()) as FerryStatus;
          setData(json);
          setNow(Date.now());
        }
      } catch {
        // keep last-known data on a failed poll
      }
    }
    function startPoll() {
      if (pollRef.current) return;
      pollRef.current = setInterval(refresh, POLL_MS);
    }
    function stopPoll() {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }
    function onVisibility() {
      if (document.hidden) stopPoll();
      else {
        refresh();
        startPoll();
      }
    }
    startPoll();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(tick);
      stopPoll();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <div className={t.root}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className={`font-display text-lg font-semibold ${t.heading}`}>Next ferries</h2>
          {data.carFerry.live && (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${t.live}`}
            >
              <span className={`h-1.5 w-1.5 animate-pulse rounded-full ${t.liveDot}`} /> Live
            </span>
          )}
        </div>
        <Link
          href="/ferry"
          className={`text-sm font-semibold underline decoration-seaglass underline-offset-2 ${t.link}`}
        >
          Full schedule →
        </Link>
      </div>

      {data.boardingPass.active && (
        <div className={`mt-3 rounded-lg px-3 py-2 text-sm ${t.boarding}`}>
          🚗 <span className="font-semibold">Vehicle boarding pass in effect.</span> Drivers: get in
          the SR-104 line and take a pass — don&apos;t drive straight to the dock.
        </div>
      )}

      {data.alerts.length > 0 && (
        <div className={`mt-3 space-y-1 rounded-lg px-3 py-2 text-sm ${t.alert}`}>
          {data.alerts.slice(0, 3).map((a, i) => (
            <p key={i}>⚠️ {a}</p>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:gap-8">
        <DirectionColumn
          label="Edmonds"
          sailings={data.carFerry.sailings.filter((s) => s.direction === "from-kingston")}
          space={data.sailingSpace.kingston}
          delayMin={data.delays.fromKingston}
          now={now}
          expanded={expanded}
          t={t}
        />
        <DirectionColumn
          label="Kingston"
          sailings={data.carFerry.sailings.filter((s) => s.direction === "to-kingston")}
          space={data.sailingSpace.edmonds}
          delayMin={data.delays.toKingston}
          now={now}
          expanded={expanded}
          t={t}
        />
      </div>

      <button
        onClick={() => setExpanded((v) => !v)}
        className={`mt-4 text-sm font-medium ${t.expander}`}
        aria-expanded={expanded}
      >
        {expanded ? "Show fewer times ▴" : "More times today ▾"}
      </button>

      {!data.carFerry.live && (
        <p className={`mt-2 text-xs ${t.note}`}>
          Schedule times, not live status — confirm at{" "}
          <a
            href="https://wsdot.wa.gov/travel/washington-state-ferries"
            target="_blank"
            rel="noopener noreferrer"
            className={t.noteLink}
          >
            wsdot.wa.gov/ferries
          </a>
          .
        </p>
      )}
    </div>
  );
}
