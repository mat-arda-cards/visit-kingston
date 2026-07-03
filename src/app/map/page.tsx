import type { Metadata } from "next";
import { getMapViews } from "@/lib/stores/map-store";
import { PageHeader, Section } from "@/components/ui";
import { MapSwitcher } from "./switcher";

export const metadata: Metadata = {
  title: "Map",
  description:
    "Interactive maps of Kingston, WA — food and drink, parking and cash, trails, and more, all walkable from the Edmonds–Kingston ferry.",
};

export const revalidate = 60;

export default async function MapPage() {
  const views = (await getMapViews())
    .filter((v) => v.published)
    .map((v) => ({ id: v.id, name: v.name, description: v.description }));

  return (
    <>
      <PageHeader
        eyebrow="Get your bearings"
        title="Kingston, mapped"
        intro="Pick a layer — where to eat, where to park, what to explore — and see it all on one map of downtown Kingston."
      />

      <Section>
        <MapSwitcher views={views} />
      </Section>
    </>
  );
}
