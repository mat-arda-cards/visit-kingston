# The map system

A general-purpose, admin-editable mapping layer. One reusable component
renders any named **view** anywhere in the app; the Chamber builds views and
drops features on them at `/admin/maps` — no code.

## Concepts

- **Map view** — a named, reusable map config (`food-drink`, `parking-cash`,
  `explore`, `trails`). Has a center/zoom, a set of built-in data layers to
  include, and a `published` flag (drafts are admin-only). Seeded in
  `src/lib/data/map-views.ts`, overlaid by admin edits.
- **Feature** — a drawn thing assigned to one or more views:
  - **marker** — an icon from a category palette (food, coffee, viewpoint,
    trailhead, beach, ATM, …), with a title, notes, an optional photo, and a
    link.
  - **line** — a colored path.
  - **trail** — a colored dashed path (walks/trails).
  - **area** — a colored filled polygon (designate a zone).
  Seeded in `src/lib/data/map-features.ts`; admin edits overlay it.
- **Built-in layers** — a view can pull in existing app data without
  re-entering it: `restaurants`, `atms`, `parking-zones`, `streets` (the
  color-coded street-parking overlay). So the "Food & Drink" view is just
  `sources: ["restaurants"]` and stays in sync automatically.

## Using a view on any page

```tsx
import { FeatureMap } from "@/components/feature-map";
// …
<FeatureMap view="food-drink" height="420px" />
```

It's a client component that fetches `/api/map/<view>` and renders markers,
lines, trails, areas, plus whatever built-in layers the view includes, with a
legend for what's present. Already embedded on `/eat`; the public `/map` page
has a switcher across all published views.

## Editing (admin)

`/admin/maps` (admin accounts only):
- **Views** panel — create/edit/delete views; set center (from the current
  map center), zoom, which built-in layers to include, and published on/off.
- **Canvas** — draw a marker/line/polygon with the toolbar; drag vertices to
  adjust. Click an existing feature to edit or move it.
- **Feature form** — kind, title, icon category (markers), color (lines/
  trails/areas), notes, a photo upload, a link, and checkboxes for which
  views it appears on.

Feature photos are stored under `.data/map/images` (gitignored) and served
through `/api/map/image`. Everything else lives in `.data/stores/map-*.json`
overlaying the seed files — same pattern as the rest of the portal data.

## Data flow

```
seed (src/lib/data/map-*.ts)  ─┐
admin overlay (.data/stores)  ─┴─> map-store ─> resolve.ts ─> /api/map/[view] ─> <FeatureMap>
built-in layers (restaurants, atms, parking-zones, streets) ─┘
```

## Relationship to the parking map

The dedicated `/parking` map and its `/admin/map` editor (rich parking-zone
data: rules, overnight, confidence) stay as-is — that structured data is more
than a generic feature. The general system can *include* those zones and the
street overlay in any view via the `parking-zones` / `streets` sources, which
is how the `parking-cash` view is built.
