// Kingston parking — rewritten from research verified July 2, 2026 against:
//   Port of Kingston live parking page: https://portofkingston.org/port-of-kingston-parking/
//   Port 2025 Parking Policy PDF + official parking map dated 12-30-25
//     (POKPARK / POKHILL / POKTT text-to-pay zones, 25023 short code)
//   WSDOT Kingston terminal page (Diamond lot D515, 73 stalls, $8/$12 + multi-day rates)
//   Diamond PermitPoint: monthly permit $125.70 as of July 2026 (WSDOT's $100 figure is stale)
//   Kitsap Transit park & ride list (George's Corner, Bayside Community Church)
//   Kitsap County Complete Streets Transportation Report (Heffron, May 2016 — the only
//     public per-street source; its curb inventory dates to 2015, so every street entry
//     below is "probable" and labeled "per 2015 county study — obey posted signs")
//   KCC 46.02/46.04 + RCW 46.55.085 (no county overnight ban; 24-hr abandoned-vehicle rule)
//
// IMPORTANT corrections baked in (they override earlier drafts):
//   - Overnight in Port numbered spaces is PROBABLE, not confirmed — the Port never
//     explicitly authorizes it for cars. Publish "call the Port office first: 360-297-3545".
//   - No RV parking on Port property, period (per the Port's live website — stricter
//     than the policy PDF; we publish the conservative version).
//   - The free 2-hour row is ~30 stalls (schematic count), not 40.
//   - Pennsylvania Ave is unrestricted on ONE SIDE ONLY; the other side is no-parking.
//   - Diamond D515 is 73 stalls per WSF (Parkopedia says 71).
//
// Port section polygons (July 2, 2026): georeferenced from the Port's official
// 12-30-25 schematic map against OSM anchors (±10–15 m). They are deliberately
// hand-adjustable — a Chamber admin can drag any shape or pin to reality at
// /admin/map (edits overlay this seed via the "parking-zones" JSON store).
//
// The Port revises rates and Diamond reprices permits — re-verify quarterly.

import type { ParkingArea } from "../types";

/* ------------------------------------------------------------------ */
/* Rich map dataset (used by the town map + parking page)              */
/* ------------------------------------------------------------------ */

export type ParkingRule =
  | "free-2hr"
  | "free-unrestricted"
  | "paid"
  | "park-and-ride-24h"
  | "prohibited"
  | "load-zone"
  | "permit";

export interface MapZone {
  id: string;
  name: string;
  rule: ParkingRule;
  /** One-line gist shown in popups and card headers. */
  summary: string;
  /** Longer prose for cards. */
  details: string;
  confidence: "verified" | "probable" | "unverified";
  sourceUrl?: string;
  /** Caveat surfaced whenever confidence is not "verified". */
  sourceNote?: string;
  overnight: "yes" | "no" | "confirm-first";
  /** [lat, lng] */
  center: [number, number];
  /** Optional outline for lots/rows with known corner coordinates. */
  polygon?: [number, number][];
}

export const RULE_LABELS: Record<ParkingRule, string> = {
  "free-2hr": "Free — 2-hour limit",
  "free-unrestricted": "Free — no time limit",
  paid: "Paid",
  "park-and-ride-24h": "Park & ride — 24 hr max",
  prohibited: "No parking",
  "load-zone": "Loading / dropoff only",
  permit: "Permit holders only",
};

const STUDY_NOTE = "Per 2015 county study — obey posted signs.";
const STUDY_URL =
  "https://portofkingston.org/wp-content/uploads/2022/10/Kingston-Complete-Streets-Transportation-report.pdf";
const PORT_PARKING_URL = "https://portofkingston.org/port-of-kingston-parking/";
const PORT_MAP_URL =
  "https://portofkingston.org/wp-content/uploads/2025/12/Updated-Parking-Map-12-30-25.pdf";
const KITSAP_TRANSIT_PR_URL =
  "https://www.kitsaptransit.com/rider-resources/park-and-ride-lots";

/** Caveat for every polygon georeferenced from the Port's schematic map. */
const PORT_GEO_NOTE =
  "Outline georeferenced from the Port's official 12-30-25 schematic map (±10–15 m) — the painted stall markings on the ground always win.";

