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
  | "prohibited";

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
};

const STUDY_NOTE = "Per 2015 county study — obey posted signs.";
const STUDY_URL =
  "https://portofkingston.org/wp-content/uploads/2022/10/Kingston-Complete-Streets-Transportation-report.pdf";
const PORT_PARKING_URL = "https://portofkingston.org/port-of-kingston-parking/";
const PORT_MAP_URL =
  "https://portofkingston.org/wp-content/uploads/2025/12/Updated-Parking-Map-12-30-25.pdf";
const KITSAP_TRANSIT_PR_URL =
  "https://www.kitsaptransit.com/rider-resources/park-and-ride-lots";

export const parkingZones: MapZone[] = [
  /* ---------------- Port of Kingston ---------------- */
  {
    id: "port-free-2hr",
    name: "Port free 2-hour row",
    rule: "free-2hr",
    summary:
      "The Port's only free parking: one row of ~30 stalls by Mike Wallace Park. 2 hours, strictly enforced — the Port says do NOT use it for ferry travel.",
    details:
      "A single double-loaded row (~30 stalls) inside the marina lot, between paid row 214–233 and the 15-minute dropoff at Mike Wallace Park. Perfect for lunch or a pier stroll. Overstays are a $40 ticket (doubles after 15 days; tow possible). If an unexpected ferry delay traps you, call the Port office BEFORE your two hours expire to ask for an extension — but the Port's official advice is simply not to use this row for any ferry trip.",
    confidence: "probable",
    sourceUrl: PORT_MAP_URL,
    sourceNote:
      "Rules verified verbatim from the Port's 2025 parking policy; the row outline was georeferenced from the Port's schematic map (±10–15 m).",
    overnight: "no",
    center: [47.79678, -122.4967],
    polygon: [
      [47.796942, -122.496679],
      [47.796858, -122.496521],
      [47.796618, -122.496801],
      [47.796702, -122.496959],
    ],
  },
  {
    id: "port-pokpark",
    name: "Port of Kingston paid lot (POKPARK)",
    rule: "paid",
    summary:
      "$12/12 hr car · $15 truck+trailer · $6 motorcycle · $3.49/hr short-term. Text POKPARK to 25023 to pay. 2–3 min walk to the ferry.",
    details:
      "Every numbered space on Port property is paid (spaces 1–103, 181–233 and more). Pay by text (POKPARK to 25023, T2 Mobile Pay), at the Marina Office 8am–5pm, or by card over the phone: 360-297-3545. Monthly commuter permit $139.99 (limited; daily use only, not storage). Overnight for cars is not prohibited in writing but never explicitly authorized either — call the Port office before leaving a car overnight. No RV parking on Port property, and camping is prohibited. Violations $40–$50, doubling after 15 days; boot or tow after 3 unresolved.",
    confidence: "verified",
    sourceUrl: PORT_PARKING_URL,
    overnight: "confirm-first",
    center: [47.7967, -122.498],
  },
  {
    id: "port-pokhill",
    name: "Port hill parking (POKHILL)",
    rule: "paid",
    summary:
      "Overflow paid zone on the slope by the boat launch access road (spaces 104–162). Text POKHILL to 25023 to pay.",
    details:
      "The Port's overflow zone on the hill between the boat launch and NE West Kingston Rd, including truck-and-trailer overflow (spaces 133–162). Same rates and text-to-pay system as the main lot. Same overnight rule of thumb: call the Port office first (360-297-3545).",
    confidence: "probable",
    sourceUrl: PORT_MAP_URL,
    sourceNote:
      "Zone location interpreted from the Port's schematic map and aerial imagery.",
    overnight: "confirm-first",
    center: [47.79756, -122.49884],
  },
  {
    id: "port-poktt",
    name: "Port truck & trailer zone (POKTT)",
    rule: "paid",
    summary:
      "Trucks with boat trailers ONLY — $15/12 hr or $30/24 hr, by the boat launch (spaces 301–318). Regular cars may not park here.",
    details:
      "Reserved for trucks with trailers next to the launch ramp. Text POKTT to 25023 to pay. Trailers may not be dropped without the truck attached, and unattended boats on trailers need Port approval. Multi-day: coordinate with the Port office (360-297-3545).",
    confidence: "probable",
    sourceUrl: PORT_MAP_URL,
    sourceNote:
      "Zone location interpreted from the Port's schematic map and aerial imagery.",
    overnight: "confirm-first",
    center: [47.79688, -122.49912],
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
    lat: 47.79678,
    lng: -122.4967,
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
