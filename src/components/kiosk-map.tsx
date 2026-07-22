import { KINGSTON_FERRY_DOCK } from "@/lib/geo";

// A VISIBLE map for the kiosk, drawn from our own coordinates as an SVG.
//
// WHY NOT LEAFLET, which is what the website uses. Three things rule a slippy
// map out on this specific device, and all three are properties of the kiosk
// rather than opinions about Leaflet:
//
//   1. Tiles come off the network per pan and zoom, and offline tile packs are
//      an explicit non-goal. The first thing anyone does to a map is drag it —
//      straight into grey squares the moment the venue Wi-Fi hiccups, on the
//      one screen whose entire job is orientation.
//   2. Leaflet's attribution control is a real anchor to openstreetmap.org,
//      rendered client-side where the no-external-anchors test cannot see it.
//      Removing it would breach the tile licence; leaving it puts a tappable
//      way off-app on a panel with no back button.
//   3. It is a client bundle plus continuous canvas work on a fanless mini PC
//      that runs twelve hours a day.
//
// NUMBERED PINS, NOT LABELS — and that is the whole design, learned from a
// screenshot rather than reasoned about. The first version drew each place name
// beside its dot. Rendered at the real 1080x1920 and looked at, downtown
// Kingston collapsed into an illegible pile: "The Kingston Ale House", "J'aime
// Les Crêpes" and two parking rows all overlapping inside about forty pixels,
// because these places genuinely are metres apart. No amount of label nudging
// fixes points that close. Numbering the pins and putting the names in a legend
// underneath makes collision STRUCTURALLY IMPOSSIBLE, and the legend reads
// better from a distance than scattered map text ever did.
//
// What this is NOT: a substitute for a real map. It has no streets and no
// coastline, so it answers "what is near what, and how far" rather than "which
// turning do I take". The interactive map with the visitor's own position on it
// stays one QR away, on the device that has a GPS in it.

export interface KioskMapPoint {
  id: string;
  label: string;
  /** [lat, lng] */
  at: [number, number];
  kind: "you-are-here" | "food" | "parking" | "place";
  /** Straight-line walk estimate, minutes. Absent for the dock itself. */
  walkMinutes?: number;
}

export { KINGSTON_FERRY_DOCK as FERRY_DOCK };

/** Stage-space width. Height is derived from the data, see below. */
const W = 960;
const MIN_H = 380;
const MAX_H = 700;
const PAD = 70;

const KIND_FILL: Record<KioskMapPoint["kind"], string> = {
  // Solid brand colours, not tints: these sit on the navy stage where a tint
  // would drop under AA, the same arithmetic E14/E15 fixed across the palette.
  "you-are-here": "#ffffff",
  food: "#a85c28",
  parking: "#1e96c0",
  place: "#4a7c59",
};

export interface PlacedPoint extends KioskMapPoint {
  /** 1-based number shown on the pin and in the legend. Undefined for the dock. */
  n?: number;
}

/**
 * Project lat/lng into an SVG box sized to the data.
 *
 * Longitude is corrected by cos(latitude): at Kingston's latitude a degree of
 * longitude is about 0.67 of a degree of latitude, and without it the town
 * comes out visibly stretched east-west.
 *
 * ONE scale serves both axes, never two. Fitting each axis independently is the
 * classic way a hand-rolled map ends up lying about distance — the town would
 * stretch to fill the box and "ten minutes that way" would look like two.
 *
 * The HEIGHT is then derived from the data's own aspect rather than fixed. The
 * first version hard-coded 760px tall, and because Kingston's points run mostly
 * north-south in a tight cluster the result was a small huddle of dots marooned
 * in a large empty rectangle. Sizing the box to the points removes the void
 * without touching the scale, so distances stay honest.
 */
function layout(points: KioskMapPoint[]): { placed: { x: number; y: number }[]; height: number } {
  if (points.length === 0) return { placed: [], height: MIN_H };

  const lats = points.map((p) => p.at[0]);
  const lngs = points.map((p) => p.at[1]);
  const midLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const lngScale = Math.cos((midLat * Math.PI) / 180);

  const xs = lngs.map((lng) => lng * lngScale);
  const ys = lats.map((lat) => -lat); // screen y grows downward; north is up

  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const spanX = Math.max(...xs) - minX || 1e-9;
  const spanY = Math.max(...ys) - minY || 1e-9;

  // Fit the wider axis to the available width, then let height follow.
  const scale = (W - PAD * 2) / spanX;
  const height = Math.min(MAX_H, Math.max(MIN_H, spanY * scale + PAD * 2));
  // If the clamp bit, re-fit so nothing lands outside the box.
  const usable = height - PAD * 2;
  const finalScale = spanY * scale > usable ? Math.min(scale, usable / spanY) : scale;

  const offsetX = (W - spanX * finalScale) / 2;
  const offsetY = (height - spanY * finalScale) / 2;

  const placed = points.map((_, i) => ({
    x: (xs[i] - minX) * finalScale + offsetX,
    y: (ys[i] - minY) * finalScale + offsetY,
  }));

  return { placed: spreadOverlaps(placed, points), height };
}

/** Pin radius plus breathing room — below this two pins read as one blob. */
const MIN_SEPARATION = 56;
/** Never move a pin further than this from its true position. */
const MAX_NUDGE = 46;

/**
 * Push overlapping pins apart, a little.
 *
 * Downtown Kingston's restaurants are genuinely metres apart, so at any scale
 * that also shows the dock their pins land on top of each other and the numbers
 * become unreadable — verified by looking at a render, not guessed. This is the
 * standard cartographic answer: displace the symbol slightly, keep the label
 * attached to it.
 *
 * Two honesty guards. The dock is PINNED — it is the one point a visitor
 * locates themselves by, so it never moves and everything else shifts around
 * it. And every other pin is clamped to MAX_NUDGE from where it really is, so a
 * pin can never drift far enough to imply the wrong side of the street. The
 * caption on the screen says "roughly to scale" for exactly this reason.
 */