export const parkingZones: MapZone[] = [
  /* ---------------- Port of Kingston (georeferenced sections) ---------------- */
  {
    id: "port-free-2hr-row",
    name: "Port free 2-hour row",
    rule: "free-2hr",
    summary:
      "Free — 2 hours, strictly enforced (~30 stalls). No payment/text code. Port says do NOT use it for ferry travel.",
    details:
      "Double-loaded row between paid row 214–233 (west) and Mike Wallace Park (east), just north of the park restrooms. Overstay is a $40 ticket (doubles after 15 days). If a ferry delay traps you, call the Port office before your 2 hours expire: 360-297-3545.",
    confidence: "probable",
    sourceUrl: PORT_MAP_URL,
    sourceNote: PORT_GEO_NOTE,
    overnight: "no",
    center: [47.79646, -122.497546],
    polygon: [
      [47.796653, -122.49731],
      [47.796548, -122.497235],
      [47.796267, -122.497781],
      [47.796373, -122.497856],
    ],
  },
  {
    id: "port-pokpark-main-rows",
    name: "POKPARK main lot — spaces 1–88",
    rule: "paid",
    summary:
      "$12/12 hr car · $6 motorcycle · $3.49/hr short-term — text POKPARK to 25023 (T2 Mobile Pay). Spaces 1–88.",
    details:
      "The fan of seven angled rows filling the west half of the marina lot (rows 67–88, 47–66, 32–46, 19–31, 11–18, 5–10, 1–4), widest at the hill-road end and narrowing east toward the restroom island. Seaward (south) ends of most rows are marina-tenant permit stalls — see the separate permit band. Also pay at the Marina Office 8–5 or by card by phone 360-297-3545. Monthly commuter permit $139.99 (limited; daily use, not storage). Overnight for cars is never explicitly authorized — call the Port office first. No RVs on Port property.",
    confidence: "probable",
    sourceUrl: PORT_PARKING_URL,
    sourceNote: PORT_GEO_NOTE,
    overnight: "confirm-first",
    center: [47.796492, -122.498494],
    polygon: [
      [47.797148, -122.498662],
      [47.79639, -122.498089],
      [47.796264, -122.498135],
      [47.796357, -122.498296],
      [47.796399, -122.498549],
      [47.796433, -122.498801],
      [47.796452, -122.498926],
    ],
  },
  {
    id: "port-pokpark-89-103",
    name: "POKPARK north strip — spaces 89–103",
    rule: "paid",
    summary:
      "$12/12 hr — text POKPARK to 25023. Spaces 89–103, single row along the north edge of the lot, west of the KCYC clubhouse.",
    details:
      "Short east–west strip on the lot's north boundary, west-southwest of the Kingston Cove Yacht Club building. The eastern continuation of this same strip (closest to the clubhouse) is the KCYC-permit-only row — a separate section. Same payment options and overnight rule as the main POKPARK lot (Port office 360-297-3545).",
    confidence: "probable",
    sourceUrl: PORT_PARKING_URL,
    sourceNote: PORT_GEO_NOTE,
    overnight: "confirm-first",
    center: [47.797112, -122.498372],
    polygon: [
      [47.797299, -122.498478],
      [47.796951, -122.498215],
      [47.796925, -122.498265],
      [47.797272, -122.498528],
    ],
  },
  {
    id: "port-pokpark-181-233",
    name: "POKPARK east block — spaces 181–233",
    rule: "paid",
    summary:
      "$12/12 hr — text POKPARK to 25023. Rows 181–190 and 214–233 plus row 201–213 by the Washington Blvd entrance.",
    details:
      "L-shaped block just inside the Washington Blvd entrance: the 201–213 row along the north edge near the entrance and Shed, and the back-to-back 181–190 / 214–233 columns running south toward the restrooms, immediately west of the free 2-hour row. Includes three employee-only stalls mid-column (Emp) and tenant/disabled stalls at the south end. Same rates, payment options and overnight rule as the rest of POKPARK (Port office 360-297-3545).",
    confidence: "probable",
    sourceUrl: PORT_PARKING_URL,
    sourceNote: PORT_GEO_NOTE,
    overnight: "confirm-first",
    center: [47.796718, -122.497459],
    polygon: [
      [47.797053, -122.497042],
      [47.79686, -122.496906],
      [47.796732, -122.497154],
      [47.796787, -122.497193],
      [47.796359, -122.498027],
      [47.796406, -122.49806],
      [47.796543, -122.497794],
      [47.796614, -122.497844],
      [47.796905, -122.497277],
      [47.796925, -122.49729],
    ],
  },
  {
    id: "port-pokhill",
    name: "POKHILL hill zone — spaces 104–162",
    rule: "paid",
    summary:
      "$12/12 hr — text POKHILL to 25023. Spaces 104–132 (east side) + truck/trailer overflow 133–162 (west side) on the hill above the boat launch.",
    details:
      "Long north–south double-loaded strip between the two legs of the hill loop road northwest of the marina lot, climbing from the boat-launch road junction. Spaces 104–132 face the east leg; 133–162 (truck & trailer overflow) face the west leg. Same rates and text-to-pay as the main lot; overnight — call the Port office first (360-297-3545).",
    confidence: "probable",
    sourceUrl: PORT_PARKING_URL,
    sourceNote: PORT_GEO_NOTE,
    overnight: "confirm-first",
    center: [47.797744, -122.498755],
    polygon: [
      [47.79821, -122.498855],
      [47.798215, -122.49866],
      [47.79728, -122.498645],
      [47.79727, -122.49886],
    ],
  },
  {
    id: "port-poktt",
    name: "POKTT truck & trailer zone — spaces 301–318",
    rule: "paid",
    summary:
      "Trucks with boat trailers ONLY — $15/12 hr or $30/24 hr. Text POKTT to 25023. Spaces 301–318 along the boat-launch road.",
    details:
      "Angled long stalls hugging the southeast side of the road that descends from the hill zone to the launch ramp, ending at the ADA stalls just above the ramp. Regular cars may not park here. Trailers may not be dropped without the truck attached; unattended boats on trailers need Port approval. Multi-day: coordinate with the Port office (360-297-3545).",
    confidence: "probable",
    sourceUrl: PORT_PARKING_URL,
    sourceNote: PORT_GEO_NOTE,
    overnight: "confirm-first",
    center: [47.796856, -122.498994],
    polygon: [
      [47.797228, -122.498836],
      [47.796875, -122.499069],
      [47.79653, -122.499297],
      [47.796486, -122.49915],
      [47.796831, -122.498922],
      [47.797184, -122.498689],
    ],
  },
  {
    id: "port-15min-dropoff",
    name: "15-minute dropoff — Mike Wallace Park",
    rule: "load-zone",
    summary:
      "15-minute dropoff/loading stalls at the park's northwest corner, by the stage. Free, 15 minutes max.",
    details:
      "Two short angled rows flanking the '15-minute Dropoff' sign on the drive between the free 2-hour row and the Mike Wallace Park stage. The outline includes the adjacent ADA (disabled) stalls in the same band. Not for ferry loading or waiting.",
    confidence: "probable",
    sourceUrl: PORT_MAP_URL,
    sourceNote: PORT_GEO_NOTE,
    overnight: "no",
    center: [47.796238, -122.497326],
    polygon: [
      [47.796397, -122.497249],
      [47.796092, -122.497323],
      [47.796085, -122.497398],
      [47.796378, -122.497335],
    ],
  },
  {
    id: "port-tenant-permit-row-ends",
    name: "Marina tenant permit stalls (row ends)",
    rule: "permit",
    summary:
      "Marina tenant permit required — the seaward ends of main-lot rows 1–88, along the promenade side. Not open to visitors.",
    details:
      "A diagonal band of purple-signed stalls across the south/seaward ends of the angled rows, closest to the docks. Reserved for moorage tenants with Port permits; visitors parking here risk a $40–50 ticket. Boundary between paid yellow stalls and tenant stalls varies row by row — obey stall markings.",
    confidence: "probable",
    sourceUrl: PORT_MAP_URL,
    sourceNote: PORT_GEO_NOTE,
    overnight: "no",
    center: [47.796309, -122.498487],
    polygon: [
      [47.796456, -122.498925],
      [47.796377, -122.498419],
      [47.796318, -122.49805],
      [47.796254, -122.498074],
      [47.796173, -122.498231],
      [47.79625, -122.498466],
      [47.796288, -122.49877],
      [47.79636, -122.49896],
    ],
  },
  {
    id: "port-tenant-permit-restrooms",
    name: "Marina tenant permit block (by park restrooms)",
    rule: "permit",
    summary:
      "Marina tenant permit required — small block between the free 2-hour row and the Mike Wallace Park restrooms.",
    details:
      "Purple-signed tenant stalls immediately south of the free 2-hour row and north/west of the park restrooms. Permit holders only; not visitor parking.",
    confidence: "probable",
    sourceUrl: PORT_MAP_URL,
    sourceNote: PORT_GEO_NOTE,
    overnight: "no",
    center: [47.796178, -122.497673],
    polygon: [
      [47.796308, -122.497539],
      [47.7962, -122.497509],
      [47.796107, -122.497691],
      [47.796116, -122.497798],
      [47.796159, -122.497828],
    ],
  },
  {
    id: "port-kcyc-permit-row",
    name: "KCYC permit-only row",
    rule: "permit",
    summary:
      "Kingston Cove Yacht Club permit only — eastern half of the north strip, just southwest of the KCYC clubhouse.",
    details:
      "Red 'K' stalls continuing east from spaces 89–103 along the lot's north edge, beside the yacht club building. KCYC members with permits only.",
    confidence: "probable",
    sourceUrl: PORT_MAP_URL,
    sourceNote: PORT_GEO_NOTE,
    overnight: "no",
    center: [47.796823, -122.498154],
    polygon: [
      [47.796951, -122.498215],
      [47.796725, -122.498048],
      [47.79669, -122.498086],
      [47.796925, -122.498265],
    ],
  },
  {
    id: "port-boat-launch-apron",
    name: "Boat launch ramp & apron",
    rule: "load-zone",
    summary:
      "Launch/rigging apron at the public boat launch — active launching and retrieval only, no parking.",
    details:
      "Paved turnaround and staging apron at the foot of the launch road, with the launch float alongside. ADA stalls sit just northeast at the end of the POKTT band. After launching, trucks with trailers must pay and park in POKTT (301–318) or the POKHILL overflow (133–162).",
    confidence: "probable",
    sourceUrl: PORT_MAP_URL,
    sourceNote: PORT_GEO_NOTE,
    overnight: "no",
    center: [47.796355, -122.49936],
    polygon: [
      [47.796481, -122.499328],
      [47.796313, -122.499228],
      [47.796233, -122.499399],
      [47.796392, -122.499486],
    ],
  },

  /* ---------------- Diamond / WSDOT lot ---------------- */
  {
    id: "diamond-d515",
    name: "Diamond lot D515 (WSDOT commuter lot)",
    rule: "paid",
    summary:
      "$8 for 0–12 hr, $12 for 12–24 hr — overnight OK. 73 stalls at NE 1st St & Ohio Ave, one block from the ferry. Free with a disabled placard.",
    details:
      "The WSDOT-owned, Diamond-operated lot at 26613 Ohio Ave NE — the angled strip on NE 1st St between Ohio and Iowa, a 5-minute walk to the tollbooths. Overnight and multi-day parking allowed (WSF publishes rates from 2 days $24 up to 7 days $38). Monthly permit $125.70 all-in via Diamond PermitPoint, valid 24/7. Pay at the kiosk (card) or with PayByPhone / ParkMobile. Vehicles with a valid disabled placard or plate park free — this lot only. Questions: Diamond Parking, 206-729-0590.",
    confidence: "verified",
    sourceUrl:
      "https://wsdot.com/ferries/vesselwatch/terminaldetail.aspx?terminalid=12",
    overnight: "yes",
    center: [47.798685, -122.496815],
    polygon: [
      [47.798349, -122.496296],
      [47.798447, -122.496441],
      [47.79902, -122.497305],
      [47.798968, -122.497232],
    ],
  },

  /* ---------------- Park & rides ---------------- */
  {
    id: "georges-corner-pr",
    name: "George's Corner Park & Ride",
    rule: "park-and-ride-24h",
    summary:
      "Free, 225 stalls, max 24 hours. SR 104 × Hansville Rd, ~2.5 mi from the dock; buses 307 & 391 run to the ferry.",
    details:
      "Kitsap Transit lot at 27618 Hansville Rd NE: free, paved, lit, with a shelter, bike racks/lockers and 4 free EV chargers. Kitsap Transit's posted rule: park & rides are intended for day use and parking is limited to no more than 24 hours — so it works for a day trip, but not for multi-day ferry parking. Routes 307 (Kingston/North Viking Fast Ferry Express) and 391 (Kingston/Bainbridge) connect to the dock.",
    confidence: "verified",
    sourceUrl: KITSAP_TRANSIT_PR_URL,
    overnight: "no",
    center: [47.81256, -122.53962],
  },
  {
    id: "bayside-pr",
    name: "Bayside Community Church Park & Ride",
    rule: "park-and-ride-24h",
    summary:
      "Free, 210 stalls, max 24 hours. Barber Cut Off Rd, ~0.8 mi west of downtown; buses 302 & 391.",
    details:
      "Church lot at 25992 Barber Cut Off Rd NE shared as an official Kitsap Transit park & ride — the only church lot in Kingston with a documented ferry-commuter arrangement. Free, paved, lit; same Kitsap Transit rule: day use, no more than 24 hours. Served by Routes 302 and 391.",
    confidence: "verified",
    sourceUrl: KITSAP_TRANSIT_PR_URL,
    sourceNote:
      "Lot rules verified with Kitsap Transit; pin placement should be double-checked against aerial imagery before print use.",
    overnight: "no",
    center: [47.7987, -122.50823],
  },

  /* ---------------- 2-hour streets (2015 county study) ---------------- */
  {
    id: "street-ne-1st",
    name: "NE 1st St (Ohio–Iowa)",
    rule: "free-2hr",
    summary: "Free on-street parking, posted 2-hour limit in the downtown core.",
    details:
      "The county's downtown parking inventory shows a posted 2-hour limit here, meant to keep spaces turning over for shop customers. Posted hours of the limit aren't documented online — read the sign on the pole; it is the legal authority.",
    confidence: "probable",
    sourceUrl: STUDY_URL,
    sourceNote: STUDY_NOTE,
    overnight: "no",
    center: [47.79862, -122.49724],
  },
  {
    id: "street-ohio-ave",
    name: "Ohio Ave NE (NE 1st–NE 2nd)",
    rule: "free-2hr",
    summary: "Free on-street parking, posted 2-hour limit.",
    details:
      "2-hour limit per the county parking inventory. Free; check the posted sign for the hours the limit applies.",
    confidence: "probable",
    sourceUrl: STUDY_URL,
    sourceNote: STUDY_NOTE,
    overnight: "no",
    center: [47.79965, -122.49525],
  },
  {
    id: "street-iowa-ave",
    name: "Iowa Ave NE (SR 104–NE 3rd)",
    rule: "free-2hr",
    summary: "Free on-street parking, posted 2-hour limit.",
    details:
      "2-hour limit per the county parking inventory. Free; check the posted sign for the hours the limit applies.",
    confidence: "probable",
    sourceUrl: STUDY_URL,
    sourceNote: STUDY_NOTE,
    overnight: "no",
    center: [47.7995, -122.4965],
  },
  {
    id: "street-ne-2nd",
    name: "NE 2nd St (Iowa–Washington)",
    rule: "free-2hr",
    summary: "Free on-street parking, posted 2-hour limit.",
    details:
      "2-hour limit per the county parking inventory. Free; check the posted sign for the hours the limit applies.",
    confidence: "probable",
    sourceUrl: STUDY_URL,
    sourceNote: STUDY_NOTE,
    overnight: "no",
    center: [47.79981, -122.49709],
  },
  {
    id: "street-illinois-ave",
    name: "Illinois Ave NE (mixed)",
    rule: "free-2hr",
    summary:
      "2-hour limit on the lower blocks near SR 104; unrestricted on the upper blocks toward NE 3rd/4th.",
    details:
      "The county inventory shows a split: time-restricted (2-hour) close to SR 104, unrestricted free parking farther up the hill. The block-by-block boundary is only as current as the 2015 survey — go by the signs.",
    confidence: "probable",
    sourceUrl: STUDY_URL,
    sourceNote: STUDY_NOTE,
    overnight: "no",
    center: [47.8008, -122.49649],
  },

  /* ---------------- Unrestricted streets ---------------- */
  {
    id: "street-georgia-ave",
    name: "NE Georgia Ave",
    rule: "free-unrestricted",
    summary:
      "Free, no time limit — the closest truly unlimited street parking to the ferry (with Pennsylvania Ave).",
    details:
      "Inventoried as unrestricted — part of ~90 unrestricted on-street spaces downtown that sat only ~30% full even at peak. Overnight is lawful where no sign restricts it, but a vehicle left in the right-of-way more than 24 hours can be tagged as apparently abandoned and impounded (RCW 46.55.085) — park overnight, don't store.",
    confidence: "probable",
    sourceUrl: STUDY_URL,
    sourceNote: STUDY_NOTE,
    overnight: "yes",
    center: [47.801539, -122.499129],
  },
  {
    id: "street-pennsylvania-ave",
    name: "Pennsylvania Ave NE (one side only)",
    rule: "free-unrestricted",
    summary:
      "Free, no time limit — but on ONE SIDE of the street only. The other side is no-parking.",
    details:
      "The county inventory shows unrestricted parking on one side of Pennsylvania Ave only, with the opposite side (and the stretch near Central Ave) marked no-parking. Same overnight rule as Georgia Ave: lawful where unsigned, but 24+ hours risks abandoned-vehicle tagging under RCW 46.55.085.",
    confidence: "probable",
    sourceUrl: STUDY_URL,
    sourceNote: STUDY_NOTE,
    overnight: "yes",
    center: [47.801407, -122.497531],
  },

  /* ---------------- Prohibited streets ---------------- */
  {
    id: "street-central-ave",
    name: "Central Ave NE",
    rule: "prohibited",
    summary: "No parking along essentially the whole street (bike lanes).",
    details:
      "The main outbound route from the Port to SR 104 — marked prohibited for parking in the county inventory, and it carries bike lanes. Don't park here.",
    confidence: "probable",
    sourceUrl: STUDY_URL,
    sourceNote: STUDY_NOTE,
    overnight: "no",
    center: [47.7997, -122.49836],
  },
  {
    id: "street-washington-blvd",
    name: "Washington Blvd NE",
    rule: "prohibited",
    summary: "No parking — this is the ferry offload route.",
    details:
      "Marked prohibited in the county inventory. SR 104 outside the downtown core and NE West Kingston Rd are also no-parking, and much of the eastbound SR 104 shoulder is striped/signed against ferry-queue parking.",
    confidence: "probable",
    sourceUrl: STUDY_URL,
    sourceNote: STUDY_NOTE,
    overnight: "no",
    center: [47.79855, -122.49419],
  },

  /* ---------------- Unverified — field-check before relying on these ---------------- */
  {
    id: "washington-blvd-lot",
    name: "Washington Blvd lot (32 spaces) — unverified",
    rule: "paid",
    summary:
      "UNVERIFIED — the 2016 county study lists a 32-space public pay lot between Main St and NE 1st; its current operator and payment status are unknown.",
    details:
      "The grass/gravel triangle at roughly 11420 NE 1st St, between NE 1st St, Ohio Ave and Washington Blvd. Listed as the smallest public pay lot in the 2016 study, but nothing current confirms who runs it or how (or whether) you pay in 2026. Field-check before counting on it.",
    confidence: "unverified",
    sourceUrl: STUDY_URL,
    sourceNote: "Unverified — needs an on-the-ground check before you rely on it.",
    overnight: "confirm-first",
    center: [47.798077, -122.496023],
  },
  {
    id: "sr104-wedge-lot",
    name: "Small 2-hour lot at SR 104 / NE 1st split — unverified",
    rule: "free-2hr",
    summary:
      "UNVERIFIED — OpenStreetMap tags a small public lot here with a 2-hour max stay; the only source is the map tag.",
    details:
      "A small lot in the wedge west of NE 1st St where it splits from SR 104, behind the buildings near Iowa Ave. OSM says public access with a 2-hour limit, but no official source confirms it. Verify the signage on the ground before treating it as public parking.",
    confidence: "unverified",
    sourceUrl: "https://www.openstreetmap.org/way/118260727",
    sourceNote: "Unverified — needs an on-the-ground check before you rely on it.",
    overnight: "no",
    center: [47.799109, -122.498188],
  },
];

