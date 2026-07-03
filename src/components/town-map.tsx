"use client";

// Interactive Leaflet map of Kingston parking zones + ATMs.
// Leaflet touches `window` at module scope, so it is imported dynamically
// inside useEffect — this component renders an empty shell on the server
// and hydrates the map on the client. Leaflet's CSS is imported globally
// in globals.css.
//
// Default Leaflet marker icons are deliberately NOT used (their asset paths
// break under bundlers); zones render as polygons/circle markers, ATMs as
// small navy circle markers. Marker colors are intentionally hex — they live
// on the map canvas, not in the page's token system.

import { useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";
import type { MapZone, ParkingRule } from "@/lib/data/parking";
import type { Atm } from "@/lib/types";

const RULE_COLORS: Record<ParkingRule, string> = {
  "free-2hr": "#2e9e4f",
  "free-unrestricted": "#1E96C0",
  paid: "#7c4dbe",
  "park-and-ride-24h": "#e8891d",
  prohibited: "#d43d3d",
};

const ATM_COLOR = "#16405e"; // dark navy

const RULE_LEGEND: { rule: ParkingRule; label: string }[] = [
  { rule: "free-2hr", label: "Free · 2-hr limit" },
  { rule: "free-unrestricted", label: "Free · no limit" },
  { rule: "paid", label: "Paid" },
  { rule: "park-and-ride-24h", label: "Park & ride · 24 hr" },
  { rule: "prohibited", label: "No parking" },
];

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function overnightLine(zone: MapZone): string {
  if (zone.overnight === "yes") return "Overnight: OK";
  if (zone.overnight === "no") return "Overnight: No";
  return zone.id.startsWith("port-")
    ? "Overnight: Call the Port office first — 360-297-3545"
    : "Overnight: Confirm on-site first";
}

function directionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
}

function zonePopupHtml(zone: MapZone): string {
  const parts: string[] = [
    `<p style="margin:0;font-weight:600;font-size:0.95rem;">${esc(zone.name)}</p>`,
    `<p style="margin:4px 0 0;">${esc(zone.summary)}</p>`,
    `<p style="margin:4px 0 0;font-weight:600;">${esc(overnightLine(zone))}</p>`,
  ];
  if (zone.confidence !== "verified") {
    parts.push(
      `<p style="margin:4px 0 0;font-style:italic;">${esc(
        zone.sourceNote ?? "Per 2015 county study — obey posted signs."
      )}</p>`
    );
  }
  const links: string[] = [];
  if (zone.sourceUrl) {
    links.push(
      `<a href="${esc(zone.sourceUrl)}" target="_blank" rel="noopener noreferrer">Source</a>`
    );
  }
  links.push(
    `<a href="${esc(directionsUrl(zone.center[0], zone.center[1]))}" target="_blank" rel="noopener noreferrer">Directions</a>`
  );
  parts.push(`<p style="margin:6px 0 0;">${links.join(" · ")}</p>`);
  return `<div style="font-size:0.8rem;line-height:1.35;max-width:230px;">${parts.join("")}</div>`;
}

function atmPopupHtml(atm: Atm): string {
  const parts: string[] = [
    `<p style="margin:0;font-weight:600;font-size:0.95rem;">💵 ${esc(atm.name)}</p>`,
    `<p style="margin:4px 0 0;">${esc(atm.address)}</p>`,
    `<p style="margin:4px 0 0;">${esc(atm.feeNote)}</p>`,
    `<p style="margin:6px 0 0;"><a href="${esc(
      directionsUrl(atm.lat, atm.lng)
    )}" target="_blank" rel="noopener noreferrer">Directions</a></p>`,
  ];
  return `<div style="font-size:0.8rem;line-height:1.35;max-width:230px;">${parts.join("")}</div>`;
}

export function TownMap({
  zones = [],
  atms = [],
  height = "460px",
  center = [47.7985, -122.4975],
  zoom = 15,
}: {
  zones?: MapZone[];
  atms?: Atm[];
  height?: string;
  center?: [number, number];
  zoom?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      // Guard: unmounted while loading, or already initialized (StrictMode).
      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        center,
        zoom,
        scrollWheelZoom: false, // don't hijack page scroll; pinch/±-buttons still zoom
      });
      mapRef.current = map;

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      for (const zone of zones) {
        const color = RULE_COLORS[zone.rule];
        const popup = zonePopupHtml(zone);
        if (zone.polygon && zone.polygon.length >= 3) {
          L.polygon(zone.polygon, {
            color,
            weight: 2,
            fillColor: color,
            fillOpacity: 0.35,
          })
            .addTo(map)
            .bindPopup(popup, { maxWidth: 260 });
          // A polygon this small is a fiddly tap target on a phone — add a
          // matching center marker as well.
          L.circleMarker(zone.center, {
            radius: 7,
            color,
            weight: 2,
            fillColor: color,
            fillOpacity: 0.9,
          })
            .addTo(map)
            .bindPopup(popup, { maxWidth: 260 });
        } else {
          L.circleMarker(zone.center, {
            radius: 9,
            color,
            weight: 2,
            fillColor: color,
            fillOpacity: zone.rule === "prohibited" ? 0.55 : 0.8,
          })
            .addTo(map)
            .bindPopup(popup, { maxWidth: 260 });
        }
      }

      for (const atm of atms) {
        L.circleMarker([atm.lat, atm.lng], {
          radius: 6,
          color: "#ffffff",
          weight: 2,
          fillColor: ATM_COLOR,
          fillOpacity: 1,
        })
          .addTo(map)
          .bindTooltip(`💵 ${atm.name}`, { direction: "top", offset: [0, -6] })
          .bindPopup(atmPopupHtml(atm), { maxWidth: 260 });
      }
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // Data arrays and view options are static page data; re-running the effect
    // would tear the map down mid-interaction.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ height }}
      className="relative z-0 w-full overflow-hidden rounded-2xl border border-sand"
      role="region"
      aria-label="Map of Kingston parking zones and ATMs"
    />
  );
}

/** Color key for the map — render as a sibling right under <TownMap />. */
export function MapLegend({ showAtms = true }: { showAtms?: boolean }) {
  return (
    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-ink-soft">
      {RULE_LEGEND.map(({ rule, label }) => (
        <li key={rule} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="inline-block h-3 w-3 rounded-full"
            style={{ backgroundColor: RULE_COLORS[rule] }}
          />
          {label}
        </li>
      ))}
      {showAtms && (
        <li className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="inline-block h-3 w-3 rounded-full ring-2 ring-white"
            style={{ backgroundColor: ATM_COLOR }}
          />
          ATM
        </li>
      )}
    </ul>
  );
}
