"use client";

// The Map Builder (laptop-first) — the Chamber's map CMS.
//
// Three columns: VIEWS (left), the leaflet+geoman CANVAS (center), and the
// selected-FEATURE form (right).
//
// Leaflet touches `window` at module scope, so it is imported dynamically
// inside useEffect (same pattern as components/town-map.tsx and the parking
// editor). Geoman's browser bundle reads the global `L`, so the import order
// in the effect is: leaflet → window.L = L → geoman → create the map. Geoman's
// CSS is a plain stylesheet import — safe at module top because this file is
// client-only and Next extracts CSS at build time.
//
// Geometry read-back on save: the currently selected feature's live leaflet
// layer is queried directly — marker.getLatLng() for markers, and
// polyline/polygon.getLatLngs() (walked to a flat ring) for lines/trails/areas
// — so any geoman vertex drag or marker move is captured at Save time.

import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type {
  LatLng,
  Layer,
  Map as LeafletMap,
  Marker,
  Polygon,
  Polyline,
} from "leaflet";
import {
  MARKER_CATEGORIES,
  markerCategory,
  type FeatureKind,
  type MapFeature,
  type MapView,
} from "@/lib/map/types";
import { Badge } from "@/components/ui";

/* ------------------------------------------------------------------ */
/* Constants & small helpers                                           */
/* ------------------------------------------------------------------ */

const KINGSTON_CENTER: [number, number] = [47.7985, -122.4975];

const INPUT =
  "w-full rounded-lg border border-sand bg-white px-3 py-2 text-sm text-ink focus:border-tide focus:outline-none";

const KIND_LABELS: Record<FeatureKind, string> = {
  marker: "Marker (pin)",
  line: "Line",
  trail: "Trail",
  area: "Area",
};

const KIND_EMOJI: Record<FeatureKind, string> = {
  marker: "📍",
  line: "➖",
  trail: "🥾",
  area: "⬠",
};

// Default stroke color for line/trail/area when the admin hasn't picked one.
const DEFAULT_LINE_COLOR = "#1E96C0";
const DEFAULT_TRAIL_COLOR = "#4a7c59";
const DEFAULT_AREA_COLOR = "#7c4dbe";

function defaultColor(kind: FeatureKind): string {
  if (kind === "trail") return DEFAULT_TRAIL_COLOR;
  if (kind === "area") return DEFAULT_AREA_COLOR;
  return DEFAULT_LINE_COLOR;
}

/** Color a line/trail/area actually renders with (its own or a kind default). */
function shapeColor(f: { kind: FeatureKind; color?: string }): string {
  return f.color || defaultColor(f.kind);
}

const r6 = (n: number): number => Math.round(n * 1e6) / 1e6;

function pointOf(ll: LatLng): [number, number] {
  return [r6(ll.lat), r6(ll.lng)];
}

function ringToPath(ring: LatLng[]): [number, number][] {
  return ring.map(pointOf);
}

/** polyline.getLatLngs() may nest one level (multi-polyline); take the first. */
function flatLatLngs(raw: unknown): LatLng[] {
  const arr = raw as LatLng[] | LatLng[][];
  if (Array.isArray(arr) && arr.length && Array.isArray(arr[0])) {
    return (arr as LatLng[][])[0];
  }
  return arr as LatLng[];
}

function randomId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

type Draft = {
  kind: FeatureKind;
  title: string;
  category: string;
  color: string;
  notes: string;
  link: string;
  imageUrl: string;
  views: string[];
};

function toDraft(f: MapFeature): Draft {
  return {
    kind: f.kind,
    title: f.title,
    category: f.category ?? "",
    color: f.color ?? "",
    notes: f.notes ?? "",
    link: f.link ?? "",
    imageUrl: f.imageUrl ?? "",
    views: [...f.views],
  };
}

type Msg = { kind: "ok" | "error"; text: string };

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-ink">{label}</span>
      <span className="mt-1 block">{children}</span>
    </label>
  );
}

/* ------------------------------------------------------------------ */
/* Marker / shape rendering                                            */
/* ------------------------------------------------------------------ */

