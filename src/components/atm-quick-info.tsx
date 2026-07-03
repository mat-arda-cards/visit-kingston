// Compact "cash near the ferry" callout with a one-tap Navigate button.
// Used up top on /ferry and on the home screen. Server component — the
// Navigate button is a plain Google Maps directions deep link (no API key).

import Link from "next/link";
import { atms, atmMeta } from "@/lib/data/atms";
import { mapDirectionsUrl } from "@/components/ui";

/** The nearest confirmed 24-hour ATM to the dock — the one worth navigating to. */
function primaryAtm() {
  const open24 = atms
    .filter((a) => atmMeta[a.id]?.open24h)
    .sort((a, b) => a.walkMinutesFromFerry - b.walkMinutesFromFerry);
  return open24[0] ?? atms[0];
}

export function AtmQuickInfo({ className = "" }: { className?: string }) {
  const atm = primaryAtm();
  const meta = atmMeta[atm.id];

  return (
    <div
      className={`rounded-2xl border border-sand bg-white p-5 shadow-[0_1px_3px_rgba(22,64,94,0.08)] ${className}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-lg font-semibold text-sound-deep">
            <span aria-hidden>💵</span> Need cash?
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            There&apos;s <span className="font-medium text-ink">no ATM at the ferry terminal</span>.
            The nearest 24-hour bank ATM is the{" "}
            <span className="font-medium text-ink">Bank of America drive-up</span> at Kingston Center
            — about a {atm.walkMinutesFromFerry}-minute walk uphill, or a{" "}
            {meta?.driveMinutes ?? 2}-minute drive.
          </p>
          <p className="mt-1.5 text-sm text-ink-soft">
            No fee, no walk: <span className="font-medium text-ink">Grocery Outlet</span> and Safeway
            give debit cash-back at the register.
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-stretch gap-1.5">
          <a
            href={mapDirectionsUrl(atm.address, "walking")}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-coral px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-coral-deep"
          >
            Navigate to the ATM →
          </a>
          <a
            href={mapDirectionsUrl(atm.address, "driving")}
            target="_blank"
            rel="noopener noreferrer"
            className="text-center text-xs font-medium text-tide-deep underline decoration-seaglass underline-offset-2 hover:text-sound"
          >
            or get driving directions
          </a>
        </div>
      </div>

      <p className="mt-3 border-t border-sand pt-3 text-xs text-ink-soft">
        Full cash, ATM, and ferry-payment rundown in the{" "}
        <Link
          href="/parking#atms"
          className="font-medium text-tide-deep underline decoration-seaglass underline-offset-2 hover:text-sound"
        >
          cash &amp; boarding guide
        </Link>
        .
      </p>
    </div>
  );
}
