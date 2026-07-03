// ATMs and cash access reachable from the Kingston ferry dock — re-verified July 2, 2026.
// Sources: Bank of America locator (Kingston Center drive-up ATM — the ONLY 24-hour
// bank ATM in town), kitsapcu.org/locations/kingston (walk-up ATM limited to Safeway
// store hours; Co-op network = only confirmed surcharge-free ATM in 98346),
// kitsapbank.com locations (site blocks bots — verified via Apr 2026 archive snapshot;
// mid-merger into Heritage Bank, systems conversion expected Q3 2026), Speedway,
// Gliding Eagle Market and The Point Casino operator pages, OSM/Yelp for the ARCO
// and Chevron stations.
//
// Corrections baked in:
//   - The plaza at 10978 SR 104 is the GROCERY OUTLET plaza (Kingston Center) — the
//     old IGA / Food Market naming is stale (Grocery Outlet opened Oct 2023).
//   - There is NO Chevron in downtown Kingston; the only Kingston Chevron is at the
//     Hwy 104 / Bond Rd junction ~3.8 mi west. The near-downtown station is the
//     24-hour ARCO / Kingston Mini-Mart (its ATM is unverified — field-check).
//   - The former Columbia Bank / Umpqua branch at 26563 Lindvog Rd NE is permanently
//     CLOSED — do not list it (directories and OSM still show it).
//   - No ATM at the WSF terminal itself. WSF DOES take cash at staffed tollbooths,
//     and since March 1, 2026 card purchases carry a 3% surcharge — cash is the
//     fee-free way to pay. The Kitsap Transit fast ferry farebox takes exact cash.
// Lat/lng from operator locators / OSM POIs.

import type { Atm } from "../types";

/** Extra per-ATM metadata the Atm type doesn't carry (badges, map styling). */
export interface AtmMeta {
  open24h: boolean;
  /** Approximate drive time from the ferry dock, minutes. */
  driveMinutes: number;
  confidence: "verified" | "probable" | "unverified";
  sourceUrl: string;
}

