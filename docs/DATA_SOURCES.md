# Data Sources

**Single source of truth for where every piece of data in Visit Kingston comes from.**
All facts, URLs, endpoints, and prices below were verified by live web checks on **2026-07-02**.
Where the research pass and the verification pass disagreed, the verified correction is what
appears here.

## How sources map to code

| Domain | Adapter / code | Seed data | Mode |
|---|---|---|---|
| WSF car ferry (Edmonds–Kingston) | `src/lib/wsf.ts`, `src/app/api/ferry/status/route.ts` | `src/lib/data/ferry-fallback.ts` | **wired** (live API w/ `WSDOT_API_KEY`; seeded fallback without) |
| Kitsap fast ferry (Kingston–Seattle) | `src/lib/kitsap.ts` | times hardcoded from GTFS feed S1000066 | **seeded** |
| Weather | `src/lib/weather.ts` | — | **wired** (NWS, keyless) |
| Tides | `src/lib/tides.ts` | — | **wired** (NOAA CO-OPS, keyless) |
| Maps / directions | `mapSearchUrl()` / `mapDirectionsUrl()` in `src/components/ui.tsx` | — | **wired** (free Google Maps deep links, no key) |
| Webcams | feature page hotlinks WSDOT images directly | camera list hardcoded in feature files | **seeded** (images live, list static) |
| Events, restaurants, lodging, parking/ATMs, volunteer, scavenger hunt | feature pages | hand-curated content in each feature's files | **seeded** |
| LTAC visitor survey | `src/lib/survey-store.ts`, `src/app/api/survey/route.ts` | — | **wired** (file-backed store; DB store planned) |

Status legend used below: **wired** = fetched live at runtime · **seeded** = verified data
hardcoded in the repo (needs periodic re-verification) · **planned** = documented here,
not yet built.

---

## 1. Ferries — WSDOT (Edmonds–Kingston car ferry)

| Source | URL | Access | Cost | Status in app |
|---|---|---|---|---|
| WSDOT access-code signup | https://wsdot.wa.gov/traffic/api/ | Enter an email, code issued instantly; pass as `?apiaccesscode=` | Free | wired (env var `WSDOT_API_KEY`) |
| Schedule API | https://www.wsdot.wa.gov/ferries/api/schedule/rest ([help](https://www.wsdot.wa.gov/ferries/api/schedule/rest/help)) | REST, JSON default; `/scheduletoday/{RouteID}/{bool}`, `/alerts`, `/validdaterange`, `/cacheflushdate` (no key) | Free | wired |
| Terminals API | https://www.wsdot.wa.gov/ferries/api/terminals/rest ([help](https://www.wsdot.wa.gov/ferries/api/terminals/rest/help)) | `/terminalsailingspace/{8,12}`, `/terminalwaittimes/{8,12}`, `/terminalbulletins/{id}` | Free | wired |
| Vessels API | https://www.wsdot.wa.gov/ferries/api/vessels/rest ([help](https://www.wsdot.wa.gov/ferries/api/vessels/rest/help)) | `/vessellocations`, filter Departing/ArrivingTerminalID ∈ {8, 12} | Free | planned |
| Fares API | https://www.wsdot.wa.gov/ferries/api/fares/rest ([help](https://www.wsdot.wa.gov/ferries/api/fares/rest/help)) | Fare line items by terminal pair (8↔12) + trip date | Free | planned |
| Official static GTFS | https://business.wsdot.wa.gov/Transit/csv_files/wsf/google_transit.zip | Direct download, no key (~463 KB, fresh same-day 2026-07-02) | Free | planned |
| GTFS-RT via OneBusAway Puget Sound | https://api.pugetsound.onebusaway.org/api/gtfs_realtime/{trip-updates\|vehicle-positions\|alerts}-for-agency/95.pb | Email oba_api_key@soundtransit.org for a key (~2 business days). Use **https** — http 301-redirects and protobuf clients that don't follow redirects fail | Free | planned |
| VesselWatch feeds (undocumented fallback) | https://www.wsdot.com/ferries/vesselwatch/Vessels.ashx and Terminals.ashx | Public, no key | Free | not used |

**Gotchas (load-bearing):**

- **WCF date format.** API timestamps are `"/Date(1782997062933-0700)/"` (epoch ms + offset),
  not ISO 8601. `src/lib/wsf.ts` normalizes them before anything reaches the client. Nuance:
  the WCF service content-negotiates — a browser-like `Accept` header returns XML with ISO
  dates, so don't test in a browser and conclude the format changed. Server fetches with no
  `Accept` header get JSON as documented.
- **RouteID 6 vs SchedRouteID.** Edmonds/Kingston `RouteID = 6` (stable, RouteAbbrev
  `ed-king`); `SchedRouteID` changes every schedule season. `/schedule` and `/scheduletoday`
  take RouteID; `/sailings` and `/allsailings` take SchedRouteID — mixing them returns
  empty/wrong data. Resolve SchedRouteID at runtime via `/schedroutes` if ever needed.
- **Terminal IDs.** Edmonds = **8**, Kingston = **12** (verified four independent ways). GTFS
  `stop_id`s match these, but GTFS `route_id`s do **not** match API RouteID 6: GTFS uses
  directional pairs `812` (Edmonds→Kingston) and `128` (Kingston→Edmonds).
- **Key rides in the URL.** `?apiaccesscode=` appears in every request URL — keep all WSF
  calls server-side; never hand the raw URL to the browser. Note: live testing 2026-07-02
  showed the code is **not currently enforced** (endpoints answered with no/invalid codes),
  but the docs mandate it and enforcement could return — register and send it anyway, and
  don't assume a bad key produces an error response.
- **Real-time endpoints.** `/vessellocations` and `/terminalsailingspace` change "potentially
  every 5 seconds" per the docs and must not be cached long; there's no published rate limit,
  so self-throttle (15–30 s server-side is the community norm). Each of the three APIs has
  its **own** `/cacheflushdate` for the cacheable endpoints.
- **No vehicle reservations on this route.** Save A Spot covers only Anacortes/San Juans and
  Port Townsend/Coupeville — ignore `ReservableSpaceCount` for Ed-King. `DriveUpSpaceCount`
  can be `-1`/null when unavailable.
- **Wait times are prose.** `/terminalwaittimes` is staff-entered advisory text
  ("one-hour wait for vehicles") — render as text, never parse into metrics; can be empty
  or stale off-peak.
