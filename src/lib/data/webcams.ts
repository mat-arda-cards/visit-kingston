// WSDOT still cameras covering the Edmonds–Kingston ferry run.
// Image URLs verified live 2026-07-02. These are plain hotlinkable JPEGs on
// images.wsdot.wa.gov — no API key, no CORS headers, no Cache-Control, so the
// UI must append a cache-busting query param when it polls.
//
// Heads up on churn: the Kingston-side cameras moved to the orflow/104vc*.jpg
// paths with the 2026 SR 104 Traffic Management System rollout (announced
// April, live June 1). The old wsf/kingston/* terminal URLs are dead
// placeholders from 2003 that still appear in WSDOT's ArcGIS layer — do not
// resurrect them. If images stop updating, re-check the current list at
// https://wsdot.com/ferries/vesselwatch/cameradetail.aspx?terminalid=12
//
// refreshSeconds reflects measured source cadence: the newer orflow cams
// update roughly every 60s; the older wsf/* cams every 1–5 minutes.

import type { Webcam } from "@/lib/types";

const KINGSTON_CAMS_PAGE =
  "https://wsdot.com/ferries/vesselwatch/cameradetail.aspx?terminalid=12";
const EDMONDS_CAMS_PAGE =
  "https://wsdot.com/ferries/vesselwatch/cameradetail.aspx?terminalid=8";

export const webcams: Webcam[] = [
  // ---- Kingston side, ordered along the approach: Lindvog → Barber →
  // ---- ferry signs → toll booths → terminal.
  {
    id: "kingston-lindvog",
    name: "SR 104 at Lindvog Road",
    location: "First checkpoint coming into Kingston on SR 104",
    imageUrl: "https://images.wsdot.wa.gov/orflow/104vc02390.jpg",
    sourceUrl: KINGSTON_CAMS_PAGE,
    source: "WSDOT",
    refreshSeconds: 60,
  },
  {
    id: "kingston-barber",
    name: "SR 104 at Barber Cutoff Road",
    location: "About a mile out — if the line reaches here, it's a long one",
    imageUrl: "https://images.wsdot.wa.gov/orflow/104vc02314.jpg",
    sourceUrl: KINGSTON_CAMS_PAGE,
    source: "WSDOT",
    refreshSeconds: 60,
  },
  {
    id: "kingston-ferry-sign-east",
    name: "Ferry Sign East",
    location: "Roadside ferry reader board on SR 104, Kingston",
    imageUrl: "https://images.wsdot.wa.gov/wsf/kingston/fse/fse.jpg",
    sourceUrl: KINGSTON_CAMS_PAGE,
    source: "WSDOT",
    refreshSeconds: 120,
  },
  {
    id: "kingston-ferry-sign-west",
    name: "Ferry Sign West",
    location: "Roadside ferry reader board on SR 104, Kingston",
    imageUrl: "https://images.wsdot.wa.gov/wsf/kingston/fsw/fsw.jpg",
    sourceUrl: KINGSTON_CAMS_PAGE,
    source: "WSDOT",
    refreshSeconds: 120,
  },
  {
    id: "kingston-toll-booths",
    name: "Kingston Toll Booths",
    location: "SR 104 at the terminal toll booths",
    imageUrl: "https://images.wsdot.wa.gov/orflow/104vc02466.jpg",
    sourceUrl: KINGSTON_CAMS_PAGE,
    source: "WSDOT",
    refreshSeconds: 60,
  },
  {
    id: "kingston-terminal",
    name: "Kingston Terminal",
    location: "Ferry terminal and holding area, downtown Kingston",
    imageUrl: "https://images.wsdot.wa.gov/orflow/104vc02465.jpg",
    sourceUrl: KINGSTON_CAMS_PAGE,
    source: "WSDOT",
    refreshSeconds: 60,
  },

  // ---- Edmonds side, ordered along the approach: Pine → underpass →
  // ---- Dayton → holding lanes → wait-time sign.
  {
    id: "edmonds-pine",
    name: "SR 104 at Pine Street",
    location: "Approaching the Edmonds terminal on SR 104",
    imageUrl: "https://images.wsdot.wa.gov/wsf/edmonds/104pine.jpg",
    sourceUrl: EDMONDS_CAMS_PAGE,
    source: "WSDOT",
    refreshSeconds: 120,
  },
  {
    id: "edmonds-underpass",
    name: "SR 104 Underpass",
    location: "SR 104 underpass near the Edmonds terminal",
    imageUrl: "https://images.wsdot.wa.gov/wsf/edmonds/104underpass.jpg",
    sourceUrl: EDMONDS_CAMS_PAGE,
    source: "WSDOT",
    refreshSeconds: 120,
  },
  {
    id: "edmonds-dayton",
    name: "SR 104 at W Dayton Street",
    location: "Last turn before the Edmonds tollbooths",
    imageUrl: "https://images.wsdot.wa.gov/wsf/edmonds/104dayton.jpg",
    sourceUrl: EDMONDS_CAMS_PAGE,
    source: "WSDOT",
    refreshSeconds: 120,
  },
  {
    id: "edmonds-holding",
    name: "Edmonds Holding Lanes",
    location: "The money shot: how full is the Edmonds lot?",
    imageUrl: "https://images.wsdot.wa.gov/wsf/edmonds/holding.jpg",
    sourceUrl: EDMONDS_CAMS_PAGE,
    source: "WSDOT",
    refreshSeconds: 120,
  },
  {
    id: "edmonds-vms",
    name: "Wait-Time Sign",
    location: "Variable message sign on SR 104, Edmonds",
    imageUrl: "https://images.wsdot.wa.gov/wsf/edmonds/104vms_wts.jpg",
    sourceUrl: EDMONDS_CAMS_PAGE,
    source: "WSDOT",
    refreshSeconds: 120,
  },
];

export const kingstonWebcams = webcams.filter((w) => w.id.startsWith("kingston-"));
export const edmondsWebcams = webcams.filter((w) => w.id.startsWith("edmonds-"));