export const atms: Atm[] = [
  {
    id: "bofa-kingston-center",
    name: "Bank of America drive-up ATM (Kingston Center)",
    operator: "Bank of America",
    address: "10978 State Hwy 104, Kingston, WA 98346",
    feeNote:
      "Free for Bank of America cardholders; everyone else pays BofA's ~$3 surcharge plus their own bank's fee — the machine shows the amount before you commit. Not in the MoneyPass or Allpoint networks.",
    walkMinutesFromFerry: 11,
    notes:
      "The only 24-hour bank ATM in town. Drive-up, takes deposits, supports cardless/tap access. In the Kingston Center plaza (anchored by Grocery Outlet) on SR 104 — a 10–12 minute uphill walk or 2-minute drive from the dock. ATM only; the nearest staffed BofA branch is in Poulsbo.",
    lat: 47.801839,
    lng: -122.50091,
  },
  {
    id: "kitsap-bank-georges-corner",
    name: "Kitsap Bank — Kingston branch + ATM",
    operator: "Kitsap Bank (merging into Heritage Bank)",
    address: "8190 NE State Hwy 104, Kingston, WA 98346",
    feeNote:
      "Free for Kitsap Bank customers; no surcharge-free network advertised, so expect a ~$2.50–3.50 surcharge otherwise.",
    walkMinutesFromFerry: 50,
    notes:
      "Full-service branch at George's Corner (SR 104 × Hansville Rd), next to Safeway — about 2.5 miles from the dock, a 5–7 minute drive. Lobby Mon–Fri 9–5; 360-297-3034. On-site ATM/interactive teller; 24-hour access not confirmed. Heads-up: Kitsap Bank merged into Heritage Bank in early 2026 — signage and hours could change.",
    lat: 47.8101618,
    lng: -122.5408885,
  },
  {
    id: "kitsap-cu-georges-corner",
    name: "Kitsap Credit Union — walk-up ATM at Safeway",
    operator: "Kitsap Credit Union",
    address: "8196 NE State Hwy 104, Kingston, WA 98346",
    feeNote:
      "The only confirmed surcharge-free ATM in town — free for members of any Co-op-network credit union. Non-network cards pay a surcharge.",
    walkMinutesFromFerry: 50,
    notes:
      "At the Safeway at George's Corner, ~2.5 miles from the dock (5–7 minute drive). The walk-up ATM works during Safeway store hours only — not 24 hours. Branch lobby Mon–Fri 10–6, closed weekends; 360-662-2000. Safeway itself also gives debit cash-back at checkout.",
    lat: 47.811334,
    lng: -122.540547,
  },
  {
    id: "speedway-georges-corner",
    name: "Speedway Express — in-store ATM",
    operator: "Speedway Express #7874",
    address: "8184 NE State Hwy 104, Kingston, WA 98346",
    feeNote:
      "Independent retail ATM — expect a ~$2.50–3.50 surcharge; no surcharge-free network confirmed.",
    walkMinutesFromFerry: 50,
    notes:
      "Gas-station ATM at George's Corner, next to Kitsap Bank and Safeway. Inside the store, so no after-hours access — store hours roughly 6am–9pm daily; (360) 297-0516. ATM presence is from directory data — confirm on arrival.",
    lat: 47.810142,
    lng: -122.540308,
  },
  {
    id: "arco-kingston-mini-mart",
    name: "ARCO / Kingston Mini-Mart — ATM unverified",
    operator: "ARCO (Kingston Mini-Mart)",
    address: "10951 NE State Hwy 104, Kingston, WA 98346",
    feeNote:
      "If present, an independent retail ATM — expect a ~$2.50–3.50 surcharge.",
    walkMinutesFromFerry: 11,
    notes:
      "The closest gas station to the ferry (across SR 104 from the Grocery Outlet plaza), open 24 hours; 360-297-1717. ARCO pumps don't take credit, so an in-store ATM is typical — but no source confirms one. UNVERIFIED — check in person before counting on it.",
    lat: 47.801605,
    lng: -122.501726,
  },
  {
    id: "chevron-hwy104-bond",
    name: "Chevron at Hwy 104 / Bond Rd — in-store ATM",
    operator: "Chevron",
    address: "26605 State Hwy 104 NE, Kingston, WA 98346",
    feeNote:
      "Independent retail ATM — expect a ~$2.50–3.50 surcharge.",
    walkMinutesFromFerry: 75,
    notes:
      "The ONLY Chevron in Kingston — at the Hwy 104/Bond Rd junction ~3.8 miles west of the dock (8–9 minute drive), NOT downtown. Last fuel before the Hood Canal Bridge. Hours Mon–Fri 4:30am–11pm, weekends 6am–11pm; ATM listed by directories, not the operator.",
    lat: 47.804427,
    lng: -122.569936,
  },
  {
    id: "gliding-eagle-market",
    name: "Gliding Eagle Market (Shell) — ATM",
    operator: "Port Gamble S'Klallam Tribe",
    address: "8000 NE Little Boston Rd, Kingston, WA 98346",
    feeNote:
      "Independent ATM — expect a ~$2–3.50 surcharge; no surcharge-free network confirmed.",
    walkMinutesFromFerry: 110,
    notes:
      "ATM confirmed on the market's own site. Inside the store — open daily 6am–10pm, no after-hours access; (360) 655-5541. About 12–13 minutes' drive from the dock via Hansville Rd, at Little Boston.",
    lat: 47.839109,
    lng: -122.541797,
  },
  {
    id: "point-casino",
    name: "The Point Casino & Hotel — ATMs",
    operator: "Port Gamble S'Klallam Tribe",
    address: "7989 NE Salish Ln, Kingston, WA 98346",
    feeNote:
      "Casino ATMs typically surcharge $4–6 — the priciest cash in the area. Fees not published.",
    walkMinutesFromFerry: 110,
    notes:
      "Open 24 hours, but the ATMs sit on the gaming floor (21+). About 11–13 minutes' drive from the dock, off Hansville Rd NE; (360) 297-0070. Useful in a pinch late at night — otherwise use the BofA drive-up.",
    lat: 47.84414,
    lng: -122.541651,
  },
];

export const atmMeta: Record<string, AtmMeta> = {
  "bofa-kingston-center": {
    open24h: true,
    driveMinutes: 2,
    confidence: "verified",
    sourceUrl: "https://locators.bankofamerica.com/wa/kingston/atm-kingston-110084.html",
  },
  "kitsap-bank-georges-corner": {
    open24h: false,
    driveMinutes: 6,
    confidence: "verified",
    sourceUrl: "https://www.kitsapbank.com/about-us/locations/",
  },
  "kitsap-cu-georges-corner": {
    open24h: false,
    driveMinutes: 6,
    confidence: "verified",
    sourceUrl: "https://kitsapcu.org/locations/kingston/",
  },
  "speedway-georges-corner": {
    open24h: false,
    driveMinutes: 6,
    confidence: "probable",
    sourceUrl: "https://www.speedway.com/locations/store/7874",
  },
  "arco-kingston-mini-mart": {
    open24h: false,
    driveMinutes: 2,
    confidence: "unverified",
    sourceUrl: "https://www.yelp.com/biz/arco-kingston",
  },
  "chevron-hwy104-bond": {
    open24h: false,
    driveMinutes: 9,
    confidence: "probable",
    sourceUrl: "https://www.iexitapp.com/business/Chevron/252740",
  },
  "gliding-eagle-market": {
    open24h: false,
    driveMinutes: 13,
    confidence: "verified",
    sourceUrl: "https://glidingeaglemarket.com/amenities/",
  },
  "point-casino": {
    open24h: true,
    driveMinutes: 12,
    confidence: "probable",
    sourceUrl: "https://www.thepointcasinoandhotel.com/",
  },
};
