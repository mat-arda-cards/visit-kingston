// Seed map views. Admin edits overlay these in .data/stores/map-views.json.
// Coordinates center on downtown Kingston (ferry dock ≈ 47.7966,-122.4958).

import type { MapView } from "../map/types";

export const mapViews: MapView[] = [
  {
    id: "food-drink",
    name: "Food & Drink",
    description:
      "Every place to eat and drink in downtown Kingston, pulled live from the restaurant listings.",
    center: [47.799, -122.4985],
    zoom: 16,
    sources: ["restaurants"],
    published: true,
  },
  {
    id: "parking-cash",
    name: "Parking & Cash",
    description: "Parking zones, the street-parking overlay, and every ATM near the dock.",
    center: [47.7985, -122.4975],
    zoom: 15,
    sources: ["parking-zones", "streets", "atms"],
    published: true,
  },
  {
    id: "explore",
    name: "Explore Kingston",
    description:
      "Beaches, viewpoints, parks, art, and local landmarks — the Chamber's curated map of things to see.",
    center: [47.799, -122.497],
    zoom: 15,
    sources: [],
    published: true,
  },
  {
    id: "trails",
    name: "Trails & Walks",
    description: "Walking routes and trails around Kingston and the North Kitsap Heritage area.",
    center: [47.8, -122.5],
    zoom: 14,
    sources: [],
    published: true,
  },
];
