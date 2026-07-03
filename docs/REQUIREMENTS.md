# Explore Kingston — Requirements Specification

**Version 2.0 · July 2026 · Status: v1 platform implemented; this document
specifies the full requirement set it satisfies, plus flagged gaps.**

This is the authoritative statement of *what the system must do and why*. It
is written to serve three uses: (1) maintaining the current implementation,
(2) evaluating changes against original intent, and (3) re-creating the
system from scratch (an improved v2) without access to the original code.
Companion documents: [SDD.md](SDD.md) (how it is designed),
[ARCHITECTURE.md](ARCHITECTURE.md) (system structure and decisions),
[DATA_SOURCES.md](DATA_SOURCES.md) (every external source, verified),
[SYNDICATION.md](SYNDICATION.md) (outbound propagation plan),
[OPERATIONS.md](OPERATIONS.md) (runbook), [ROADMAP-V2.md](ROADMAP-V2.md)
(prioritized improvements).

---

## 1. Vision and stakeholders

**Vision.** One website where anyone passing through Kingston, Washington —
ferry riders above all — can answer, in seconds, on a phone: *when is my
boat, where do I park, what's open right now, what's happening today, and
what should I do with the time I have?* The same system is the Chamber of
Commerce's operating platform: businesses and nonprofits maintain their own
listings, hours, events, and volunteer needs in one place, and that single
source of truth flows outward (site pages, feeds, embeds, and eventually
Google/Apple/social platforms). Visitor activity is measured — anonymously
and honestly — to support Lodging Tax (LTAC) grant applications that fund
the town's tourism work.

**Stakeholders.**

| Stakeholder | Stake |
|---|---|
| Visitors (primary) | Fast, accurate, mobile answers; no accounts, no creep factor |
| Greater Kingston Chamber of Commerce | Owns the platform; admin control; LTAC-grade data; member value |
| Local businesses | Free presence they control; hours/events propagation; foot traffic |
| Local nonprofits | Volunteer recruiting; event date deconfliction |
| Kitsap County LTAC / JLARC | Aggregate visitor metrics in grant applications (RCW 67.28) |
| Project owner (Mat) | Personal project, ~$0/month budget, personal (non-work) accounts |

**Personas.**

- **Deckhand Dana** — walked on at Edmonds, 4 hours in Kingston, phone in
  hand, wants food + a plan + the boat home. Never scrolls past the fold.
- **Line-waiter Lee** — sitting in the SR-104 holding line, wants to know
  whether to bail, park, and walk on; checks webcams and drive-up space.
- **Owner Maria** — runs a restaurant; changes hours seasonally; wants to
  type them once and stop fielding "are you open?" calls.
- **Coordinator Chris** — runs a nonprofit's events; needs volunteers and
  needs to not schedule against the fireworks.
- **Chamber Director** — administers everything; files the LTAC application
  each October; is not a programmer.

## 2. Scope

**In scope (implemented):** public tourism site (ferry, food, events,
itineraries, lodging, parking/ATMs, webcams, charity portal, scavenger
hunts, weather/tides); role-based portals (business / nonprofit / admin)
editing all content at runtime; outbound feeds + syndication tooling;
first-party anonymous analytics incl. opt-in device location; LTAC survey;
admin map editor.

**Out of scope (v1, explicitly):** payment processing; user accounts for
*visitors*; native mobile apps; scraping any ToS-protected platform (Airbnb
especially); automated writes to external platforms (specified for v2 in
SYNDICATION.md); email sending (invite codes are handed over manually until
Resend is wired).

## 3. Functional requirements

Requirement IDs are stable; do not renumber. **[GAP]** marks known
shortfalls of the current implementation. Every requirement about *data*
carries an implicit sub-requirement: the UI must label non-live data as such
and link the authoritative source.

### FR-1 Ferry (the anchor feature)

- FR-1.1 Show today's Edmonds–Kingston sailings, both directions, with
  next-departure countdowns, refreshed at least every 60 s while viewed.
- FR-1.2 Use live WSDOT data (schedule, drive-up space, staff wait notes,
  service alerts filtered to the route) when an API key is configured;
  otherwise fall back to a bundled approximate schedule **clearly labeled
  "not live."** The app must never hard-fail because an upstream API is down.
- FR-1.3 Show the Kitsap Transit fast ferry (Kingston–Seattle) schedule with
  its non-obvious rules surfaced: direction-based fares ($2 out / $13 back),
  no Sunday service, summer-only Saturdays, Seattle side is Pier 50 not
  Colman Dock, walk-on only.