function spreadOverlaps(
  placed: { x: number; y: number }[],
  points: KioskMapPoint[],
): { x: number; y: number }[] {
  const anchorIndex = points.findIndex((p) => p.kind === "you-are-here");
  const out = placed.map((p) => ({ ...p }));

  for (let pass = 0; pass < 60; pass++) {
    let moved = false;
    for (let i = 0; i < out.length; i++) {
      for (let j = i + 1; j < out.length; j++) {
        const dx = out[j].x - out[i].x;
        const dy = out[j].y - out[i].y;
        // Two pins at the identical spot have no direction to separate along;
        // nudge deterministically by index so the layout stays reproducible.
        const dist = Math.hypot(dx, dy) || 0.01;
        if (dist >= MIN_SEPARATION) continue;
        const push = (MIN_SEPARATION - dist) / 2;
        const ux = dist === 0.01 ? (j % 2 === 0 ? 1 : -1) : dx / dist;
        const uy = dist === 0.01 ? (j % 2 === 0 ? -1 : 1) : dy / dist;
        if (i !== anchorIndex) {
          out[i].x -= ux * push;
          out[i].y -= uy * push;
        }
        if (j !== anchorIndex) {
          out[j].x += ux * push;
          out[j].y += uy * push;
        }
        moved = true;
      }
    }
    if (!moved) break;
  }

  // Clamp the drift so no pin ends up somewhere it simply is not.
  return out.map((p, i) => {
    if (i === anchorIndex) return placed[i];
    const dx = p.x - placed[i].x;
    const dy = p.y - placed[i].y;
    const d = Math.hypot(dx, dy);
    if (d <= MAX_NUDGE) return p;
    return { x: placed[i].x + (dx / d) * MAX_NUDGE, y: placed[i].y + (dy / d) * MAX_NUDGE };
  });
}

/** Number the points for the legend — the dock is the anchor, not an entry. */
export function numberPoints(points: KioskMapPoint[]): PlacedPoint[] {
  let n = 0;
  return points.map((p) => (p.kind === "you-are-here" ? { ...p } : { ...p, n: ++n }));
}

export function KioskMap({ points }: { points: PlacedPoint[] }) {
  const { placed, height } = layout(points);

  return (
    <svg
      viewBox={`0 0 ${W} ${height}`}
      className="h-auto w-full rounded-3xl bg-sound"
      role="img"
      aria-label={`Sketch map of Kingston showing ${points.length - 1} places around the ferry terminal, numbered to match the list below`}
    >
      <rect width={W} height={height} fill="#22334d" />

      {/* The dock renders LAST so it sits on top of any neighbouring pin — it is
          the one marker a visitor must always be able to find. */}
      {[...points.keys()]
        .sort((a, b) => Number(points[a].kind === "you-are-here") - Number(points[b].kind === "you-are-here"))
        .map((i) => {
        const p = points[i];
        const at = placed[i];
        if (!at) return null;
        const isHere = p.kind === "you-are-here";
        const r = isHere ? 26 : 22;
        return (
          <g key={p.id}>
            {isHere && (
              <circle cx={at.x} cy={at.y} r={r + 12} fill="none" stroke="#ffffff" strokeWidth={5} />
            )}
            <circle
              cx={at.x}
              cy={at.y}
              r={r}
              fill={KIND_FILL[p.kind]}
              stroke="#22334d"
              strokeWidth={3}
            />
            {/* The number rides ON the pin, so it can never collide with a
                neighbour's text the way a place name did. */}
            {p.n !== undefined && (
              <text
                x={at.x}
                y={at.y + 8}
                textAnchor="middle"
                fontSize={24}
                fontWeight={700}
                fill="#ffffff"
              >
                {p.n}
              </text>
            )}
            {isHere && (
              // The only words on the map. Placed BELOW the dock and stroked
              // against the background: the dock is the southernmost point by
              // construction (everything else in town is inland of the ramp),
              // so the space under it is the one region no other pin occupies.
              // An earlier version put it beside the pin and it collided with a
              // neighbour's number the moment two places sat close together.
              <text
                x={at.x}
                y={at.y + r + 40}
                textAnchor="middle"
                fontSize={30}
                fontWeight={700}
                fill="#ffffff"
                stroke="#22334d"
                strokeWidth={8}
                paintOrder="stroke"
              >
                You are here
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/** The map's key — numbers to names, with an honest straight-line walk time. */
export function KioskMapLegend({ points }: { points: PlacedPoint[] }) {
  const entries = points.filter((p) => p.n !== undefined);
  return (
    <ul className="mt-6 grid grid-cols-2 gap-4">
      {entries.map((p) => (
        <li key={p.id} className="flex items-center gap-5 rounded-2xl bg-white/10 px-6 py-4">
          <span
            className="flex size-12 shrink-0 items-center justify-center rounded-full text-2xl font-semibold text-white"
            style={{ backgroundColor: KIND_FILL[p.kind] }}
            aria-hidden="true"
          >
            {p.n}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-2xl leading-snug font-semibold text-white">{p.label}</span>
            {p.walkMinutes !== undefined && (
              // "~" because this is straight-line distance and you cannot walk
              // through the marina — the same honesty the near-me surface uses.
              <span className="block text-xl text-white/70 tabular-nums">
                ~{p.walkMinutes} min walk
              </span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