/* ------------------------------------------------------------------ */
/* Legacy flat list (types.ts shape) for existing consumers            */
/* ------------------------------------------------------------------ */

export const parkingAreas: ParkingArea[] = [
  {
    id: "port-of-kingston-lot",
    name: "Port of Kingston lot",
    type: "lot",
    address: "Port of Kingston Marina, Kingston, WA 98346",
    rates:
      "$12 per 12 hours (standard vehicle) · $6 motorcycle · $15 truck + trailer ($30/24 hrs) · $3.49/hr short-term · monthly commuter permit $139.99 (limited supply)",
    timeLimit:
      "Paid by the 12-hour block; overnight for cars — call the Port office first (360-297-3545). No RV parking on Port property.",
    notes:
      "Right next to the marina and a 2–3 minute walk to the ferry. Every numbered space is paid. Pay by phone with T2 Mobile Pay (text the zone code on the lot signs — POKPARK, POKHILL or POKTT — to 25023), with cash or card at the Marina Office (8–5), or by card over the phone: 360-297-3545. Unpaid tickets double after 15 days; three or more can mean a boot or tow.",
    lat: 47.7967,
    lng: -122.498,
  },
  {
    id: "port-free-2hr-zone",
    name: "Free 2-hour zone (Port marina)",
    type: "street",
    address: "Port of Kingston Marina, Kingston, WA 98346",
    rates: "Free",
    timeLimit: "2 hours, strictly enforced (~30 stalls)",
    notes:
      "Great for a quick lunch or a stroll on the pier — but the Port explicitly says not to use it for ferry travel. If a ferry delay traps you, call the Port office before the two hours expire to request an extension. There are also 15-minute loading zones near the marina.",
    // Corrected July 2026: the old pin (47.79678, -122.4967) sat ~70 m northeast,
    // on the 201–213 row by the Washington Blvd entrance.
    lat: 47.79646,
    lng: -122.497546,
  },
  {
    id: "diamond-d515-lot",
    name: "Diamond Parking lot D515 (WSDOT commuter lot)",
    type: "lot",
    address: "26613 Ohio Ave NE, Kingston, WA 98346",
    rates:
      "$8 for 0–12 hours · $12 for 12–24 hours · multi-day rates from 2 days $24 to 7 days $38 · monthly permit $125.70 via Diamond PermitPoint",
    timeLimit: "Overnight and multi-day parking allowed",
    notes:
      "73 spaces one block from the tollbooths — about a 5-minute walk. Vehicles with a valid disabled placard or plate park free (this lot only). Pay by card at the kiosk, or with the PayByPhone or ParkMobile apps. Questions: Diamond Parking, 206-729-0590.",
    lat: 47.798685,
    lng: -122.496815,
  },
  {
    id: "sr104-ferry-holding",
    name: "SR 104 ferry holding lanes",
    type: "ferry-holding",
    address: "Kingston Ferry Terminal, 11264 NE State Route 104, Kingston, WA 98346",
    rates: "Not parking — this is the line for the boat",
    notes:
      "During peak periods (daily 8 am–8 pm), ferry traffic on SR 104 stops at Barber Cutoff Rd, takes a boarding pass from the dispenser, and waits for green lights before advancing to the tollbooths. Leave the line and your pass is void — you start over. There are no vehicle reservations on the Edmonds–Kingston run; the line is the system.",
    lat: 47.793,
    lng: -122.509,
  },
  {
    id: "georges-corner-park-and-ride",
    name: "George's Corner Park & Ride",
    type: "lot",
    address: "27618 Hansville Rd NE, Kingston, WA 98346",
    rates: "Free",
    timeLimit: "Maximum 24 hours — day-use lot, not multi-day",
    notes:
      "At SR 104 and Hansville Rd, about 2.5 miles from the dock. Free with 225 stalls, lighting, a shelter and 4 free EV chargers. Kitsap Transit Routes 307 and 391 connect to the ferry — good for a day trip, but not for leaving a car several days.",
    lat: 47.81256,
    lng: -122.53962,
  },
  {
    id: "bayside-park-and-ride",
    name: "Bayside Community Church Park & Ride",
    type: "lot",
    address: "25992 Barber Cut Off Rd NE, Kingston, WA 98346",
    rates: "Free",
    timeLimit: "Maximum 24 hours — day-use lot",
    notes:
      "Official Kitsap Transit park & ride in the church lot ~0.8 miles west of downtown: 210 stalls, paved and lit. Served by Routes 302 and 391.",
    lat: 47.7987,
    lng: -122.50823,
  },
];
