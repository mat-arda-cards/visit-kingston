"use client";

// Public, reusable Leaflet map that renders any named MapView anywhere in the
// app. It fetches the resolved view from /api/map/<view> (view config + custom
// features + built-in-source payloads) and draws every layer client-side.
//
// Leaflet touches `window` at module scope, so it is imported dynamically
// inside useEffect — this component renders an empty shell on the server and
// hydrates on the client. Leaflet CSS is imported globally. Default marker
// icons are deliberately avoided (their asset paths break under bundlers):
// markers use L.divIcon; everything else uses circleMarker/polyline/polygon.
//
// Colors on the map canvas are intentionally hex — they live on the tiles,
// not in the page's token system, and are kept consistent with town-map.tsx.

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import { markerCategory, type ResolvedMapView } from "@/lib/map/types";

// ---- shared color conventions (kept in sync with town-map.tsx) ----

const PARKING_RULE_COLORS: Record<string, string> = {
  "free-2hr": "#2e9e4f",
  "free-unrestricted": "#1E96C0",
  paid: "#7c4dbe",
  "park-and-ride-24h": "#e8891d",
  prohibited: "#d43d3d",
  "load-zone": "#f0b429",
  permit: "#6b7280",
};
const FALLBACK_PARKING_COLOR = "#6b7280";

function parkingColor(rule: string): string {
  return PARKING_RULE_COLORS[rule] ?? FALLBACK_PARKING_COLOR;
}

const PARKING_RULE_LABELS: Record<string, string> = {
  "free-2hr": "Free · 2-hour limit",
  "free-unrestricted": "Free · no time limit",
  paid: "Paid lot",
  "park-and-ride-24h": "Park & ride · 24 hr",
  prohibited: "No parking",
  "load-zone": "Load zone",
  permit: "Permit parking",
};

type StreetRule =
  | "free-2hr"
  | "free-unrestricted"
  | "prohibited"
  | "ferry-holding"
  | "default";

const STREET_COLORS: Record<StreetRule, string> = {
  "free-2hr": "#2e9e4f",
  "free-unrestricted": "#1E96C0",
  prohibited: "#d43d3d",
  "ferry-holding": "#64748b",
  default: "#8b9aa8",
};

const STREET_RULE_LABELS: Record<StreetRule, string> = {
  "free-2hr": "Free street parking · 2-hour limit",
  "free-unrestricted": "Free street parking · no time limit",
  prohibited: "No street parking",
  "ferry-holding":
    "Ferry holding corridor — this is the line for the boat, not street parking",
  default: "No known restriction — free where unsigned",
};

function normalizeStreetRule(rule: string): StreetRule {
  return rule in STREET_COLORS ? (rule as StreetRule) : "default";
}

function streetStyle(rule: StreetRule): {
  color: string;
  weight: number;
  opacity: number;
  dashArray?: string;
} {
  switch (rule) {
    case "ferry-holding":
      return { color: STREET_COLORS[rule], weight: 3, opacity: 0.45, dashArray: "4 6" };
    case "prohibited":
      return { color: STREET_COLORS[rule], weight: 4, opacity: 0.6 };
    case "free-2hr":
    case "free-unrestricted":
      return { color: STREET_COLORS[rule], weight: 6, opacity: 0.85 };
    default:
      return { color: STREET_COLORS.default, weight: 3, opacity: 0.5 };
  }
}

const ATM_COLOR = "#16405e";
const BOUNDARY_COLOR = "#324A6D";
const LINE_COLOR = "#2a7f8a";
const TRAIL_COLOR = "#4a7c59";
const AREA_COLOR = "#2a7f8a";