- **Alerts live in two places.** Route alerts: Schedule API `/alerts` (filter
  `AffectedRouteIDs` containing 6 or `AllRoutesFlag`). Terminal notices:
  Terminals `/terminalbulletins`. A complete alert banner needs both.
- **VesselWatch fallback status (corrected).** `Vessels.ashx` fetched 2026-07-02 is now
  **strict, parseable JSON** (plain string timestamps like `"7/2/2026 4:51:39 PM"`; older
  reports of embedded `new Date(...)` literals no longer apply to this feed). Route abbrev
  is exactly `ED-KING`. `Terminals.ashx`, by contrast, **still contains** `new Date(NNN)`
  literals (84 of them on 2026-07-02) and needs regex-stripping before `JSON.parse`. Both
  are undocumented and can change without notice — fallback use only.
- **No SLA.** Degrade gracefully: the app ships `src/lib/data/ferry-fallback.ts` (bundled
  seasonal schedule, marked `live:false`) plus links to
  https://wsdot.wa.gov/travel/washington-state-ferries. Schedules are seasonal — trust
  `/validdaterange`, don't assume dates.

---

## 2. Ferries — Kitsap Transit (Kingston–Seattle fast ferry, routes 401/404)

| Source | URL | Access | Cost | Status in app |
|---|---|---|---|---|
| Official rider page | https://www.kitsaptransit.com/service/fast-ferry/kingston-fast-ferry | Public HTML | Free | seeded (copy facts) |
| Static GTFS | https://pride.kitsaptransit.com/gtfs/google_transit.zip | Direct download, no key. Feed S1000066, valid **2026-06-14 → 2026-09-12**, contact lindsayc@kitsaptransit.com | Free (non-commercial license) | seeded (times in `src/lib/kitsap.ts`) |
| GTFS-RT vehicles / trips | https://kttracker.com/gtfsrt/vehicles · https://kttracker.com/gtfsrt/trips | Open protobuf, no key | Free | planned |
| Service alerts (GTFS-RT) | https://cdn.simplifytransit.com/kitsap-transit/alerts/service-alerts.pb | Open protobuf, no key | Free | planned |
| Ferry Tracker (rider map) | https://kttracker.com/map?routes=401,404 | Public web app — deep-link target | Free | seeded (link out) |
| Fares page | https://www.kitsaptransit.com/fares | Public HTML (fares effective Oct 1, 2025) | Free | seeded (copy facts) |
| Developer terms | https://www.kitsaptransit.com/terms-and-conditions#developer | Public; **commercial use requires written permission** | Free (non-commercial) | action item |

**Gotchas (load-bearing):**

- **GTFS feed expires 2026-09-12.** The static feed covers only the current service period.
  A naive importer shows an empty schedule after that date. `src/lib/kitsap.ts` hardcodes
  the verified summer times — refresh when the fall schedule drops, or build the GTFS ingest
  job (see Roadmap) and watch `feed_info.feed_end_date`.
- **Direction-based fares.** $2.00 adult **to** Seattle, $13.00 **from** Seattle (~$15 round
  trip); reduced $1.00/$6.50; youth 18 and under free; monthly pass $210/$105. Explain this
  or visitors assume $4 round trip. GTFS `fare_attributes` confirms the $2/$13 pair.
- **Directions are separate routes.** GTFS models eastbound as `route_id 401` and westbound
  as `404` (both `route_type` 4) instead of using `direction_id` — filter for both.
  (The previously reported routes.txt duplicate-row bug is **not present** in feed S1000066;
  deduping is harmless defensive coding only.)
- **No Sunday service; Saturday is seasonal** (roughly May–September; Oct–Apr Saturdays were
  suspended in 2025). Route Sunday visitors to the WSF car ferry.