/** divIcon showing the category emoji on a colored pin. */
function markerIcon(L: typeof import("leaflet"), f: { category?: string; color?: string }, selected: boolean) {
  const cat = markerCategory(f.category);
  const color = f.color || cat.color;
  const size = selected ? 34 : 28;
  return L.divIcon({
    className: "",
    html: `<span style="display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;border-radius:9999px;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.45);font-size:${
      selected ? 17 : 14
    }px;line-height:1;">${cat.emoji}</span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function shapeStyle(f: { kind: FeatureKind; color?: string }, selected: boolean) {
  const color = shapeColor(f);
  const base = { color, weight: selected ? 5 : 3, opacity: 0.9 };
  if (f.kind === "area") {
    return { ...base, weight: selected ? 3 : 2, fillColor: color, fillOpacity: selected ? 0.4 : 0.25 };
  }
  if (f.kind === "trail") {
    return { ...base, dashArray: "6 6" };
  }
  return base;
}

/* ------------------------------------------------------------------ */
/* Builder                                                             */
/* ------------------------------------------------------------------ */

type ViewDraft = {
  name: string;
  description: string;
  center: [number, number];
  zoom: number;
  sources: string[];
  published: boolean;
};

const SOURCE_OPTIONS: { key: string; label: string }[] = [
  { key: "restaurants", label: "Restaurants" },
  { key: "atms", label: "ATMs" },
  { key: "parking-zones", label: "Parking zones" },
  { key: "streets", label: "Street overlay" },
];

const SOURCE_SHORT: Record<string, string> = {
  restaurants: "🍽",
  atms: "💵",
  "parking-zones": "🅿️",
  streets: "🛣",
};

export function MapBuilder({
  initialViews,
  initialFeatures,
}: {
  initialViews: MapView[];
  initialFeatures: MapFeature[];
}) {
  const router = useRouter();

  const [views, setViews] = useState<MapView[]>(initialViews);
  const [features, setFeatures] = useState<MapFeature[]>(initialFeatures);

  // The "active view" is the default target for newly drawn features and the
  // canvas filter (unless showAll). null = no active view yet.
  const [activeViewId, setActiveViewId] = useState<string | null>(initialViews[0]?.id ?? null);
  const [showAll, setShowAll] = useState(false);

  // View editing (left panel form). null = not editing a view.
  const [viewDraft, setViewDraft] = useState<ViewDraft | null>(null);
  const [viewEditId, setViewEditId] = useState<string | null>(null); // null = creating
  const [viewSaving, setViewSaving] = useState(false);
  const [viewMsg, setViewMsg] = useState<Msg | null>(null);

  // Feature editing (right panel form).
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [dirty, setDirty] = useState(false);
  const [drawing, setDrawing] = useState<FeatureKind | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [msg, setMsg] = useState<Msg | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const layersRef = useRef(new Map<string, Layer>());
  // Ids drawn this session but never saved — deleting them skips the API.
  const unsavedIdsRef = useRef(new Set<string>());

  // Mirrors for map-event callbacks (created once, must see current state).
  const featuresRef = useRef(features);
  featuresRef.current = features;
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const activeViewIdRef = useRef(activeViewId);
  activeViewIdRef.current = activeViewId;
  const showAllRef = useRef(showAll);
  showAllRef.current = showAll;
  const selectRef = useRef<(id: string) => void>(() => {});

  /* ---------------- which features belong on the canvas ---------------- */

  function visibleFeatures(): MapFeature[] {
    const list = featuresRef.current;
    if (showAllRef.current || !activeViewIdRef.current) return list;
    return list.filter((f) => f.views.includes(activeViewIdRef.current!));
  }

  /* ---------------- imperative layer management ---------------- */

  function makeLayer(f: MapFeature): Layer | null {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return null;

    let layer: Layer | null = null;
    if (f.kind === "marker" && f.point) {
      layer = L.marker(f.point, { icon: markerIcon(L, f, false) })
        .addTo(map)
        .bindTooltip(f.title, { direction: "top", offset: [0, -14] });
    } else if ((f.kind === "line" || f.kind === "trail") && f.path && f.path.length >= 2) {
      layer = L.polyline(f.path, shapeStyle(f, false))
        .addTo(map)
        .bindTooltip(f.title, { sticky: true });
    } else if (f.kind === "area" && f.polygon && f.polygon.length >= 3) {
      layer = L.polygon(f.polygon, shapeStyle(f, false))
        .addTo(map)
        .bindTooltip(f.title, { sticky: true });
    }
    if (!layer) return null;

    layer.on("click", () => selectRef.current(f.id));
    // pm:* events fire only while geoman editing is enabled (i.e. selected).
    layer.on("pm:edit", () => setDirty(true));
    layer.on("pm:markerdragend", () => setDirty(true));
    layer.on("dragend", () => setDirty(true));
    layersRef.current.set(f.id, layer);
    return layer;
  }

  function removeLayer(id: string) {
    const layer = layersRef.current.get(id);
    layer?.remove();
    layersRef.current.delete(id);
  }

  function renderCanvas() {
    // Rebuild every layer to reflect the current view filter + feature data.
    for (const id of [...layersRef.current.keys()]) removeLayer(id);
    for (const f of visibleFeatures()) makeLayer(f);
    // Re-arm editing on the selected feature if it's still visible.
    const sel = selectedIdRef.current;
    if (sel) {
      const f = featuresRef.current.find((x) => x.id === sel);
      if (f && layersRef.current.has(sel)) setEditing(sel, f, true);
    }
  }

  function setEditing(id: string, f: MapFeature, on: boolean) {
    const layer = layersRef.current.get(id) as
      | (Marker & { pm: { enable: (o?: unknown) => void; disable: () => void } })
      | (Polyline & { pm: { enable: (o?: unknown) => void; disable: () => void } })
      | undefined;
    const L = leafletRef.current;
    if (!layer || !L) return;
    if (f.kind === "marker") {
      (layer as Marker).setIcon(markerIcon(L, f, on));
      if (on) (layer as Marker).pm.enable();
      else (layer as Marker).pm.disable();
    } else {
      (layer as Polyline).setStyle(shapeStyle(f, on));
      if (on) (layer as Polyline).pm.enable({ allowSelfIntersection: f.kind !== "area" });
      else (layer as Polyline).pm.disable();
    }
  }

  /* ---------------- selection ---------------- */

  function select(id: string) {
    const prev = selectedIdRef.current;
    if (prev === id) return;
    if (dirtyRef.current && !window.confirm("Discard unsaved changes to the current feature?")) {
      return;
    }
    if (prev) {
      const prevF = featuresRef.current.find((f) => f.id === prev);
      if (prevF) setEditing(prev, prevF, false);
    }

    const f = featuresRef.current.find((x) => x.id === id);
    if (!f) return;
    setSelectedId(id);
    setDraft(toDraft(f));
    setDirty(false);
    setMsg(null);

    const map = mapRef.current;
    const layer = layersRef.current.get(id);
    if (map && layer) {
      if (f.kind === "marker" && f.point) {
        map.setView(f.point, Math.max(map.getZoom(), 16));
      } else if ("getBounds" in layer) {
        map.fitBounds((layer as Polyline).getBounds(), { padding: [60, 60], maxZoom: 18 });
      }
      setEditing(id, f, true);
    }
  }
  selectRef.current = select;

  function deselect() {
    const prev = selectedIdRef.current;
    if (prev) {
      const prevF = featuresRef.current.find((f) => f.id === prev);
      if (prevF) setEditing(prev, prevF, false);
    }
    setSelectedId(null);
    setDraft(null);
    setDirty(false);
  }

  /* ---------------- map bootstrap ---------------- */

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      // Geoman's browser bundle registers itself on the global L.
      (window as unknown as { L?: typeof L }).L = L;
      await import("@geoman-io/leaflet-geoman-free");
      // Guard: unmounted while loading, or already initialized (StrictMode).
      if (cancelled || !containerRef.current || mapRef.current) return;

      leafletRef.current = L;
      const first = initialViews[0];
      const map = L.map(containerRef.current, {
        center: first ? first.center : KINGSTON_CENTER,
        zoom: first ? first.zoom : 15,
      });
      mapRef.current = map;

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      // Geoman controls — draw markers, polylines (line/trail), polygons (area).
      map.pm.addControls({
        position: "topleft",
        drawMarker: true,
        drawPolyline: true,
        drawPolygon: true,
        drawCircle: false,
        drawRectangle: false,
        drawCircleMarker: false,
        drawText: false,
        editMode: true,
        dragMode: true,
        cutPolygon: false,
        rotateMode: false,
        removalMode: false,
      });
      map.pm.setGlobalOptions({ allowSelfIntersection: false });

      map.on("pm:create", (e: { shape: string; layer: Layer }) => {
        handleDrawnRef.current(e.shape, e.layer);
      });

      renderCanvas();
      setMapReady(true);
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      layersRef.current.clear();
    };
    // Features are managed imperatively after mount; re-running would tear the
    // map down mid-edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------- draw a new feature ---------------- */

  const handleDrawnRef = useRef<(shape: string, layer: Layer) => void>(() => {});
  handleDrawnRef.current = (shape: string, layer: Layer) => {
    setDrawing(null);
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    // Infer kind + geometry from the drawn shape.
    let kind: FeatureKind;
    const partial: Partial<MapFeature> = {};
    if (shape === "Marker") {
      kind = "marker";
      partial.point = pointOf((layer as Marker).getLatLng());
    } else if (shape === "Line") {
      kind = "line"; // admin can switch to "trail" in the form
      const path = ringToPath(flatLatLngs((layer as Polyline).getLatLngs()));
      if (path.length < 2) {
        layer.remove();
        return;
      }
      partial.path = path;
    } else if (shape === "Polygon") {
      kind = "area";
      const poly = ringToPath(flatLatLngs((layer as Polygon).getLatLngs()));
      if (poly.length < 3) {
        layer.remove();
        return;
      }
      partial.polygon = poly;
    } else {
      layer.remove();
      return;
    }

    layer.remove(); // re-added via makeLayer so wiring is uniform

    const targetView = activeViewIdRef.current;
    const id = randomId("feat");
    const f: MapFeature = {
      id,
      kind,
      title: kind === "marker" ? "New marker" : kind === "area" ? "New area" : "New line",
      views: targetView ? [targetView] : [],
      ...partial,
    };
    unsavedIdsRef.current.add(id);
    featuresRef.current = [...featuresRef.current, f];
    setFeatures(featuresRef.current);
    makeLayer(f);
    select(id);
    setDirty(true);
    setMsg({
      kind: "ok",
      text: targetView
        ? "Shape drawn — fill in the details, then Save to publish."
        : "Shape drawn — pick at least one view under “Show on views”, then Save.",
    });
  };

  function toggleDraw(kind: FeatureKind) {
    const map = mapRef.current;
    if (!map) return;
    if (drawing === kind) {
      map.pm.disableDraw();
      setDrawing(null);
      return;
    }
    map.pm.disableDraw();
    const geomanShape = kind === "marker" ? "Marker" : kind === "area" ? "Polygon" : "Line";
    map.pm.enableDraw(geomanShape);
    setDrawing(kind);
    setMsg({
      kind: "ok",
      text:
        kind === "marker"
          ? "Click the map to drop the marker."
          : "Click to place points; click the last point again to finish.",
    });
  }

  /* ---------------- feature draft & persistence ---------------- */

  function patchDraft(patch: Partial<Draft>) {
    setDraft((d) => (d ? { ...d, ...patch } : d));
    setDirty(true);
    setMsg(null);
  }

  function toggleDraftView(id: string) {
    setDraft((d) => {
      if (!d) return d;
      const has = d.views.includes(id);
      return { ...d, views: has ? d.views.filter((v) => v !== id) : [...d.views, id] };
    });
    setDirty(true);
    setMsg(null);
  }

  /** The draft feature with geometry read back from its live map layer. */
  function buildFeature(): MapFeature | null {
    if (!draft || !selectedId) return null;
    const existing = featuresRef.current.find((f) => f.id === selectedId);
    if (!existing) return null;

    const layer = layersRef.current.get(selectedId);
    const kind = draft.kind;

    // Read geometry back from the live layer where its shape matches the kind;
    // fall back to the stored geometry otherwise (e.g. line ↔ trail switch
    // keeps the same polyline layer, so its path is still valid).
    let point = existing.point;
    let path = existing.path;
    let polygon = existing.polygon;
    if (layer) {
      if (kind === "marker" && "getLatLng" in layer) {
        point = pointOf((layer as Marker).getLatLng());
      } else if ((kind === "line" || kind === "trail") && "getLatLngs" in layer) {
        path = ringToPath(flatLatLngs((layer as Polyline).getLatLngs()));
      } else if (kind === "area" && "getLatLngs" in layer) {
        polygon = ringToPath(flatLatLngs((layer as Polygon).getLatLngs()));
      }
    }

    const feature: MapFeature = {
      id: selectedId,
      kind,
      title: draft.title.trim(),
      views: draft.views,
      ...(draft.notes.trim() ? { notes: draft.notes.trim() } : {}),
      ...(kind === "marker" && draft.category ? { category: draft.category } : {}),
      ...(draft.color ? { color: draft.color } : {}),
      ...(draft.imageUrl ? { imageUrl: draft.imageUrl } : {}),
      ...(draft.link.trim() ? { link: draft.link.trim() } : {}),
    };
    // Attach only the geometry that matches the (possibly switched) kind.
    if (kind === "marker" && point) feature.point = point;
    if ((kind === "line" || kind === "trail") && path) feature.path = path;
    if (kind === "area" && polygon) feature.polygon = polygon;
    return feature;
  }

  async function save() {
    const feature = buildFeature();
    if (!feature) return;
    if (!feature.title) {
      setMsg({ kind: "error", text: "The feature needs a title." });
      return;
    }
    if (feature.views.length === 0) {
      setMsg({ kind: "error", text: "Assign the feature to at least one view." });
      return;
    }
    // Geometry sanity (mirror of the server rules, for a friendlier message).
    if (feature.kind === "marker" && !feature.point) {
      setMsg({ kind: "error", text: "This marker has no location — redraw it." });
      return;
    }
    if ((feature.kind === "line" || feature.kind === "trail") && (!feature.path || feature.path.length < 2)) {
      setMsg({ kind: "error", text: "A line/trail needs at least 2 points — redraw it." });
      return;
    }
    if (feature.kind === "area" && (!feature.polygon || feature.polygon.length < 3)) {
      setMsg({ kind: "error", text: "An area needs at least 3 points — redraw it." });
      return;
    }

    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/map-features", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(feature),
      });
      const data = (await res.json()) as { ok?: boolean; feature?: MapFeature; error?: string };
      if (!res.ok || !data.ok || !data.feature) {
        setMsg({ kind: "error", text: data.error ?? "Could not save the feature." });
        return;
      }
      const saved = data.feature;
      unsavedIdsRef.current.delete(saved.id);
      featuresRef.current = featuresRef.current.some((f) => f.id === saved.id)
        ? featuresRef.current.map((f) => (f.id === saved.id ? saved : f))
        : [...featuresRef.current, saved];
      setFeatures(featuresRef.current);

      // Rebuild this feature's layer so color/emoji/geometry reflect the saved
      // record; drop it if it no longer belongs on the current view filter.
      removeLayer(saved.id);
      const onCanvas = visibleFeatures().some((f) => f.id === saved.id);
      if (onCanvas) {
        makeLayer(saved);
        setEditing(saved.id, saved, true);
      }
      setDraft(toDraft(saved));
      setDirty(false);
      setMsg({ kind: "ok", text: "Saved — live on the public map within a minute." });
      router.refresh();
    } catch {
      setMsg({ kind: "error", text: "Could not reach the server — is the app running?" });
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!selectedId) return;
    const f = featuresRef.current.find((x) => x.id === selectedId);
    if (!f) return;
    if (!window.confirm(`Delete "${f.title}" from the map? (Seed features stay hidden, not erased.)`)) {
      return;
    }

    const wasUnsaved = unsavedIdsRef.current.has(selectedId);
    if (!wasUnsaved) {
      setSaving(true);
      setMsg(null);
      try {
        const res = await fetch(`/api/admin/map-features?id=${encodeURIComponent(selectedId)}`, {
          method: "DELETE",
        });
        if (!res.ok && res.status !== 404) {
          const data = (await res.json()) as { error?: string };
          setMsg({ kind: "error", text: data.error ?? "Could not delete the feature." });
          return;
        }
      } catch {
        setMsg({ kind: "error", text: "Could not reach the server — is the app running?" });
        return;
      } finally {
        setSaving(false);
      }
    }

    const id = selectedId;
    const title = f.title;
    deselect();
    removeLayer(id);
    unsavedIdsRef.current.delete(id);
    featuresRef.current = featuresRef.current.filter((x) => x.id !== id);
    setFeatures(featuresRef.current);
    setMsg({ kind: "ok", text: `Deleted "${title}".` });
    router.refresh();
  }

  /* ---------------- image upload ---------------- */

  async function uploadImage(file: File) {
    setUploading(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/admin/map-features/image", { method: "POST", body: fd });
      const data = (await res.json()) as { ok?: boolean; imageUrl?: string; error?: string };
      if (!res.ok || !data.ok || !data.imageUrl) {
        setMsg({ kind: "error", text: data.error ?? "Could not upload the image." });
        return;
      }
      patchDraft({ imageUrl: data.imageUrl });
      setMsg({ kind: "ok", text: "Image uploaded — Save the feature to keep it." });
    } catch {
      setMsg({ kind: "error", text: "Could not upload the image — is the app running?" });
    } finally {
      setUploading(false);
    }
  }

  /* ---------------- view filter / active view ---------------- */

  function pickActiveView(id: string) {
    if (dirtyRef.current && !window.confirm("Discard unsaved feature changes?")) return;
    deselect();
    setActiveViewId(id);
    activeViewIdRef.current = id;
    setShowAll(false);
    showAllRef.current = false;
    setViewDraft(null);
    setViewEditId(null);
    // Recenter on the picked view, then redraw the filtered canvas.
    const map = mapRef.current;
    const view = views.find((v) => v.id === id);
    if (map && view) map.setView(view.center, view.zoom);
    renderCanvas();
  }

  function toggleShowAll() {
    if (dirtyRef.current && !window.confirm("Discard unsaved feature changes?")) return;
    deselect();
    const next = !showAll;
    setShowAll(next);
    showAllRef.current = next;
    renderCanvas();
  }

  /* ---------------- view create / edit ---------------- */

  function newView() {
    const map = mapRef.current;
    const center: [number, number] = map
      ? [r6(map.getCenter().lat), r6(map.getCenter().lng)]
      : KINGSTON_CENTER;
    const zoom = map ? map.getZoom() : 15;
    setViewEditId(null);
    setViewDraft({ name: "", description: "", center, zoom, sources: [], published: false });
    setViewMsg(null);
  }

  function editView(v: MapView) {
    setViewEditId(v.id);
    setViewDraft({
      name: v.name,
      description: v.description ?? "",
      center: v.center,
      zoom: v.zoom,
      sources: [...v.sources],
      published: v.published,
    });
    setViewMsg(null);
  }

  function patchView(patch: Partial<ViewDraft>) {
    setViewDraft((d) => (d ? { ...d, ...patch } : d));
    setViewMsg(null);
  }

  function toggleViewSource(key: string) {
    setViewDraft((d) => {
      if (!d) return d;
      const has = d.sources.includes(key);
      return { ...d, sources: has ? d.sources.filter((s) => s !== key) : [...d.sources, key] };
    });
    setViewMsg(null);
  }

  function useCurrentCenter() {
    const map = mapRef.current;
    if (!map) return;
    patchView({
      center: [r6(map.getCenter().lat), r6(map.getCenter().lng)],
      zoom: map.getZoom(),
    });
  }

  async function saveView() {
    if (!viewDraft) return;
    if (!viewDraft.name.trim()) {
      setViewMsg({ kind: "error", text: "The view needs a name." });
      return;
    }
    setViewSaving(true);
    setViewMsg(null);
    try {
      const payload: Record<string, unknown> = {
        name: viewDraft.name.trim(),
        description: viewDraft.description.trim() || undefined,
        center: viewDraft.center,
        zoom: viewDraft.zoom,
        sources: viewDraft.sources,
        published: viewDraft.published,
      };
      if (viewEditId) payload.id = viewEditId;
      const res = await fetch("/api/admin/map-views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { ok?: boolean; view?: MapView; error?: string };
      if (!res.ok || !data.ok || !data.view) {
        setViewMsg({ kind: "error", text: data.error ?? "Could not save the view." });
        return;
      }
      const saved = data.view;
      setViews((prev) =>
        prev.some((v) => v.id === saved.id) ? prev.map((v) => (v.id === saved.id ? saved : v)) : [...prev, saved],
      );
      setViewDraft(null);
      setViewEditId(null);
      setActiveViewId(saved.id);
      activeViewIdRef.current = saved.id;
      setViewMsg({ kind: "ok", text: `Saved “${saved.name}”.` });
      router.refresh();
    } catch {
      setViewMsg({ kind: "error", text: "Could not reach the server — is the app running?" });
    } finally {
      setViewSaving(false);
    }
  }

  async function deleteView(v: MapView) {
    if (
      !window.confirm(
        `Delete the "${v.name}" view? Features stay, but they lose this view assignment on the public site. (Seed views are hidden, not erased.)`,
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/map-views?id=${encodeURIComponent(v.id)}`, { method: "DELETE" });
      if (!res.ok && res.status !== 404) {
        const data = (await res.json()) as { error?: string };
        setViewMsg({ kind: "error", text: data.error ?? "Could not delete the view." });
        return;
      }
    } catch {
      setViewMsg({ kind: "error", text: "Could not reach the server — is the app running?" });
      return;
    }
    setViews((prev) => prev.filter((x) => x.id !== v.id));
    if (activeViewIdRef.current === v.id) {
      const next = views.find((x) => x.id !== v.id)?.id ?? null;
      setActiveViewId(next);
      activeViewIdRef.current = next;
    }
    if (viewEditId === v.id) {
      setViewDraft(null);
      setViewEditId(null);
    }
    setViewMsg({ kind: "ok", text: `Deleted “${v.name}”.` });
    renderCanvas();
    router.refresh();
  }

  /* ---------------- render ---------------- */

  const selectedFeature = selectedId ? features.find((f) => f.id === selectedId) : null;
  const activeView = activeViewId ? views.find((v) => v.id === activeViewId) : null;

  // Feature list scoped to the sidebar (matches canvas filter).
  const listedFeatures = showAll || !activeViewId
    ? features
    : features.filter((f) => f.views.includes(activeViewId));

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr_320px]">
      {/* ---------------- LEFT: views ---------------- */}
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold tracking-wide text-sound-deep uppercase">Views</h3>
          <button
            type="button"
            onClick={newView}
            className="rounded-full bg-sound px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-sound-deep"
          >
            + New view
          </button>
        </div>

        <button
          type="button"
          onClick={toggleShowAll}
          className={`rounded-lg border px-3 py-2 text-left text-xs font-semibold transition-colors ${
            showAll ? "border-tide bg-tide/10 text-tide-deep" : "border-sand bg-white text-ink-soft hover:bg-shell"
          }`}
        >
          {showAll ? "✓ Showing features from all views" : "Show features from all views"}
        </button>

        <ul className="divide-y divide-sand overflow-hidden rounded-2xl border border-sand bg-white">
          {views.length === 0 && (
            <li className="px-3 py-4 text-sm text-ink-soft">No views yet — create one.</li>
          )}
          {views.map((v) => {
            const count = features.filter((f) => f.views.includes(v.id)).length;
            const isActive = v.id === activeViewId && !showAll;
            return (
              <li key={v.id}>
                <div className={`px-3 py-2.5 transition-colors ${isActive ? "bg-tide/10" : ""}`}>
                  <button
                    type="button"
                    onClick={() => pickActiveView(v.id)}
                    className="flex w-full flex-col gap-1 text-left"
                  >
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-ink">{v.name}</span>
                      {!v.published && <Badge tone="sand">draft</Badge>}
                    </span>
                    <span className="flex flex-wrap items-center gap-1.5 text-xs text-ink-soft">
                      <span>
                        {count} feature{count === 1 ? "" : "s"}
                      </span>
                      {v.sources.length > 0 && (
                        <span title={v.sources.join(", ")}>
                          {v.sources.map((s) => SOURCE_SHORT[s] ?? s).join(" ")}
                        </span>
                      )}
                    </span>
                  </button>
                  <div className="mt-1.5 flex gap-3 text-xs">
                    <button
                      type="button"
                      onClick={() => editView(v)}
                      className="font-semibold text-tide-deep hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteView(v)}
                      className="font-semibold text-coral-deep hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        {viewMsg && (
          <p className={`text-xs font-medium ${viewMsg.kind === "ok" ? "text-fern" : "text-coral-deep"}`}>
            {viewMsg.text}
          </p>
        )}

        {/* View editor form */}
        {viewDraft && (
          <div className="flex flex-col gap-3 rounded-2xl border border-sand bg-white p-4 shadow-[0_1px_3px_rgba(22,64,94,0.08)]">
            <p className="text-xs font-semibold tracking-wide text-sound-deep uppercase">
              {viewEditId ? `Edit view` : "New view"}
            </p>
            <Field label="Name">
              <input
                className={INPUT}
                value={viewDraft.name}
                onChange={(e) => patchView({ name: e.target.value })}
                placeholder="e.g. Food & Drink"
              />
            </Field>
            <Field label="Description">
              <textarea
                className={INPUT}
                rows={2}
                value={viewDraft.description}
                onChange={(e) => patchView({ description: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Center lat">
                <input
                  className={INPUT}
                  type="number"
                  step="0.0001"
                  value={viewDraft.center[0]}
                  onChange={(e) =>
                    patchView({ center: [Number(e.target.value), viewDraft.center[1]] })
                  }
                />
              </Field>
              <Field label="Center lng">
                <input
                  className={INPUT}
                  type="number"
                  step="0.0001"
                  value={viewDraft.center[1]}
                  onChange={(e) =>
                    patchView({ center: [viewDraft.center[0], Number(e.target.value)] })
                  }
                />
              </Field>
            </div>
            <button
              type="button"
              onClick={useCurrentCenter}
              disabled={!mapReady}
              className="rounded-full border border-sand bg-shell px-3 py-1.5 text-xs font-semibold text-sound-deep transition-colors hover:bg-sand disabled:opacity-50"
            >
              Use current map center
            </button>
            <Field label={`Zoom (10–19): ${viewDraft.zoom}`}>
              <input
                type="range"
                min={10}
                max={19}
                step={1}
                value={viewDraft.zoom}
                onChange={(e) => patchView({ zoom: Number(e.target.value) })}
                className="w-full"
              />
            </Field>
            <div>
              <span className="text-sm font-medium text-ink">Built-in layers</span>
              <div className="mt-1.5 flex flex-col gap-1.5">
                {SOURCE_OPTIONS.map((s) => (
                  <label key={s.key} className="flex items-center gap-2 text-sm text-ink-soft">
                    <input
                      type="checkbox"
                      checked={viewDraft.sources.includes(s.key)}
                      onChange={() => toggleViewSource(s.key)}
                    />
                    {s.label}
                  </label>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={viewDraft.published}
                onChange={(e) => patchView({ published: e.target.checked })}
              />
              Published (visible on the public map switcher)
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={saveView}
                disabled={viewSaving}
                className="rounded-full bg-sound px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-sound-deep disabled:opacity-50"
              >
                {viewSaving ? "Saving…" : "Save view"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewDraft(null);
                  setViewEditId(null);
                }}
                className="rounded-full border border-sand px-4 py-1.5 text-sm font-semibold text-ink-soft transition-colors hover:bg-shell"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ---------------- CENTER: canvas ---------------- */}
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-sound-deep">
            {showAll
              ? "Drawing onto: all views"
              : activeView
                ? `Active view: ${activeView.name}`
                : "No active view — pick or create one"}
          </span>
          <span className="text-xs text-ink-soft">New shapes get assigned to the active view.</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {(["marker", "line", "trail", "area"] as FeatureKind[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => toggleDraw(k)}
              disabled={!mapReady}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
                drawing === k
                  ? "border border-coral bg-coral/10 text-coral-deep"
                  : "bg-sound text-white hover:bg-sound-deep"
              }`}
              title={
                k === "trail"
                  ? "Draw a polyline; it starts as a trail (dashed). Lines and trails share the same draw tool."
                  : undefined
              }
            >
              {drawing === k ? "✕ Cancel" : `${KIND_EMOJI[k]} Draw ${k}`}
            </button>
          ))}
        </div>

        <div
          ref={containerRef}
          style={{ height: "560px" }}
          className="relative z-0 w-full overflow-hidden rounded-2xl border border-sand"
          role="region"
          aria-label="Editable map canvas for the selected view"
        />

        <p className="text-xs text-ink-soft">
          Draw with the buttons above (or geoman’s toolbar, top-left). Click any feature to select
          and reshape it — drag vertices/markers, then Save on the right. “Trail” and “Line” use the
          same polyline tool; switch between them in the feature form.
        </p>
      </div>

      {/* ---------------- RIGHT: feature form ---------------- */}
      <div className="flex min-w-0 flex-col gap-3">
        <h3 className="text-sm font-semibold tracking-wide text-sound-deep uppercase">Feature</h3>

        {!selectedFeature && (
          <div className="rounded-2xl border border-dashed border-sand bg-shell/50 p-6 text-center text-sm text-ink-soft">
            Draw a shape or pick a feature on the map to edit it here.
          </div>
        )}

        {selectedFeature && draft && (
          <div className="flex flex-col gap-4 rounded-2xl border border-sand bg-white p-4 shadow-[0_1px_3px_rgba(22,64,94,0.08)]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-xs text-ink-soft">{selectedFeature.id}</span>
              {unsavedIdsRef.current.has(selectedFeature.id) && <Badge tone="coral">not saved</Badge>}
              {dirty && !unsavedIdsRef.current.has(selectedFeature.id) && (
                <Badge tone="coral">unsaved changes</Badge>
              )}
            </div>

            <Field label="Kind">
              <select
                className={INPUT}
                value={draft.kind}
                onChange={(e) => patchDraft({ kind: e.target.value as FeatureKind })}
              >
                {(Object.keys(KIND_LABELS) as FeatureKind[])
                  // Only allow switching between kinds sharing the same geometry
                  // (line ↔ trail). Marker and area can't change kind here.
                  .filter((k) =>
                    selectedFeature.kind === "line" || selectedFeature.kind === "trail"
                      ? k === "line" || k === "trail"
                      : k === selectedFeature.kind,
                  )
                  .map((k) => (
                    <option key={k} value={k}>
                      {KIND_LABELS[k]}
                    </option>
                  ))}
              </select>
            </Field>

            <Field label="Title">
              <input
                className={INPUT}
                value={draft.title}
                onChange={(e) => patchDraft({ title: e.target.value })}
              />
            </Field>

            {draft.kind === "marker" && (
              <Field label="Icon category">
                <select
                  className={INPUT}
                  value={draft.category}
                  onChange={(e) => patchDraft({ category: e.target.value })}
                >
                  <option value="">— pick an icon —</option>
                  {MARKER_CATEGORIES.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.emoji} {c.label}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            <Field
              label={draft.kind === "marker" ? "Pin tint (optional)" : "Color"}
            >
              <span className="flex items-center gap-2">
                <input
                  type="color"
                  value={draft.color || (draft.kind === "marker" ? markerCategory(draft.category).color : defaultColor(draft.kind))}
                  onChange={(e) => patchDraft({ color: e.target.value })}
                  className="h-9 w-12 cursor-pointer rounded border border-sand"
                />
                {draft.color && (
                  <button
                    type="button"
                    onClick={() => patchDraft({ color: "" })}
                    className="text-xs font-semibold text-ink-soft hover:underline"
                  >
                    reset
                  </button>
                )}
              </span>
            </Field>

            <Field label="Notes">
              <textarea
                className={INPUT}
                rows={3}
                value={draft.notes}
                onChange={(e) => patchDraft({ notes: e.target.value })}
              />
            </Field>

            <Field label="Link (https://…)">
              <input
                className={INPUT}
                value={draft.link}
                onChange={(e) => patchDraft({ link: e.target.value })}
                placeholder="https://"
              />
            </Field>

            <div>
              <span className="text-sm font-medium text-ink">Image</span>
              {draft.imageUrl && (
                <img
                  src={`/api/map/image?p=${encodeURIComponent(draft.imageUrl)}`}
                  alt=""
                  className="mt-1.5 h-28 w-full rounded-lg border border-sand object-cover"
                />
              )}
              <div className="mt-1.5 flex items-center gap-2">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadImage(file);
                    e.target.value = "";
                  }}
                  className="text-xs text-ink-soft file:mr-2 file:rounded-full file:border-0 file:bg-sound file:px-3 file:py-1 file:text-xs file:font-semibold file:text-white"
                />
                {draft.imageUrl && (
                  <button
                    type="button"
                    onClick={() => patchDraft({ imageUrl: "" })}
                    className="text-xs font-semibold text-coral-deep hover:underline"
                  >
                    remove
                  </button>
                )}
              </div>
              {uploading && <p className="mt-1 text-xs text-ink-soft">Uploading…</p>}
            </div>

            <div>
              <span className="text-sm font-medium text-ink">Show on views</span>
              <div className="mt-1.5 flex max-h-40 flex-col gap-1.5 overflow-y-auto rounded-lg border border-sand p-2">
                {views.length === 0 && <p className="text-xs text-ink-soft">No views yet.</p>}
                {views.map((v) => (
                  <label key={v.id} className="flex items-center gap-2 text-sm text-ink-soft">
                    <input
                      type="checkbox"
                      checked={draft.views.includes(v.id)}
                      onChange={() => toggleDraftView(v.id)}
                    />
                    <span className="truncate">{v.name}</span>
                    {!v.published && <Badge tone="sand">draft</Badge>}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={save}
                disabled={saving || !dirty}
                className="rounded-full bg-sound px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-sound-deep disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save feature"}
              </button>
              <button
                type="button"
                onClick={remove}
                disabled={saving}
                className="rounded-full border border-coral px-3 py-2 text-sm font-semibold text-coral-deep transition-colors hover:bg-coral/10 disabled:opacity-50"
              >
                Delete
              </button>
            </div>

            {msg && (
              <p className={`text-sm font-medium ${msg.kind === "ok" ? "text-fern" : "text-coral-deep"}`}>
                {msg.text}
              </p>
            )}
          </div>
        )}

        {!selectedFeature && msg && (
          <p className={`text-sm font-medium ${msg.kind === "ok" ? "text-fern" : "text-coral-deep"}`}>
            {msg.text}
          </p>
        )}

        {/* Feature list for the current filter */}
        <div className="rounded-2xl border border-sand bg-white">
          <p className="border-b border-sand px-3 py-2 text-xs font-semibold tracking-wide text-ink-soft uppercase">
            {showAll || !activeView ? "All features" : `On “${activeView.name}”`} ({listedFeatures.length})
          </p>
          <ul className="max-h-64 divide-y divide-sand overflow-y-auto">
            {listedFeatures.length === 0 && (
              <li className="px-3 py-3 text-sm text-ink-soft">Nothing here yet — draw something.</li>
            )}
            {listedFeatures.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  onClick={() => select(f.id)}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-shell ${
                    f.id === selectedId ? "bg-tide/10" : ""
                  }`}
                >
                  <span aria-hidden>
                    {f.kind === "marker" ? markerCategory(f.category).emoji : KIND_EMOJI[f.kind]}
                  </span>
                  <span className="truncate text-ink">{f.title}</span>
                  {unsavedIdsRef.current.has(f.id) && <Badge tone="coral">new</Badge>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
