// Seed custom map features. Admin edits/additions overlay these in
// .data/stores/map-features.json (and admins draw new ones at /admin/maps).
//
// These starter features show the shape of each kind; coordinates are
// approximate downtown Kingston landmarks the Chamber can nudge in the editor.

import type { MapFeature } from "../map/types";

export const mapFeatures: MapFeature[] = [
  {
    id: "mike-wallace-park",
    kind: "marker",
    title: "Mike Wallace Park & Marina",
    notes:
      "Waterfront park right by the ferry — lawn, boardwalk, and the Sunday Kingston Public Market (May–Oct).",
    category: "park",
    views: ["explore"],
    point: [47.7961, -122.4972],
    link: "https://www.google.com/maps/search/?api=1&query=Mike+Wallace+Park+Kingston+WA",
  },
  {
    id: "point-no-point",
    kind: "marker",
    title: "Point No Point Lighthouse",
    notes:
      "Puget Sound's oldest lighthouse (1879), driftwood beach, and a county park ~15 min north. Great tide-pooling at low tide.",
    category: "viewpoint",
    views: ["explore"],
    point: [47.9126, -122.5266],
    link: "https://www.google.com/maps/search/?api=1&query=Point+No+Point+Lighthouse",
  },
  {
    id: "village-green",
    kind: "marker",
    title: "Village Green Community Campus",
    notes: "Community center, library branch, and park — the town's living room, up the hill.",
    category: "park",
    views: ["explore"],
    point: [47.8016, -122.5],
  },
  {
    id: "waterfront-boardwalk",
    kind: "trail",
    title: "Waterfront boardwalk stroll",
    notes: "Flat, stroller-friendly walk along the marina from the ferry to the swim beach.",
    color: "#1e96c0",
    views: ["trails", "explore"],
    path: [
      [47.7963, -122.4966],
      [47.7969, -122.4979],
      [47.7975, -122.499],
      [47.7981, -122.5001],
    ],
  },
];