interface StreetSegment {
  name: string;
  rule: string;
  coords: [number, number][];
  note?: string;
}
interface StreetData {
  boundary: [number, number][];
  segments: StreetSegment[];
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function googleSearchUrl(name: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${name} Kingston WA`,
  )}`;
}

/** Rounded teardrop divIcon: an emoji chip on a white pin with a colored ring. */
function markerIconHtml(emoji: string, ring: string): string {
  return `<div style="position:relative;transform:translate(-50%,-100%);">
    <div style="width:30px;height:30px;border-radius:50% 50% 50% 0;background:#fff;border:2px solid ${ring};box-shadow:0 2px 4px rgba(0,0,0,0.3);transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;">
      <span style="transform:rotate(45deg);font-size:15px;line-height:1;">${emoji}</span>
    </div>
  </div>`;
}

/** Shared popup body for a custom feature. Escapes all user text. */
function featurePopupHtml(f: {
  title: string;
  notes?: string;
  imageUrl?: string;
  link?: string;
}): string {
  const parts: string[] = [
    `<p style="margin:0;font-weight:600;font-size:0.95rem;">${esc(f.title)}</p>`,
  ];
  if (f.notes) parts.push(`<p style="margin:4px 0 0;">${esc(f.notes)}</p>`);
  if (f.imageUrl) {
    parts.push(
      `<img src="/api/map/image?p=${encodeURIComponent(f.imageUrl)}" alt="${esc(
        f.title,
      )}" style="max-width:210px;border-radius:6px;margin-top:6px;" />`,
    );
  }
  if (f.link) {
    parts.push(
      `<p style="margin:6px 0 0;"><a href="${esc(
        f.link,
      )}" target="_blank" rel="noopener noreferrer">Directions / Open →</a></p>`,
    );
  }
  return `<div style="font-size:0.8rem;line-height:1.35;max-width:230px;">${parts.join(
    "",
  )}</div>`;
}

function restaurantPopupHtml(r: { name: string; walkMinutesFromFerry: number }): string {
  return `<div style="font-size:0.8rem;line-height:1.35;max-width:230px;">
    <p style="margin:0;font-weight:600;font-size:0.95rem;">🍽️ ${esc(r.name)}</p>
    <p style="margin:4px 0 0;">${r.walkMinutesFromFerry} min walk from the ferry</p>
    <p style="margin:6px 0 0;"><a href="${esc(
      googleSearchUrl(r.name),
    )}" target="_blank" rel="noopener noreferrer">Open in Google Maps →</a></p>
  </div>`;
}

function atmPopupHtml(a: { name: string; open24h: boolean }): string {
  const parts = [`<p style="margin:0;font-weight:600;font-size:0.95rem;">💵 ${esc(a.name)}</p>`];
  if (a.open24h) parts.push(`<p style="margin:4px 0 0;">Open 24 hours</p>`);
  return `<div style="font-size:0.8rem;line-height:1.35;max-width:230px;">${parts.join("")}</div>`;
}

// ---- legend entry model ----

interface LegendEntry {
  key: string;
  label: string;
  color: string;
  shape: "pin" | "line" | "dash" | "swatch" | "dot";
  emoji?: string;
}

export function FeatureMap({
  view,
  height = "460px",
  className = "",
}: {
  view: string;
  height?: string;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const [data, setData] = useState<ResolvedMapView | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [legend, setLegend] = useState<LegendEntry[]>([]);

  // Fetch the resolved view whenever `view` changes.
  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setData(null);
    (async () => {
      try {
        const res = await fetch(`/api/map/${encodeURIComponent(view)}`);
        if (!res.ok) throw new Error(`status ${res.status}`);
        const json = (await res.json()) as ResolvedMapView;
        if (cancelled) return;
        setData(json);
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [view]);

  // Build the map once data is ready. Tearing down + rebuilding on data change
  // keeps this component fully reusable across view switches.
  useEffect(() => {
    if (status !== "ready" || !data) return;
    let cancelled = false;
    const legendEntries = new Map<string, LegendEntry>();
    const addLegend = (e: LegendEntry) => {
      if (!legendEntries.has(e.key)) legendEntries.set(e.key, e);
    };

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        center: data.view.center,
        zoom: data.view.zoom,
        scrollWheelZoom: false, // don't hijack page scroll; pinch/± still zoom
      });
      mapRef.current = map;

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      // ---- custom features ----
      for (const f of data.features) {
        if (f.kind === "marker" && f.point) {
          const cat = markerCategory(f.category);
          const ring = f.color || cat.color;
          const icon = L.divIcon({
            className: "feature-pin",
            html: markerIconHtml(cat.emoji, ring),
            iconSize: [0, 0],
            popupAnchor: [0, -30],
          });
          L.marker(f.point, { icon })
            .addTo(map)
            .bindPopup(featurePopupHtml(f), { maxWidth: 240 });
          addLegend({
            key: `cat-${cat.key}`,
            label: cat.label,
            color: ring,
            shape: "pin",
            emoji: cat.emoji,
          });
        } else if (f.kind === "line" && f.path) {
          const color = f.color || LINE_COLOR;
          L.polyline(f.path, { color, weight: 4, opacity: 0.85 })
            .addTo(map)
            .bindPopup(featurePopupHtml(f), { maxWidth: 240 });
          addLegend({ key: "kind-line", label: "Route", color, shape: "line" });
        } else if (f.kind === "trail" && f.path) {
          const color = f.color || TRAIL_COLOR;
          L.polyline(f.path, { color, weight: 4, opacity: 0.9, dashArray: "6 6" })
            .addTo(map)
            .bindPopup(featurePopupHtml(f), { maxWidth: 240 });
          addLegend({ key: "kind-trail", label: "Trail", color, shape: "dash" });
        } else if (f.kind === "area" && f.polygon) {
          const color = f.color || AREA_COLOR;
          L.polygon(f.polygon, {
            color,
            weight: 2,
            fillColor: color,
            fillOpacity: 0.22,
          })
            .addTo(map)
            .bindPopup(featurePopupHtml(f), { maxWidth: 240 });
          addLegend({ key: "kind-area", label: "Area", color, shape: "swatch" });
        }
      }

      // ---- built-ins: restaurants ----
      const foodCat = markerCategory("food");
      for (const r of data.builtins.restaurants ?? []) {
        const icon = L.divIcon({
          className: "feature-pin",
          html: markerIconHtml(foodCat.emoji, foodCat.color),
          iconSize: [0, 0],
          popupAnchor: [0, -30],
        });
        L.marker([r.lat, r.lng], { icon })
          .addTo(map)
          .bindPopup(restaurantPopupHtml(r), { maxWidth: 240 });
        addLegend({
          key: "builtin-restaurant",
          label: "Food & drink",
          color: foodCat.color,
          shape: "pin",
          emoji: foodCat.emoji,
        });
      }

      // ---- built-ins: ATMs ----
      for (const a of data.builtins.atms ?? []) {
        L.circleMarker([a.lat, a.lng], {
          radius: 6,
          color: "#ffffff",
          weight: 2,
          fillColor: ATM_COLOR,
          fillOpacity: 1,
        })
          .addTo(map)
          .bindTooltip(`💵 ${a.name}`, { direction: "top", offset: [0, -6] })
          .bindPopup(atmPopupHtml(a), { maxWidth: 240 });
        addLegend({ key: "builtin-atm", label: "ATM / cash", color: ATM_COLOR, shape: "dot" });
      }

      // ---- built-ins: parking zones ----
      for (const z of data.builtins.parkingZones ?? []) {
        const color = parkingColor(z.rule);
        const popup = `<div style="font-size:0.8rem;line-height:1.35;max-width:230px;">
          <p style="margin:0;font-weight:600;font-size:0.95rem;">${esc(z.name)}</p>
          <p style="margin:4px 0 0;">${esc(z.summary)}</p>
        </div>`;
        if (z.polygon && z.polygon.length >= 3) {
          L.polygon(z.polygon, {
            color,
            weight: 2,
            fillColor: color,
            fillOpacity: 0.35,
          })
            .addTo(map)
            .bindPopup(popup, { maxWidth: 240 });
        } else {
          L.circleMarker(z.center, {
            radius: 7,
            color: "#ffffff",
            weight: 2,
            fillColor: color,
            fillOpacity: 0.9,
          })
            .addTo(map)
            .bindPopup(popup, { maxWidth: 240 });
        }
        addLegend({
          key: `parking-${z.rule}`,
          label: PARKING_RULE_LABELS[z.rule] ?? z.rule,
          color,
          shape: "swatch",
        });
      }

      // ---- built-ins: streets (fetched here) ----
      if (data.builtins.streets) {
        try {
          const res = await fetch("/geo/street-parking.json");
          if (res.ok && !cancelled && mapRef.current) {
            const street = (await res.json()) as StreetData;

            L.polygon(street.boundary, {
              color: BOUNDARY_COLOR,
              weight: 2,
              dashArray: "6 6",
              fill: false,
              interactive: false,
            }).addTo(map);

            // Draw quiet layers first so rule-bearing streets sit on top.
            const rank = (r: StreetRule) =>
              r === "default" ? 0 : r === "ferry-holding" ? 1 : 2;
            const ordered = [...street.segments].sort(
              (a, b) =>
                rank(normalizeStreetRule(a.rule)) - rank(normalizeStreetRule(b.rule)),
            );
            for (const seg of ordered) {
              const rule = normalizeStreetRule(seg.rule);
              const [title, subtitle] =
                rule === "ferry-holding"
                  ? [STREET_RULE_LABELS[rule], seg.name]
                  : [seg.name, STREET_RULE_LABELS[rule]];
              const popup = `<div style="font-size:0.8rem;line-height:1.35;max-width:230px;">
                <p style="margin:0;font-weight:600;font-size:0.95rem;">${esc(title)}</p>
                <p style="margin:4px 0 0;font-weight:600;color:${
                  STREET_COLORS[rule]
                };">${esc(subtitle)}</p>
                ${seg.note ? `<p style="margin:4px 0 0;">${esc(seg.note)}</p>` : ""}
              </div>`;
              L.polyline(seg.coords, streetStyle(rule))
                .addTo(map)
                .bindPopup(popup, { maxWidth: 240 });
              addLegend({
                key: `street-${rule}`,
                label:
                  rule === "ferry-holding"
                    ? "Ferry holding line"
                    : rule === "default"
                      ? "Street: no known limit"
                      : rule === "prohibited"
                        ? "Street: no parking"
                        : rule === "free-2hr"
                          ? "Street: free, 2-hr"
                          : "Street: free, no limit",
                color: STREET_COLORS[rule],
                shape: rule === "ferry-holding" ? "dash" : "line",
              });
            }
            addLegend({
              key: "street-boundary",
              label: "Kingston UGA",
              color: BOUNDARY_COLOR,
              shape: "dash",
            });
          }
        } catch {
          // Overlay is progressive enhancement — the base map still works.
        }
      }

      if (!cancelled) setLegend([...legendEntries.values()]);
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      setLegend([]);
    };
  }, [status, data]);

  return (
    <div className={className}>
      <style>{PIN_CSS}</style>
      <div className="relative">
        <div
          ref={containerRef}
          style={{ height }}
          className="relative z-0 w-full overflow-hidden rounded-2xl border border-sand"
          role="region"
          aria-label={`Map: ${view}`}
        />
        {status === "loading" && (
          <div className="pointer-events-none absolute inset-0 z-[400] flex items-center justify-center rounded-2xl bg-shell/60 text-sm text-ink-soft">
            Loading map…
          </div>
        )}
        {status === "error" && (
          <div className="absolute inset-0 z-[400] flex items-center justify-center rounded-2xl border border-sand bg-shell text-sm text-ink-soft">
            Map unavailable.
          </div>
        )}
      </div>
      {status === "ready" && legend.length > 0 && <MapLegend entries={legend} />}
    </div>
  );
}

const PIN_CSS = `
.feature-pin { background: transparent; border: none; }
`;

function LegendSwatch({ entry }: { entry: LegendEntry }) {
  switch (entry.shape) {
    case "pin":
      return (
        <span
          aria-hidden
          className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] leading-none"
          style={{ boxShadow: `0 0 0 2px ${entry.color}` }}
        >
          {entry.emoji}
        </span>
      );
    case "line":
      return (
        <span
          aria-hidden
          className="inline-block h-1 w-5 rounded-full"
          style={{ backgroundColor: entry.color }}
        />
      );
    case "dash":
      return (
        <span
          aria-hidden
          className="inline-block h-0 w-5 border-t-2 border-dashed"
          style={{ borderColor: entry.color }}
        />
      );
    case "dot":
      return (
        <span
          aria-hidden
          className="inline-block h-3 w-3 rounded-full ring-2 ring-white"
          style={{ backgroundColor: entry.color }}
        />
      );
    default:
      return (
        <span
          aria-hidden
          className="inline-block h-3 w-3 rounded-[3px]"
          style={{ backgroundColor: entry.color }}
        />
      );
  }
}

function MapLegend({ entries }: { entries: LegendEntry[] }) {
  return (
    <ul className="mt-3 flex max-h-28 flex-wrap gap-x-4 gap-y-2 overflow-y-auto text-sm text-ink-soft">
      {entries.map((e) => (
        <li key={e.key} className="flex items-center gap-1.5">
          <LegendSwatch entry={e} />
          {e.label}
        </li>
      ))}
    </ul>
  );
}