- FR-1.4 Practical guidance: walk-on vs drive decision help; fares and
  payment (cash is surcharge-free since WSF's 3% card fee, Mar 2026); July
  4th/peak surge warning; Hood Canal Bridge drawspan advisory; cash/ATM
  callout linking to FR-7.
- FR-1.5 Car-free arrival guidance from the Seattle side (Sounder/Amtrak to
  Edmonds; fast ferry from Pier 50).

### FR-2 Weather & tides

- FR-2.1 Current NWS forecast for Kingston on the home page (keyless API,
  graceful absence).
- FR-2.2 Today's NOAA tide predictions for Appletree Cove (station 9445639)
  with beach-walk framing.

### FR-3 Eat & Drink

- FR-3.1 Curated listing of every food business in town with description,
  cuisine, price level, walk time from the ferry, menu/ordering/map links.
  Content accuracy standard: every operational fact verified against ≥2 live
  sources, dated (`hoursVerified`), disputes kept visible ("call ahead")
  rather than silently resolved.
- FR-3.2 Structured weekly hours per business driving a **live open/closed
  badge** ("Open · closes 8 pm" / "Closed · opens tomorrow 11 am") computed
  in the visitor's browser in Pacific time (never stale static HTML),
  handling split shifts, past-midnight closes, and closed days.
- FR-3.3 An ordering-adjacent warning when the kitchen is closed, without
  blocking access to menus.
- FR-3.4 "What's open near me": opt-in device location sorts businesses by
  distance with walk estimates and open state; the permission ask is honest
  and paired with the value (see NFR-5).
- FR-3.5 Every listing emits schema.org LocalBusiness structured data
  (hours signal to search engines).

### FR-4 Events

- FR-4.1 Chronological, month-grouped calendar of real, verified events with
  date/time/venue/organizer/category/map/link; "this weekend" grouping.
- FR-4.2 Events are runtime-editable through the portals (FR-11/12) and flow
  to the home page, deconfliction views, and outbound feeds without
  redeployment.
- FR-4.3 [GAP → v2] Automated ingest from the Chamber's calendar (GrowthZone
  iCal and/or explorekingstonwa.com's Events Calendar REST API) instead of
  manual entry; recurring-event model instead of duplicated occurrences.

### FR-5 Itineraries

- FR-5.1 Curated, timed itineraries (walk-on/car/either) with real places
  only, map links per stop, and a return-ferry prompt. Four ship in v1
  (walk-on half day, family beach day, rainy day, Olympic gateway).

### FR-6 Stay

- FR-6.1 Real local lodging options (inns, rentals-community, camping,
  marina guest moorage) plus **compliant** deep links to Airbnb/Vrbo search
  (no scraping — Airbnb has no public API and its ToS forbids collection).

### FR-7 Parking & ATMs

- FR-7.1 An interactive map covering the **entire Kingston UGA**: every
  public street colored by parking rule (free 2-hr / free unrestricted / no
  parking / no known restriction), lots and zones as polygons, park & rides,
  ATMs, and the UGA boundary.
- FR-7.2 The Port of Kingston's lot rendered at parking-section resolution
  (free 2-hr row, POKPARK numbered areas, POKHILL, POKTT truck/trailer, load
  zones) with per-section rates, text-to-pay codes, and rules.
- FR-7.3 The ferry holding corridor (SR-104) must read as "the line for the
  boat," visually distinct from and quieter than genuine no-parking streets.
- FR-7.4 Zone shapes render as polygons with labels — not marker bubbles.
- FR-7.5 Every feature offers Street View (free deep link always; embedded
  panorama when a Maps Embed key is configured) so users can see the curb.
- FR-7.6 An honest overnight-parking answer per location, including
  "call the Port office first" where that is the truth.
- FR-7.7 Data honesty: street rules trace to the 2015 county study and say
  so ("the sign on the pole always wins"); unverified items are labeled;
  ATM list verified against operator locators (only 24-hr machine: BofA
  drive-up, Kingston Center).
- FR-7.8 Admins can correct any zone's shape, position, rules, and
  confidence in a map editor (drag vertices, draw new zones, mark
  field-verified) with changes going live without a deploy.

### FR-8 Webcams

- FR-8.1 All verified WSDOT cameras relevant to the ferry run (both sides),
  auto-refreshing stills with freshness indicator, offline placeholders,
  source credit, and "how locals read these" guidance.

### FR-9 Give Back (nonprofits)

- FR-9.1 Directory of real local nonprofits; volunteer shifts with slot
  counts and honest signup paths (contact the org).
- FR-9.2 **Deconfliction calendar**: all upcoming events in one date-grouped
  view with busy-date flags, so organizations don't book against each other.

### FR-10 Scavenger hunts

- FR-10.1 Self-guided hunts: sequential stops with clue → optional GPS
  check-in ("assist, not gate") → photo submission; progress survives
  reloads (localStorage); offline never bricks a hunt.
- FR-10.2 Photo check-off: the player's photo uploads with GPS coordinates;
  the server verifies distance against the stop radius → "verified" badge,
  else honor-system. Player copy is honest that photos go to organizers.
- FR-10.3 Admin hunt builder: create/edit hunts and stops, attach a
  **reference photo** per stop ("what you're looking for," shown to
  players), review submissions beside the reference with verified badges.

### FR-11 Business portal

- FR-11.1 Invite-linked accounts may edit only their own listings
  (admin: all). Editable: description, contact, links, ordering platform,
  cuisine, price, tags, and **structured weekly hours** through a purpose-
  built editor (per-day spans, split shifts, past-midnight, copy-to-weekdays)
  that regenerates the human-readable hours line and stamps the verification
  date.
- FR-11.2 Businesses manage their own events (create/edit/delete), with a
  non-blocking same-day-conflict warning at date selection.
- FR-11.3 Portal edits appear on the public site within 60 seconds.

### FR-12 Nonprofit portal

- FR-12.1 Org accounts edit their profile and volunteer shifts (including a
  quick slots-filled counter for phone/email signups).
- FR-12.2 Event creation shows the deconfliction warning *before* the date
  is committed.

### FR-13 Admin (Chamber)

- FR-13.1 First-run bootstrap creates the admin account; the setup page then
  disappears forever. Admins mint invite codes bound to role + specific
  listings/orgs, with copy-paste onboarding text.
- FR-13.2 Admin sees/edits everything: all portals, accounts and invites,
  hunts, the parking map editor, and visitor insights.
- FR-13.3 All `/admin` routes are role-gated (with a visible pre-setup grace
  before any account exists, so local bootstrap can't lock itself out).

### FR-14 Syndication ("update once, everywhere")

- FR-14.1 Per business/org: public JSON feed (incl. live `openNow`), iCal
  feed usable as a calendar subscription, and a dependency-free embeddable
  events widget for their own website (CORS-open).
- FR-14.2 A per-account syndication page: their feed URLs and snippets;
  copy-paste hours block plus deep links to Google/Apple/Yelp/Bing edit
  surfaces; per-event social compose blocks. **No promise of auto-sync may
  appear anywhere until an adapter actually ships.** The verified per-
  platform feasibility (Google: wireable; Meta: pilot path; Apple:
  application; Yelp: impossible; TikTok: deferred) is in SYNDICATION.md and
  is a v2 requirement set.

### FR-15 Visitor measurement (LTAC)

- FR-15.1 Automatic, anonymous, first-party: pageviews, outbound-link taps
  (which businesses we send people to), coarse origin from the connection
  (country/region/city in production), per-session random id, **no cookies,
  no third parties, no IP storage**.
- FR-15.2 Opt-in device location: only when the visitor taps a location
  feature; browser permission prompt; rounded to ~a block (3 decimals)
  before storage; bucketed into named town areas; disclosed at the point of
  use and on the About page.
- FR-15.3 Anonymous visitor survey (distance band, overnight stay, nights,
  party size) — the only zip-level origin source, because devices do not
  expose zip codes (see NFR-5 honesty requirement).
- FR-15.4 An admin insights dashboard aggregating all of the above into
  LTAC/JLARC-citable numbers: sessions, origins, top pages, outbound taps,
  around-town area counts, survey summary.
- FR-15.5 [GAP → v2] Time-series charts, CSV/PDF export aligned to JLARC
  reporting categories, bot filtering, k-anonymity floor.

### FR-16 About & trust

- FR-16.1 A plain-English page: who built it, why visits count (LTAC),
  exactly what is and isn't tracked, data-source credits, and how businesses
  get listed. The privacy copy must be updated in the same change as any
  tracking behavior change — drift between behavior and disclosure is a
  release blocker.

## 4. Non-functional requirements

### NFR-1 Mobile-first (CRITICAL)

The primary session is a phone, outdoors, possibly on ferry-terminal
congested cell service. Implemented today: mobile bottom navigation (5 slots
+ More sheet), responsive layouts on every page, tap-oriented map (scroll-
wheel hijack disabled, tap targets on small polygons), phone-first features
(camera capture, GPS). **Formal v2 bar (see ROADMAP-V2.md):** PWA
installability with offline ferry schedule + tides cache; ≥44 px touch
targets audited everywhere; primary CTAs in thumb reach; safe-area insets;
`inputmode` on all form fields; Lighthouse mobile LCP < 2.5 s on 4G
(current risk: hero photography); real-device test matrix (iOS Safari,
Android Chrome) as a release gate.

### NFR-2 Cost

$0/month at v1 scale: free-tier/keyless APIs only, no paid SKUs, deep links
instead of billable map/search APIs, self-hosted auth. Any change that
introduces spend requires explicit owner sign-off. (Known future spend
candidates: Postgres tier, error monitoring — both have free tiers.)

### NFR-3 Reliability through graceful degradation

Every external dependency must have a defined degraded mode that keeps the
page useful and honestly labeled (fallback schedule, "camera offline",
missing forecast, failed overlay fetch, offline hunt completion). Upstream
outages must never produce a blank or broken page.

### NFR-4 Data honesty (a product requirement, not a style choice)

Verified facts carry verification dates; disputed facts show the dispute;
derived/approximate geometry says so; "the sign on the pole always wins" on
anything traceable to the 2015 study; nothing unverified is presented as
fact. Wrong parking/hours data does real-world harm (towed cars, locked
doors) — when in doubt, under-claim.

### NFR-5 Privacy

No PII, no accounts for visitors, no ad tech, no data sales, no cookies for
tracking, no IP retention, location only by explicit permission and only
coarsened, photos only where copy says so. Public dashboards/exports carry
aggregates only. Honesty constraint: never imply the device can reveal a
home zip — it can't; the survey is the zip source.

### NFR-6 Security

Server-side authorization on every write (session + per-record `canEdit`);
scrypt password hashing; HMAC-signed expiring sessions; httpOnly/sameSite
cookies; path-traversal-safe file serving; upload type/size limits; secrets
only in `.env.local`/host env. Pre-public-deploy hardening list (rate
limiting, password reset, DB-backed state) lives in OPERATIONS.md and is a
deploy blocker.

### NFR-7 Maintainability by non-developers

The Chamber must be able to run this: all content editable through portals;
remaining seed files are typed, commented, and single-purpose; every data
source documented with refresh instructions; seasonal maintenance is a
dated checklist (OPERATIONS.md); admin UIs favor plain language.

### NFR-8 Brand fidelity

The app is visually part of explorekingstonwa.com: its palette
(#1E96C0 / #324A6D family), fonts (Satisfy display accents, Roboto,
Poppins), logo and photography — implemented exclusively through the design
tokens so a future rebrand is again a token swap.

### NFR-9 Accessibility

Semantic headings/landmarks, alt text, visible focus, AA contrast on text
(verified during rebrand; decorative cyan eyebrow exempted deliberately),
color never the sole carrier of map meaning (popups/list mirror the rules).
[GAP → v2] full audit + keyboard-first map alternative formalized.

## 5. Data requirements

All external sources, endpoints, verification status, and gotchas:
[DATA_SOURCES.md](DATA_SOURCES.md). Binding rules: adapters isolate every
source; time math is Pacific-anchored (server TZ must not matter);
seasonal data carries expiry awareness (fast-ferry GTFS ends 2026-09-12;
WSF fares change ~October; hours re-verified quarterly).

## 6. Constraints & assumptions

- Web platform only: no background location, camera/GPS by permission only,
  local storage is per-browser (documented in player copy).
- Single-node file persistence (`.data/`) is acceptable **only while
  self-hosted on one machine**; deploying to serverless requires the DB
  migration first (OPERATIONS.md blocker list).
- Kingston is unincorporated Kitsap County — county code + posted signs
  govern parking; the Port governs its own property.
- The owner's git/hosting identity separation (personal vs arda) per
  GIT_SETUP.md.

## 7. Acceptance criteria (v1 — all currently met unless [GAP])

1. A phone user answers "next boat home + what's open now" in ≤ 2 taps from
   the home page, in under 30 seconds.
2. With no API keys and no network to WSDOT, every page still renders with
   labeled fallback data.
3. A business owner can change hours in the portal and see the public badge
   and hours line update within 60 s — with zero developer involvement.
4. A nonprofit sees same-day conflicts *before* committing an event date.
5. The Chamber can produce LTAC-citable aggregate numbers (origins, visits,
   around-town movement, overnight stats) from /admin without engineering.
6. `npm run build` completes clean; every route responds 200 (or an
   intentional redirect) on a fresh checkout with only documented setup.
7. All admin/portal writes are rejected without a valid session of the
   right role (verified by the curl smoke suite in SDD §12).

## 8. Open questions

1. Which additional inaccuracies has the owner spotted on the parking map?
   (The admin editor is the fix-anything tool; specific items can also be
   corrected in seed.)
2. Should visitor-facing content ship a Spanish translation in v2?
3. Does the Chamber want volunteer *signup* handled in-app (accounts for
   volunteers) or is the contact-the-org path permanent?
4. PWA scope for v2: offline schedules only, or full page caching?
