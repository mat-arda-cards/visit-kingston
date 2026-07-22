import {
  KioskMap,
  KioskMapLegend,
  numberPoints,
  FERRY_DOCK,
  type KioskMapPoint,
} from "@/components/kiosk-map";
import { KioskQr } from "@/components/kiosk-qr";
import { KioskCard, KioskEmpty, KioskScreen } from "@/components/kiosk-ui";
import { resolveMapView } from "@/lib/map/resolve";
import { kioskHandoffUrl } from "@/lib/qr";
import { walkMinutesFromDock } from "@/lib/geo";
import { getRestaurants } from "@/lib/stores/business-store";
import { getParkingZones } from "@/lib/stores/parking-store";
import { copyText, getCopyOverrides } from "@/lib/stores/site-store";

// "Where things are", kiosk-scaled: a real, visible map — drawn by us.
//
// It is NOT Leaflet, and that is a deliberate deviation from the charter, which
// says to reuse <FeatureMap/> read-only. See src/components/kiosk-map.tsx for
// the full reasoning; briefly, a slippy map on this device fails three ways —
// tiles go grey the moment the venue Wi-Fi hiccups (offline tile packs are an
// explicit non-goal), Leaflet's OSM attribution is a genuine external anchor on
// a panel with no back button, and it is a client bundle doing continuous
// canvas work on a fanless mini PC.
//
// So the map is an SVG projected from the SAME coordinates the website's map
// uses. No tiles, no network, no attribution, nothing tappable — it simply
// cannot break when the network does. It answers "what is near what, and how
// far", which is the orientation question a walk-up visitor actually has.
// Street-level detail and the visitor's own position stay one QR away, on the
// device with a GPS in it.

export const revalidate = 60;

/** The seed view carrying the town's landmarks. */
const EXPLORE_VIEW = "explore";

/**
 * Everything worth drawing, as map points.
 *
 * Kept to a TIGHT walkable radius on purpose, and the number came from looking
 * at a render rather than from taste. At 1.2km the Village Green sits far
 * enough north that the whole downtown — where every walk-up visitor actually
 * is — collapsed into a huddle at the bottom of a mostly empty frame. Half a
 * kilometre is about a six-minute walk and fills the map with the places
 * somebody stepping off the boat can actually reach. Anything beyond it is
 * still listed under "Worth finding" below; it just does not distort the map.
 */
const WALKABLE_KM = 0.55;

function kmFromDock([lat, lng]: [number, number]): number {
  const dLat = (lat - FERRY_DOCK[0]) * 111;
  const dLng = (lng - FERRY_DOCK[1]) * 111 * Math.cos((lat * Math.PI) / 180);
  return Math.hypot(dLat, dLng);
}

export default async function KioskMapPage() {
  const [explore, restaurants, zones, copy] = await Promise.all([
    resolveMapView(EXPLORE_VIEW).catch(() => null),
    getRestaurants(),
    getParkingZones().catch(() => []),
    getCopyOverrides(),
  ]);

  // Marker features only: a trail line or an area polygon has no single "walk
  // to this" answer, and this screen is a list of destinations.
  const landmarks = (explore?.features ?? []).filter((f) => f.kind === "marker").slice(0, 10);

  const nearest = restaurants
    .filter((r) => !r.hidden)
    .sort((a, b) => a.walkMinutesFromFerry - b.walkMinutesFromFerry)
    .slice(0, 4);

  // ONE walk-time method across this whole screen, deliberately. src/lib/geo.ts
  // warns not to mix its straight-line estimate with the hand-calibrated
  // street-distance walkMinutesFromFerry figures in restaurants.ts — two
  // numbers for the same walk, disagreeing, on one panel. The legend covers
  // restaurants AND parking AND landmarks, and only geo.ts can answer for all
  // three, so it wins and every figure is rendered with a "~".
  const withWalk = (at: [number, number]) => walkMinutesFromDock(at[0], at[1]);

  const points: KioskMapPoint[] = [
    { id: "dock", label: "You are here", at: FERRY_DOCK as [number, number], kind: "you-are-here" },
    ...nearest.map((r) => ({
      id: `eat-${r.id}`,
      label: r.name,
      at: [r.lat, r.lng] as [number, number],
      kind: "food" as const,
      walkMinutes: withWalk([r.lat, r.lng]),
    })),
    ...zones
      .filter((z) => Array.isArray(z.center) && kmFromDock(z.center) <= WALKABLE_KM)
      .slice(0, 3)
      .map((z) => ({
        id: `park-${z.id}`,
        label: z.name,
        at: z.center,
        kind: "parking" as const,
        walkMinutes: withWalk(z.center),
      })),
    ...landmarks
      .filter((f) => Array.isArray(f.point) && kmFromDock(f.point as [number, number]) <= WALKABLE_KM)
      .slice(0, 3)
      .map((f) => ({
        id: `place-${f.id}`,
        label: f.title,
        at: f.point as [number, number],
        kind: "place" as const,
        walkMinutes: withWalk(f.point as [number, number]),
      })),
  ];
  const numbered = numberPoints(points);

  return (
    <KioskScreen title="Getting around" subtitle="You are at the Kingston ferry terminal">
      {/* The map itself, first — it is what the screen is for. */}
      <div className="mb-10">
        <KioskMap points={numbered} />
        <KioskMapLegend points={numbered} />
        <p className="mt-6 text-2xl text-white/60">
          Roughly to scale — pins that sit almost on top of each other are nudged apart so the
          numbers stay readable. No streets, and walk times are straight-line. Scan below for the
          real map with directions.
        </p>
      </div>

      <div className="mb-10 flex items-center gap-10 rounded-3xl bg-white/10 p-10">
        <KioskQr
          value={kioskHandoffUrl("/map")}
          caption={copyText(copy, "kiosk.handoff.prompt")}
          size="sm"
        />
        <p className="text-3xl leading-relaxed text-white/85">
          The full interactive map, with your own position on it, on your phone.
        </p>
      </div>

      {/* NO second walk-time list here. There was one, reading
          restaurant.walkMinutesFromFerry, and it had to go: the legend above
          already answers "how far", and those two figures come from different
          methods — hand-calibrated street distance versus geo.ts's
          straight-line estimate. Two numbers for the same walk, disagreeing,
          twenty pixels apart on a public panel. src/lib/geo.ts says plainly not
          to mix them on one screen, and it is right. */}

      <h2 className="mb-6 text-4xl font-semibold text-white/80">Worth finding</h2>
      {landmarks.length === 0 ? (
        <KioskEmpty>
          The landmark list is briefly unavailable — scan the code above for the full map.
        </KioskEmpty>
      ) : (
        landmarks.map((f) => <KioskCard key={f.id} title={f.title} body={f.notes} />)
      )}
    </KioskScreen>
  );
}