- **No late World Cup boats from Kingston (corrected).** Kitsap Transit's SEA 26 page
  (https://www.kitsaptransit.com/sea-26) adds match-day late sailings **only on the Bremerton
  route**. GTFS confirms the last Seattle→Kingston boat is **6:45 PM even on match days**
  (Seattle matches: Jun 15, 19, 24, 26, Jul 1, Jul 6 — the last is Jul 6, not Jul 7). Never
  tell Kingston-bound fans there's a late boat home.
- **No seat reservations on this route.** 349-seat MV Finest (Kitsap Transit rounds to 350;
  MV Melissa Ann backup), first-come walk-on; arrive 10 min early, aboard 2 min before.
  "Reservation" mentions in the wild refer to the Bremerton route's small vessels or the
  **Kingston Ride Fast Ferry Commuter** shuttle — which books **by phone (1-844-475-7433) by
  4:00 PM the day before**, weekdays only (no weekend service, so it cannot serve Saturday
  sailings).
- **PugetPass conflict.** The fares page says PugetPass is **not** honored on fast ferries;
  an older still-live FAQ says it is. ORCA E-purse is safe to state; resolve PugetPass with
  the agency before publishing (see Action items).
- **Terminals confuse people.** Seattle side is **Pier 50** (801 Alaskan Way, shared with
  King County Water Taxi), *not* WSF Colman Dock at Pier 52. Kingston address per the
  official page: "11264 State Route 104, Kingston 98346" (no "NE" prefix).
- **License.** Developer terms: revocable, as-is, no logos, and commercial use prohibited
  without written permission — get the Chamber's permission email sent (Action items).

---

## 3. Webcams

All useful cams are WSDOT still-image snapshots on `images.wsdot.wa.gov` — hotlinkable, no
key. All 11 URLs verified live (HTTP 200, fresh `Last-Modified`) on 2026-07-02.

| Source | URL | Access | Cost | Status in app |
|---|---|---|---|---|
| Kingston cams (6) | `https://images.wsdot.wa.gov/orflow/104vc02466.jpg` (9813 Toll Booths) · `orflow/104vc02465.jpg` (9151 Terminal) · `orflow/104vc02390.jpg` (10266 Lindvog Rd) · `orflow/104vc02314.jpg` (9154 Barber) · `wsf/kingston/fse/fse.jpg` (9152) · `wsf/kingston/fsw/fsw.jpg` (9153) | Plain `<img>` hotlink | Free | seeded |
| Edmonds cams (5) | `https://images.wsdot.wa.gov/wsf/edmonds/` → `holding.jpg` (9157) · `104dayton.jpg` (9155) · `104vms_wts.jpg` (9156) · `104underpass.jpg` (9159) · `104pine.jpg` (9160) | Plain `<img>` hotlink | Free | seeded |
| Highway Cameras REST (metadata) | https://wsdot.wa.gov/traffic/api/HighwayCameras/HighwayCamerasREST.svc/Help | `SearchCamerasAsJson?AccessCode={code}&StateRoute=104` | Free (same WSDOT code) | planned (URL-churn checker) |
| VesselWatch Terminals.ashx (camera list) | https://wsdot.com/ferries/vesselwatch/Terminals.ashx | Public, no key — most current camera list, **not strict JSON** | Free | planned |
| Governing terms | https://wsdot.wa.gov/about/policies/travel-information-disclaimer | As-is, no warranty; no attribution requirement stated — "Courtesy WSDOT" credit is the community norm | Free | seeded (credit line) |
| Skunk Bay Weather (Hansville, ~7 mi N) | https://www.skunkbayweather.com/ | Link only; embedding needs owner permission (greg@skunkbayweather.com) | Free to view | seeded (link out) |
| Port of Edmonds cams | https://portofedmonds.gov/marina-camera/ | Two cams (Marina Entrance, Edmonds Marsh); embed terms unpublished, (425) 775-4588 | Free to view | seeded (link out) |
| Port of Kingston | https://portofkingston.org/ | **No webcam exists** (verified) — future Chamber pitch: info@portofkingston.org | n/a | gap |

**Gotchas (load-bearing):**

- **No CORS, no Cache-Control.** `images.wsdot.wa.gov` sends neither. Plain `<img>` hotlinks
  work; browser `fetch()`/canvas reads fail. Append a cache-buster (`?t=${Date.now()}`) or
  browsers show stale frames indefinitely. Don't route through the Next image optimizer
  (frames change every minute and would thrash the cache).
- **Snapshots, not video.** New `orflow/` cams refresh ~every 60 s; older `wsf/` cams every
  1–5 min. Show the image age and flag cams stale at >10 min.
- **URL churn is real.** The Kingston cams moved to `orflow/104vcNNNNN.jpg` with the SR 104
  Traffic Management System rollout (announced April 2026, fully live **June 1, 2026**).
  The WSDOT **ArcGIS camera layer is stale** — it still maps Kingston cams to URLs whose
  `Last-Modified` is **Sep 2003** and omits the Lindvog cam entirely. Do not use it. Run the
  Highway Cameras REST check (or Terminals.ashx with `new Date(...)` sanitizing) to detect
  the next migration.
- **Skunk Bay blocks non-browser UAs** (HTTP 406 to curl) — any server-side freshness check
  needs a browser `User-Agent`, and embedding still needs the owner's permission.
- **Search pollution.** "Kingston webcam" surfaces Jamaica/Ontario/NY cams and aggregators
  rebroadcasting these same WSDOT feeds — always source from `images.wsdot.wa.gov` directly.

---

## 4. Weather & Tides

Both keyless, both free, both wired. (These came out of the gap-analysis pass — no original
research topic covered them.)

| Source | URL | Access | Cost | Status in app |
|---|---|---|---|---|
| NWS forecast (Kingston gridpoint) | https://api.weather.gov/gridpoints/SEW/121,78/forecast (also `/forecast/hourly`) | Keyless REST; **requires an identifying `User-Agent` header** | Free | **wired** (`src/lib/weather.ts`) |
| NWS point lookup (how the gridpoint was derived) | https://api.weather.gov/points/47.796,-122.498 | Resolves to office SEW, gridpoint 121,78 | Free | reference |
| NOAA CO-OPS tide predictions | https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?product=predictions&station=9445639&datum=MLLW&interval=hilo | Keyless REST | Free | **wired** (`src/lib/tides.ts`) |
| Station page | https://tidesandcurrents.noaa.gov/stationhome.html?id=9445639 | "Kingston, Appletree Cove" | Free | reference |

**Gotchas:**

- **NWS requires a User-Agent.** Every request must send an identifying `User-Agent`
  (the adapter sends `visit-kingston-wa (community tourism site)`); anonymous requests get
  rejected.
- **Station 9445639, not 9445478.** A naive "Kingston WA tides" lookup returns station
  9445478 — that's **Union, Hood Canal**. The correct station is **9445639 Kingston,
  Appletree Cove**.
- Roadmap: NWS marine/coastal-waters zone forecast (PZZ1xx via `/zones?type=marine`) for
  crossing conditions; AirNow API for smoke season.

---

## 5. Maps

| Source | URL | Access | Cost | Status in app |
|---|---|---|---|---|
| Google Maps URLs (deep links) | https://developers.google.com/maps/documentation/urls/get-started | No key, no signup; `api=1` param is **mandatory** | Free, unlimited | **wired** (`mapSearchUrl`/`mapDirectionsUrl` in `src/components/ui.tsx`) |
| Google Maps Platform pricing (if ever needed) | https://developers.google.com/maps/billing-and-pricing/pricing | API key + Cloud billing account (card on file) | Per-SKU free caps, see below | not used |
| MapLibre GL JS | https://maplibre.org/maplibre-gl-js/docs/ | `npm install maplibre-gl`; client component, `ssr:false` | Free (open source) | planned |
| OpenFreeMap tiles | https://openfreemap.org/ (style: https://tiles.openfreemap.org/styles/liberty) | No key, no registration, commercial OK | Free, unlimited, **no SLA** | planned |
| Protomaps / PMTiles (fallback tiles) | https://docs.protomaps.com/ | Static PMTiles file on Cloudflare R2 | ~$0–5/mo small site ($11.45/mo at 625K req + 1 TB per their calculator; AWS S3 same scenario: $119.56) | planned fallback |
| OSMF raster tiles | https://operations.osmfoundation.org/policies/tiles/ | Best-effort only; commercial access may be withdrawn | Free | **do not use as primary** |

**Gotchas (load-bearing):**

- **The $200/month Google credit is gone** (since March 1, 2025). Free usage is now per-SKU:
  Essentials 10K events/mo, Pro 5K, Enterprise 1K. Ignore pre-2025 tutorials. Current prices:
  Dynamic Maps $7/1K after 10K free; Static Maps $2/1K; Embed API **unlimited free**;
  Routes Compute Routes $5/1K after 10K; Autocomplete $2.83/1K; Place Details Essentials
  $5/1K; **Text Search is Pro — only 5K free, then $32/1K**.
  Source: https://developers.google.com/maps/billing-and-pricing/march-2025
- **Any Google key needs a billing account** with a card, even for the free Embed API.
  Overages bill automatically — hard-cap quotas at the free ceiling and restrict keys by
  HTTP referrer.
- **Legacy APIs.** Places API (legacy), Directions API, Distance Matrix API are officially
  Legacy — new code uses Places API (New) and Routes API.
- **ToS trap.** Google Places data may not be displayed on a non-Google map — you can't plot
  Places results on MapLibre/OSM. The app's own curated place data sidesteps this.
- **Deep links:** omit `api=1` and Google silently ignores every parameter. URL-encode
  values; 2,048-char limit; `travelmode=driving|walking|bicycling|transit` (transit routes
  correctly via the ferry). Use `destination_place_id` alongside `destination` for exact
  entrances.
- **Google Subscriptions** (Starter $100/mo) had a Nov 2025–Mar 2026 enrollment window,
  now closed (per https://developers.google.com/maps/billing-and-pricing/subscription-terms —
  cite that page, not the launch blog post).
- **Tile strategy:** keep the tile-style URL a single config constant. OpenFreeMap is one
  donation-funded maintainer with no SLA — the swap targets are Protomaps-on-R2 or a
  MapTiler/Stadia free-tier key. Never `tile.openstreetmap.org` for production.

---

## 6. Events

| Source | URL | Access | Cost | Status in app |
|---|---|---|---|---|
| Chamber GrowthZone calendar (**primary**) | https://business.kingstonchamber.com/events | Public HTML; per-event iCal at `/events/ICal/[slug]-[id].ics`; site-wide `/events/rss` 404s. Admin can generate a calendar-wide iCal feed (GrowthZone: Events & Learning → Events → Settings → Calendars) — **existence on the Chamber's plan not yet verified** | Free (iCal); REST API may require a paid quote from GrowthZone WebSupport (https://integration.growthzone.com/growthzone-api/) | seeded; iCal ingest planned |
| Kingston Chamber WordPress site | https://kingstonchamber.com/community/events-calendar/ | Tribe REST API live at `/wp-json/tribe/events/v1/events` but returns **0 events** — empty shell | Free | do not integrate |
| Port of Kingston (best structured feed) | https://portofkingston.org/wp-json/tribe/events/v1/events | Public Tribe REST, no key — 38 events, structured dates/venues; iCal at `/events/?ical=1` | Free | planned supplement |
| Visit Kitsap (county DMO) | https://visitkitsap.com/events/ | `/wp-json/wp/v2/events` returns JSON but **dates only as prose in HTML** (acf empty) — push target, not pull source. Submit form: https://visitkitsap.com/submit-an-event/ (free, ~7-working-day review; page 403s to scripted UAs) | Free | push target |
| Love Kitsap (Squarespace) | https://www.kitsap.love/events-calendar?format=json | Undocumented Squarespace JSON: ~47 upcoming + ~280 past under `upcoming`/`past` keys, paginated ~30/page via `pagination.nextPageUrl`; timestamps Unix-ms. Collection-level `?format=ical` returns **HTML** — only per-event URLs serve iCal | Free (courteous to ask owner) | optional supplement |
| Kitsap Sun | https://www.kitsapsun.com/things-to-do/events/ | events.kitsapsun.com 301-redirects here — a JS-rendered evvnt widget with no clean feed in the HTML | Free | not viable as pull source |
| Facebook | https://developers.facebook.com/docs/graph-api/reference/event/ | Public events API removed 2018; page reads need page-admin tokens + Meta app review; scraping violates ToS | n/a | output channel only |

**Gotchas (load-bearing):**

- **Two Chamber domains.** kingstonchamber.com (WordPress, calendar **empty**) vs
  business.kingstonchamber.com (GrowthZone, the real data). Integrate against GrowthZone only.
- **The whole ingest architecture hangs on one unverified feed.** The calendar-wide GrowthZone
  iCal feed is a documented admin feature (helpdesk.growthzone.com "Calendars" article,
  ~1-hour update lag) but nobody has confirmed the Chamber's plan exposes it or produced a
  working URL. Verify before building the pipeline (see Action items).
- **iCal lacks images and ticket links** — if event pages need hero images, plan on scraping
  the Chamber-owned detail pages (sanctioned) or storing images in the app's own content.
- **Dedupe or show triplicates.** 4th of July and Kingston Public Market appear on Chamber,
  Port of Kingston, and county calendars — dedupe on normalized title + start date, prefer
  the Chamber record, keep the canonical URL pointing at business.kingstonchamber.com.
- **Timezones and recurrence.** All feeds are America/Los_Angeles; parse VTIMEZONE PDT/PST
  properly and pin the tz. Tribe expands recurring events into separate records; iCal may
  use RRULE — the normalizer must expand RRULEs or only the first date shows.

---

## 7. Restaurants

~17 venues, hand-curated. No platform menu APIs are viable at this scale — ordering is
deep-links plus `tel:` links ("Call to order" is a first-class feature here).

| Source | URL | Access | Cost | Status in app |
|---|---|---|---|---|
| Explore Kingston dining directory (Chamber) | https://explorekingstonwa.com/dining-cafes/ | Public page; better: member list from the Chamber (info@kingstonchamber.com, 360-860-2239) | Free | seeded (canonical list) |
| Toast ordering pages (Sourdough Willy's, Nirvana) | `order.toasttab.com/online/{slug}` | Public deep links for real browsers; **HTTP 403 to server-side fetches** — cannot be auto-verified by a link checker | Free to link | seeded |
| SpotOn (Los Tres Compadres) | https://order.spoton.com/so-los-tres-compadres-18180/kingston-wa/... | Public deep link; no third-party read API | Free to link | seeded |
| SpotHopper (The Saucy Sailor) | https://tmt.spotapps.co/ordering-menu?spot_id=355476 | Public deep link; no third-party read API. (**Corrected:** this is SpotHopper, not SpotOn — Kingston has 1 venue on each) | Free to link | seeded |
| Toast API (not used) | https://doc.toasttab.com/doc/devguide/apiOverview.html | Partner Connect certification or restaurant-initiated credentials only — no public API | Impractical | skipped |
| Square APIs (not used) | https://developer.squareup.com/docs | Clean OAuth/Catalog model, but **zero Kingston venues use Square Online ordering** today | Free calls | skipped until adopted |
| Google Places API (New) — hours only | https://developers.google.com/maps/documentation/places/web-service/place-details | Server-side, field mask `currentOpeningHours,regularOpeningHours,businessStatus` by stored place ID | Enterprise SKU $20/1K, **1,000 free Enterprise calls/mo** — ~17 venues daily ≈ 510 calls = $0 | planned |

**Gotchas (load-bearing):**

- **Google Places returns no menu content** — only booleans (`servesBreakfast` etc.). Hours
  sit in the **Enterprise** SKU; one stray Enterprise field bills the whole request at
  Enterprise rate. ToS forbids persistently storing most Places content (hours included) —
  place IDs cacheable indefinitely, lat/lng 30 days, attribution required. Architect hours
  as display-time fetch, or treat Chamber-supplied hours as canonical and use Places only
  to flag discrepancies.
- **Toast slugs rot.** Sourdough Willy's live slug still references their **old** Angeline
  Ave address. And since Toast 403s server-side fetches, stored order URLs need
  manual/browser verification, not an automated checker.
- **Small-town churn is the real data problem.** Downpour Brewing → Friends and Neighbors
  Brewing (opened Oct 2, 2025, same address 10991 NE State Hwy 104); aggregators are stale
  or wrong. Reconcile against the Chamber quarterly; trust no aggregator.
- **cellarcat.com fails TLS handshake** — do not ship that link; use their Facebook page or
  re-verify the scheme first.
- **Menus need humans.** Several venues are phone-only with PDF menus (Filling Station's is
  a 2023 PDF). In-app menus = manually transcribed, owner-approved content with an update
  workflow via the Chamber (see Action items) — not integration work.
- DoorDash covers only some venues, 403s server fetches, has no public API, and its markups
  make it a worse default link than a venue's native page — secondary link at most.

---

## 8. Lodging

Curated first-party directory (~35–40 properties), not an API integration.

| Source | URL | Access | Cost | Status in app |
|---|---|---|---|---|
| Explore Kingston accommodations (Chamber) | https://explorekingstonwa.com/accommodations/ | Public; ~33 named rentals linking mostly to Airbnb + Furnished Finder — ready seed dataset the Chamber owns | Free | seeded |
| Chamber member directory | https://business.kingstonchamber.com/directory/ | GrowthZone; "Lodging & Travel" category; export internally via Chamber | Free | seeded |
| Airbnb deep links | https://www.airbnb.com/s/Kingston--WA--United-States/homes (`?checkin=&checkout=&adults=`); listings `airbnb.com/rooms/{id}` | Plain links — **no API, no affiliate program** (Associates closed March 2021; developer.withairbnb.com is invite-only). ToS (https://www.airbnb.com/help/article/3418) prohibits scraping/databases | Free, earns $0 | seeded |
| Expedia Group Creator program (Vrbo/Expedia/Hotels.com) | https://creator.expediagroup.com/ | Open application, reviewed "within minutes"; Creator Toolbox wraps any Expedia/Vrbo link. Kingston links: https://www.vrbo.com/search?destination=Kingston%2C%20Washington · https://www.expedia.com/Kingston-Hotels.d6084793.Travel-Guide-Hotels | Free; up to 4% on completed bookings (cookie length / higher rates unverified — check the Partnerize dashboard) | planned (affiliate layer) |
| Booking.com affiliate | https://www.booking.com/affiliate-program/v2/index.html | Direct program terminated May–June 2025; new signups via CJ or Awin (region split murky — plan for either). Kingston inventory is thin (7 properties, mostly "near") | Free; ~4% commission and $100 payout floor **unverified** — depends on network terms | low priority |

**Gotchas (load-bearing):**

- **Airbnb API is closed — deep links only.** No public API, no affiliate program, invite-only
  partner portal. Any vendor selling "Airbnb API" access is reselling scraped data in
  violation of Airbnb's ToS — using them would put the Chamber at risk. **Correction to
  earlier research:** the blanket claim that airbnb.com 403s all server-side fetches is not
  reproducible (residential-IP curl got 200s); datacenter IPs may still be blocked, so a
  CI link-check may or may not work — verify links in a real browser either way.
- **The casinos are not on the accommodations page.** The Point Casino & Hotel and
  Clearwater Casino Resort appear elsewhere on explorekingstonwa.com as attractions — add
  them to the lodging dataset deliberately; they can't be copied from the accommodations page.
- **Affiliate money is coffee money.** Up to 4% on completed stays with a ~50–60-day
  validation lag — a bonus, never the business model.
- **FTC disclosure required** once any affiliate link ships ("we may earn a commission"
  near the links) plus `rel="sponsored"`.
- **Listing URLs die when owners delist** — quarterly manual link check with the Chamber.
  Photos on OTA pages are copyrighted; get images from owners with written permission.

---

## 9. Parking & ATMs

No APIs anywhere in this domain — all seeded content with `lastVerified` dates. Rates below
verified 2026-07-02.

| Source | URL | Access | Cost | Status in app |
|---|---|---|---|---|
| Port of Kingston parking | https://portofkingston.org/port-of-kingston-parking/ (policy PDF: https://portofkingston.org/wp-content/uploads/2025/12/2025-Parking-Policy.pdf) | Public page; office 360-297-3545 | $12/12h car, $15/12h truck+trailer, $6/12h motorcycle, $3.49/hr short-term, $139.99/mo permit; T2 Mobile Pay (text code to 25023) | seeded |
| Diamond Parking lot D515 (NE 1st & Ohio, 73 spaces) | https://diamond.permitpoint.com/Location/Detail/bf8b6092-61dc-4b12-b9c8-3fc0c1f342de | Public; kiosk card, PayByPhone, ParkMobile | $8/0–12h, $12/12–24h; monthly **$125.70** (WSDOT's page still shows stale $100) | seeded |
| George's Corner Park & Ride | https://www.kitsaptransit.com/rider-resources/park-and-ride-lots | 27618 Hansville Rd NE, ~2.8 mi west; bus connection to ferry | Free | seeded |
| WSF Kingston terminal detail | https://wsdot.com/ferries/vesselwatch/terminaldetail.aspx?terminalid=12 | Terminal address, tally system, pickup/dropoff rules | Free | seeded |
| WSF payment methods | https://wsdot.wa.gov/travel/washington-state-ferries/tickets/ticket-information | Visa/MC/Amex/Discover, cash (booths only, **not kiosks**), traveler's checks, ORCA incl. Google Wallet | **3% card surcharge since Mar 1, 2026**; cash + externally-loaded ORCA exempt | seeded |
| Ed-King fares | https://www.wsdot.wa.gov/ferries/fares/faresdetail.aspx?departingterm=8&arrivingterm=12 | As of 7/2/2026: adult $11.35, senior $5.65, youth free, car+driver <22 ft $27.00, motorcycle $11.80 | Free page | seeded (or pull Fares API) |
| Bank of America 24-hr ATM (only walkable bank ATM) | https://locators.bankofamerica.com/wa/kingston/atm-kingston-110084.html | 10978 State Hwy 104 (IGA plaza), 24 hr, drive-thru, deposits | $3 non-customer fee (unverified amount) | seeded |
| Kitsap Credit Union (George's Corner) | https://kitsapcu.org/locations/kingston/ | 8196 NE State Hwy 104; walk-up ATM during Safeway hours (6am–midnight), **not 24-hr** | Free page | seeded |
| Kitsap Bank (George's Corner) | https://www.kitsapbank.com/about-us/locations/ | 8190 NE State Hwy 104; site 403s bots — verify by phone 360-297-3034. Hours: treat as M–F 9–5 (the F 9–6 claim didn't verify) | Free page | seeded |
| SR 104 holding lane / ATMS FAQ | https://www.kitsap.gov/pw/Documents/SR%20104%20Holding%20Lane%20ATMS%20FAQ%20Sheet.pdf | County PDF | Free | seeded |

**Gotchas (load-bearing):**

- **Good To Go! is NOT accepted on ferries** — highway tolling only. Common misconception
  worth debunking in-app.
- **3% card surcharge (WSF, since 2026-03-01)** on all credit/debit purchases; cash and
  ORCA cards loaded outside WSF facilities are exempt — the main reason a traveler still
  wants cash. Kiosks take no cash.
- **Walk-ons board free from Kingston.** All passenger fares are collected at Edmonds;
  Kingston collects vehicle/driver only. Never display a "Kingston walk-on fare."
- **Fares are dated.** The 7/2/2026 figures are summer rates (WSDOT doesn't label them
  "peak" on the page); WSF typically raises fares each October — store with effective dates
  or pull the Fares API.
- **Tally system:** boarding-pass dispensers on SR 104 daily 8am–8pm during peak; leaving
  the line voids the pass. **Completion status of the SR 104 shoulder holding lane is
  unconfirmed** — the county FAQ (June 2025) said construction would begin fall 2025;
  confirm via Kitsap1 (360-337-5777) before stating it's done.
- **Port free 2-hour zone is strictly enforced** and the Port explicitly says don't use it
  for ferry travel. RV overnighting banned 10pm–8am.
- **SR 104 addresses geocode badly** (8xxx at George's Corner, 10–11xxx downtown, 26xxx
  cross-parcels) — store verified lat/lng, never geocode at build time.
- The Diamond lot details come from the WSDOT terminal page + PermitPoint — Kitsap Transit's
  park-and-ride page does **not** list it; don't cite KT for it. Re-verify all rates
  quarterly (Diamond reprices monthly permits; the Port revises its rate schedule).

---

## 10. Charity / Volunteer

Verdict from research: **borrow volunteer management, build only the deconfliction calendar.**

| Source | URL | Access | Cost | Status in app |
|---|---|---|---|---|
| Volunteer Center of Kitsap County (United Way, Galaxy Digital Get Connected) | https://unitedwaykitsap.galaxydigital.com/ | Agencies self-register ("Sign Up Your Agency"); confirm free onboarding with sjones@unitedwaykitsap.org. **Deep-link the galaxydigital.com URL** — volunteerkitsap.org serves a mismatched TLS cert | Free to volunteers; agency accounts standard-free (confirm) | seeded (link out) |
| SignUpGenius | https://www.signupgenius.com/pricing | Self-serve; free tier (ads, 1 admin, unlimited signups). Current tiers: Free/Starter/Essentials/Premium/Enterprise; payments 5% + $0.50 | Free tier | seeded (org-by-org links) |
| Timecounts | https://join.timecounts.app/pricing | Free plan for approved orgs (1 admin, unlimited volunteers/events); Pro $79/mo annual; enterprise contact hello@timecounts.org | Free tier | optional |
| JustServe | https://www.justserve.org/ | Free listings, reviewed by JustServe reps (LDS-operated — some orgs weigh this) | Free | optional channel |
| Teamup (interim shared calendar) | https://www.teamup.com/pricing/ | Free plan: **5 users, 5 sub-calendars** (annual tiers: Plus $12/mo, Pro $30, Business $70, Enterprise $125) | Free tier | not used |
| GatherBoard / Locable (what other towns buy) | https://gatherboard.com/ · https://www.locable.com/community-engagement-core/ | Quote-based / from $99–129/mo + $750 onboarding | Paid | reference only |

**Gotchas (load-bearing):**

- **No product sells deconfliction.** None of the surveyed calendars support tentative date
  holds, overlap warnings, or acknowledge-and-proceed — that's the one piece worth building
  custom (Roadmap). Conflict warnings must be advisory, never blocking.
- **Submission-dependent calendars die** (Locable's published thesis, May 2026). Ingest
  external iCal feeds (Chamber GrowthZone, Port of Kingston, county) so the calendar has
  baseline content — which again depends on the unverified GrowthZone feed (Action items).
- **Don't become a volunteer-PII system of record.** Waivers, minors, background checks, and
  hour audits are what Get Connected/Timecounts already handle. Keep any custom volunteer
  data to name/email at most.
- Get Connected standalone pricing is quote-only (no verified floor) — never buy it for one
  town when the county United Way instance exists.
- missoulaevents.net is GatherBoard's own flagship, not run by the Downtown Missoula
  Partnership — the "chamber-run town calendar" precedent still needs a convener, which is
  the Chamber's real asset here.

---

## 11. Scavenger hunt

Build it native — don't pay Goosechase ($299 per 40-participant event, free tier = 3
participants/24 h) or Actionbound (free tier is private non-commercial only; a Chamber-run
hunt is arguably commercial; PRO is quote-based).

| Source | URL | Access | Cost | Status in app |
|---|---|---|---|---|
| Photo capture: `<input type="file" accept="image/*" capture="environment">` | https://blog.addpipe.com/getusermedia-getting-started/ (behavior notes) | No permission prompt; opens native camera on Android, camera/library sheet on iOS; **works inside Facebook/Instagram in-app browsers** | Free | planned v1 |
| getUserMedia (live camera — avoid for v1) | https://caniuse.com/stream | iOS Safari 11+, HTTPS only; **broken in iOS in-app webviews** (https://developer.apple.com/forums/thread/134216) — exactly where Chamber Facebook links land | Free | avoid v1 |
| Geolocation API (GPS assist) | https://developer.mozilla.org/en-US/docs/Web/API/GeolocationCoordinates/accuracy | HTTPS + permission; `accuracy` = 95%-confidence radius (3–10 m outdoors after lock) | Free | planned |
| QR: native camera scan of per-stop URLs | (printed codes, HMAC-signed URLs like `/hunt/checkin?stop=X&sig=…`) | iOS Camera scans QR natively since iOS 11; no in-app scanner needed | Print cost only | planned v1.5 |
| BarcodeDetector API (why in-app scanning is avoided) | https://caniuse.com/mdn-api_barcodedetector | Chromium/Android only; Safari has it **behind a disabled-by-default flag** — effectively unavailable on iOS. If ever needed: html5-qrcode / jsQR / zxing-wasm | Free | not used |
| Cloud vision (junk filter only, if ever) | https://aws.amazon.com/rekognition/pricing/ · https://cloud.google.com/vision/pricing | Rekognition DetectLabels $0.001/image; free tier **1,000 images/mo per API group for 12 months** (not the older 5,000 figure). Google Vision: 1,000 units/mo free, then $1.50/1K | ~$1 per 1,000 check-ins | deferred |
| TensorFlow.js COCO-SSD (evaluated, rejected) | https://github.com/tensorflow/tfjs-models/tree/master/coco-ssd | On-device, Apache-2.0, detects **80** generic classes; multi-MB download | Free | rejected |

**Gotchas (load-bearing):**

- **File-input capture, not getUserMedia, for v1** — no permission prompt, and it survives
  the iOS in-app browsers that Chamber Facebook promotion will send.
- **GPS first-fix can be off by hundreds of meters** before converging — use `watchPosition`,
  wait for `accuracy` < ~50 m, or use generous 75–100 m radii; GPS is an assist, never the
  only check-in path (waterfront multipath + ferry-unload cell congestion are local realities).
- **Verification is honor system + Chamber spot-check.** Generic vision labels can confirm
  "a boat," not "the Kingston ferry dock" — human review wins at community scale.
- iPhone photos can arrive as HEIC at 3–8 MB — downscale/transcode client-side on a canvas
  (~1600 px JPEG) before upload.
- Outdoor QR signage needs lamination/metal in Kingston's marine climate, mounted with
  partner-business permission; HMAC tokens keep codes from being guessed.

---

## 12. LTAC reporting (lodging-tax compliance)

The survey feature exists to generate the numbers Washington's lodging-tax law requires.
Kingston is unincorporated — **the Kitsap County LTAC is the authority** (there is no City
of Kingston and no municipal program).

| Source | URL | Access | Cost | Status in app |
|---|---|---|---|---|
| RCW 67.28.1816 (reporting mandate, 3 statutory traveler categories) | https://app.leg.wa.gov/rcw/default.aspx?cite=67.28.1816 | Public statute | Free | wired (survey mirrors categories) |
| RCW 67.28.1817 (LTAC composition) · RCW 67.28.080 (definitions — "tourism promotion" includes websites) | https://app.leg.wa.gov/rcw/default.aspx?cite=67.28.1817 · https://app.leg.wa.gov/rcw/default.aspx?cite=67.28.080 | Public statutes | Free | reference |
| JLARC reporting portal | https://app.leg.wa.gov/JLARCLodgingTax/ | WSL account; **only county staff file** — the Chamber reports to Kitsap County, which enters the data. Deadline historically mid-May for prior calendar year | Free | reference |
| JLARC Data Field Definitions (**the schema to mirror**) | https://leg.wa.gov/jlarc/Documents/LodgingTax/Data_Field_Definitions.pdf | Public PDF (dated Feb 2018) | Free | wired (`src/lib/survey-store.ts` summary shape) |
| JLARC instructions + statewide report | https://leg.wa.gov/jlarc/Documents/LodgingTax/Instructions.pdf · https://leg.wa.gov/jlarc/reports/2025/LodgingTax/default.html | Public (2024 statewide: 115M attendees, 54M 50+ miles, 33M out-of-state — calibration benchmarks) | Free | reference |
| Kitsap County LTAC | https://www.kitsap.gov/das/Pages/LTAC.aspx | Staff: Lee Reyes 360-337-4471 lreyes@kitsap.gov; Glen McNeill 360-337-4789 gsmcneill@kitsap.gov; apply via purchasing@kitsap.gov | Free to apply | action item |
| Kitsap award process PDF | https://www.kitsap.gov/das/Documents/2024-029%20Lodging%20Tax%20Award%20Process%20Instructions%20Template%202025.pdf | Chambers of commerce (501(c)(6)) explicitly eligible; cost-reimbursement only; unincorporated-area priority (favors Kingston) | Free | reference |

**The six JLARC metric groups** (each with Predicted / Actual / Method / Explain):
Overall Attendance · Attendance 50+ Miles · Out of State/Country · Paid Overnight Lodging ·
Did Not Pay Overnight Lodging · Paid Lodging Nights. **Method enum:** Direct Count, Indirect
Count, Representative Survey, Informal Survey, Structured Estimate.

**Gotchas (load-bearing):**

- **Grant cycle dates (found for Kitsap County):** the current RFP for 2027 funds opens
  **Oct 1, 2026**, closes **Oct 30, 2026 2:00 PM** (close time per the county's standard
  convention — re-check the bid posting), Teams bid conference Oct 21, 2026 2:00 pm,
  interviews Nov 5–6, 2026 at Silverdale Kitsap Regional Library. The window is one month,
  late applications are categorically rejected, and the timing has moved before (Aug in
  2024) — watch kitsap.gov/das each summer.
- **Cost reimbursement only** — no money up front, and no pre-contract costs are
  reimbursable. Don't start billable app work before a Tourism Promotion Agreement is
  executed if you want it funded.
- **Web traffic is not "attendance."** Marketing-type activities may leave attendance blank
  with a Notes explanation, but the county agreement still requires the three statutory
  traveler categories — the app's zip-code micro-survey (no PII, method = Informal Survey)
  exists for exactly this. Informal surveys can't be projected to totals; a projectable
  claim needs a Representative Survey design.
- **Both predicted and actual figures are required** — capture predictions at
  grant-application time in the same schema.
- Everything submitted to the county is a public record (ch. 42.56 RCW), and applicants must
  disclose immediate-family/business relationships with county officials who have award
  authority.
- The JLARC field list dates to Feb 2018 and the portal occasionally adds fields — mirror
  the current-year portal form, don't hard-code the 2018 list.

---

## Action items for the Chamber

1. **Get a WSDOT access code** — https://wsdot.wa.gov/traffic/api/, enter an email, instant
   and free. Set it as `WSDOT_API_KEY` in the deployment env. (The app works without it via
   the bundled fallback schedule, but live sailing space/alerts need it.)
2. **Verify the GrowthZone calendar-wide iCal feed exists on the current plan** — GrowthZone
   backoffice: Events & Learning → Events → Settings → Calendars → open calendar → copy the
   iCal URL. 10-minute task; both the events ingest and the deconfliction calendar depend
   on it. If it's not on the plan, get GrowthZone WebSupport's API quote in writing before
   any pipeline is designed.
3. **Send the permission email to Kitsap Transit** (lindsayc@kitsaptransit.com — the contact
   in their GTFS `feed_info`) asking for written OK to use the GTFS/GTFS-RT feeds in a
   Chamber-affiliated tourism app. Their developer terms prohibit commercial use without it.
   Same email can ask them to resolve the **PugetPass contradiction** (fares page says not
   honored on fast ferries; their FAQ says it is).
4. **Restaurant menu partnership workflow** — via the Chamber, ask each owner to supply and
   approve a menu for the app (structured, maintained in-repo/CMS) plus a contact for
   updates. This is the only legal, accurate menu source: Toast/SpotOn/SpotHopper APIs are
   closed and Google has no menu data. Bundle a quarterly "anything change?" check.
5. **LTAC grant cycle** — mark the calendar: Kitsap County RFP **Oct 1–30, 2026** (2027
   funds), bid conference Oct 21, interviews Nov 5–6. Apply as the Chamber (501(c)(6),
   explicitly eligible) framing the app as "tourism promotion" under RCW 67.28.080, with
   predicted figures for the three statutory categories and the app's survey methodology
   named — it directly answers the county's "measurable indicators" criterion.
6. Softer asks, when convenient: permission from Greg Johnson (greg@skunkbayweather.com) to
   embed Skunk Bay imagery; pitch the Port of Kingston (info@portofkingston.org) on a marina
   webcam — downtown Kingston currently has zero; confirm with United Way
   (sjones@unitedwaykitsap.org) that VolunteerKitsap agency registration is free for small
   Kingston nonprofits.

## Roadmap integrations

- **GTFS ingest job** — scheduled job (weekly cron) downloads
  `pride.kitsaptransit.com/gtfs/google_transit.zip`, parses routes 401/404 (plus local bus
  routes 302/307/391/803 that serve the Kingston dock), regenerates the schedule data, and
  alerts when `feed_info.feed_end_date` approaches (current feed dies **2026-09-12**). Same
  job can pull the WSF static GTFS if offline schedule generation or route shapes are ever
  wanted.
- **GTFS-RT vessel positions (Kitsap)** — proxy `kttracker.com/gtfsrt/{vehicles,trips}`
  through a route handler (decode with `gtfs-realtime-bindings`), filter to 401/404, cache
  30–60 s, power a "boat is here / next sailing" widget; alerts from
  `cdn.simplifytransit.com/.../service-alerts.pb`. Zero-maintenance fallback: deep-link
  `kttracker.com/map?routes=401,404`.
- **OBA GTFS-RT (WSF + regional agencies)** — request a key from
  oba_api_key@soundtransit.org (~2 business days) for agency-95 trip updates / vehicle
  positions / alerts, plus Sounder/Community Transit data for the Edmonds-side walk-on
  story. Use https URLs; native WSF REST remains richer for the car ferry itself.
- **Weekly link-checker for ordering/menu/lodging URLs** — HTTP status + TLS check over all
  outbound partner links (would have caught cellarcat.com's TLS failure). Caveats: Toast and
  DoorDash 403 server-side fetchers, Airbnb may 403 datacenter IPs, Skunk Bay 406s
  non-browser UAs — flag those for manual browser review rather than auto-failing them.
- **Database-backed survey store** — swap `FileSurveyStore` in `src/lib/survey-store.ts` for
  a Postgres implementation (Vercel Postgres / Supabase) behind the same `SurveyStore`
  interface; add the admin export that renders a calendar-year report per funded activity in
  exactly the JLARC six-metric shape so the Chamber's report to Kitsap County is one click.
- Also on the horizon (from the gap analysis): WSDOT Highway Alerts + Hood Canal Bridge
  drawspan status (same access code — a drawspan opening halts SR 104 for 45+ min); NWS
  marine zone forecast for crossing conditions; a curated POI/attractions inventory for
  itineraries (no single API covers it — Chamber-curated, like everything else that works
  in this town).

---

## Hosting on explorekingstonwa.com (verified 2026-07-02)

The Chamber site is WordPress 7 + Elementor (Hello Elementor theme) on a
NameHero VPS (165.140.69.20, vps42664.nodevm.com), which also serves the
domain's DNS **and email** (MX + SPF point at the same box) — so do not move
nameservers.

**Recommended path when ready to go live:** in the NameHero cPanel Zone
Editor add `CNAME app.explorekingstonwa.com → cname.vercel-dns.com`, then add
`app.explorekingstonwa.com` to the Vercel project. Zero impact on the
WordPress site, apex, or email. If the app ever replaces the WP site
entirely, swap the apex A record to Vercel (76.76.21.21) at cutover time.

**Bonus discovery:** explorekingstonwa.com runs The Events Calendar with a
live REST API (`/wp-json/tribe/events/v1/`) — a machine-readable event feed
the Chamber already controls. Strong candidate for automating the app's
events data (replaces the seed file in `src/lib/data/events.ts`).
