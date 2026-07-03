import type { Metadata } from "next";
import Link from "next/link";
import { itineraries } from "@/lib/data/itineraries";
import { Badge, Card, PageHeader, Section } from "@/components/ui";

export const metadata: Metadata = {
  title: "Itineraries",
  description:
    "Ready-made Kingston days: walk-on wanders, family beach days, rainy-day plans, and the road to Olympic National Park.",
};

const modeLabels: Record<string, { label: string; tone: "green" | "navy" | "teal" }> = {
  "walk-on": { label: "No car needed", tone: "green" },
  car: { label: "Bring the car", tone: "navy" },
  either: { label: "Car optional", tone: "teal" },
};

export default function ItinerariesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Plan your day"
        title="Itineraries"
        intro="Four ready-made Kingston days, built around real ferry arrivals and real local spots. Steal one whole or mix and match — everything downtown is within a few blocks of the dock."
      />
      <Section>
        <div className="grid gap-4 sm:grid-cols-2">
          {itineraries.map((it) => {
            const mode = modeLabels[it.mode];
            return (
              <Link
                key={it.slug}
                href={`/itineraries/${it.slug}`}
                className="group block h-full"
              >
                <Card className="flex h-full flex-col transition-shadow group-hover:shadow-[0_4px_12px_rgba(22,64,94,0.15)]">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="coral">{it.duration}</Badge>
                    <Badge tone={mode.tone}>{mode.label}</Badge>
                  </div>
                  <h3 className="mt-3 text-xl font-semibold text-sound-deep group-hover:text-tide-deep">
                    {it.title}
                  </h3>
                  <p className="mt-2 flex-1 text-sm text-ink-soft">{it.tagline}</p>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {it.audience.map((tag) => (
                      <Badge key={tag} tone="sand">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <p className="mt-4 text-sm font-semibold text-tide-deep">
                    {it.stops.length} stops → See the plan
                  </p>
                </Card>
              </Link>
            );
          })}
        </div>
      </Section>
    </>
  );
}
