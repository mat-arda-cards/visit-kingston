# Software Design Document — Explore Kingston

**Project:** `visit-kingston` — the interactive companion site to explorekingstonwa.com, built with the Greater Kingston Chamber of Commerce.
**Date:** July 2026
**Stack:** Next.js 16.2.10 (App Router), React 19.2.4, TypeScript 5, Tailwind CSS 4, Leaflet 1.9.4 (+ `@geoman-io/leaflet-geoman-free` 2.20 for the admin polygon editor), Node `fs` for persistence. ~14.8k LOC in `src/` + `scripts/` + `public/embed`.
**Audience:** an engineer (or AI agent) maintaining, extending, or faithfully re-implementing the system.

> Concurrency note ("map v2"): at the time of writing, the parking map is mid-refactor. The public map component (`src/components/town-map.tsx`) has already been restyled (zone polygons instead of circle markers, a `ferry-holding` street class, quick-view buttons). Two pieces are still landing: `src/lib/stores/parking-store.ts` (parking zones moving behind the same seed+overlay store pattern as the other stores) and an admin polygon editor at `/admin/map` using leaflet-geoman. Where those are referenced below they are marked **(landing in map v2)**; everything else is documented from the code as it exists.

---

## 1. Document purpose & system overview

This document is the design reference for Explore Kingston. Every claim is grounded in the source files named beside it.

**What the system is.** A tourism web app for Kingston, WA (unincorporated Kitsap County; ferry gateway to the Kitsap and Olympic Peninsulas), serving three constituencies:

1. **Visitors** — public pages: live ferry departures (WSDOT + Kitsap Transit), restaurants with a live "Open now" badge, an events calendar, parking/ATM map, WSDOT webcams, itineraries, lodging, a GPS-verified photo scavenger hunt, and a volunteer/give-back page.
2. **Local businesses & nonprofits** — an invite-only portal (`/portal/**`) where they edit their own listing, weekly hours, events, and volunteer shifts, plus a "syndication" page that packages their data as JSON/iCal feeds, an embeddable widget, and copy-paste snippets for Google/Apple/Yelp/Bing.
3. **The Chamber** — `/admin/**`: a Visitor Insights dashboard (anonymous analytics + survey aggregates for LTAC/JLARC lodging-tax reporting), account/invite management, a scavenger-hunt builder, and the parking-map polygon editor **(landing in map v2)**.

**Core architectural decisions:**

- **No database.** All mutable state lives in JSON/JSONL files under `.data/` (gitignored). Read paths use a *seed + overlay* merge: seed data is TypeScript checked into git (`src/lib/data/*`), portal edits are an overlay file that wins by id (§3). Every store module's exported interface is deliberately DB-shaped so a Postgres/Supabase implementation can replace the file I/O without touching callers.
- **No third-party auth.** Self-hosted invite-based accounts, scrypt password hashes, stateless HMAC-signed session cookies (§4).
- **Fail soft everywhere.** Every external dependency (WSDOT, NOAA, NWS, webcam images, the analytics store itself) degrades to a bundled fallback or a silent no-op rather than an error page (§5, §10).
- **Privacy-first analytics.** Cookie-less pageview/outbound tracking with server-side coarse geo; opt-in location pings rounded to ~100 m and bucketed into named areas; an anonymous visitor survey. No PII, no IP storage (§3, §6, §8).
- **Server components by default.** Client components are deliberate "islands" — anything that needs the browser clock, geolocation, Leaflet, localStorage, or form state (§7).

**Environment.** Two secrets in `.env.local`: `WSDOT_API_KEY` (optional; without it ferry data serves from a bundled fallback schedule marked `live: false`) and `AUTH_SECRET` (required; `src/lib/auth.ts` throws if missing). Optional: `NEXT_PUBLIC_GMAPS_EMBED_KEY` enables an embedded Street View panel on the map. `next.config.ts` is empty. Path alias `@/*` → `./src/*`.

**A caution for re-implementers:** per `AGENTS.md`, this Next.js 16 differs from older training data — notably, route-handler/page `params` and `searchParams` are `Promise`s that must be awaited (visible throughout `src/app/**`), and `next/image` uses a `preload` prop (see `src/app/page.tsx`).

---

## 2. Domain model (`src/lib/types.ts`)

The header comment states the contract: *"Every feature reads these types; data adapters in src/lib/data map external sources … into them so sources can be swapped without touching UI code."* Walk-through, in file order:

| Type | Semantics & invariants |
|---|---|
| `FerryRoute` | `"edmonds-kingston"` (WSF car ferry) \| `"kingston-seattle-fast"` (Kitsap Transit passenger-only). |
| `Direction` | `"to-kingston"` \| `"from-kingston"`. Every sailing is normalized to Kingston's perspective, whichever agency it came from. |
| `Sailing` | `departs` is ISO 8601 **with local offset** (e.g. `2026-07-02T14:30:00-07:00`); optional `arrives`, `vessel`, `notes` (fallback sailings carry a "confirm with WSDOT" note). |
| `TerminalStatus` | Per-terminal live data: `driveUpSpaces?` (undefined when WSDOT reports −1/null), `waitEstimate?` (staff-entered note text), `alerts: string[]`, **`live: boolean`** — the system-wide honesty flag: `false` means "served from the bundled fallback schedule", and every UI surfaces that. `asOf` ISO timestamp. |
| `Webcam` | `imageUrl` is a hotlinked WSDOT JPEG (no CORS, no Cache-Control — see §5/§7); `sourceUrl` is the credit/link-back page *"per source embedding terms"*; `refreshSeconds` is the measured source cadence the client polls at. |
| `DayHours` | `[open, close][]` of 24h `"HH:mm"` pairs. **Invariants:** empty array = closed; two pairs = split shift; *"a close time at or before its open time means the span runs past midnight"* (e.g. `["17:00","01:00"]`). This convention is honored by the hours engine (§8), the hours editor, the portal validation (which rejects only `open === close`), and the JSON-LD emitter. |
| `WeeklyHours` | Seven `DayHours` keyed `mon..sun`. |
| `Restaurant` | The business-listing record. `weeklyHours?` powers the live badge; `hours?` is the human string (regenerated by the portal editor, §7); `hoursVerified?` ISO date of last verification against live sources; `orderingPlatform` enum `toast\|square\|doordash\|own-site\|phone-only` (phone-only renders a `tel:` button); `priceLevel 1\|2\|3`; `lat/lng/walkMinutesFromFerry` are Chamber-controlled placement fields (only admins may write them, §6). |
| `ParkingArea` | The **legacy flat** parking record (`type: lot\|street\|ferry-holding`) still exported from `src/lib/data/parking.ts` for prose consumers. The rich map dataset is `MapZone` (below, defined in the data file, not types.ts). |
| `Atm` | Cash-access point; `feeNote` is load-bearing content (surcharge honesty); `AtmMeta` (in `src/lib/data/atms.ts`) adds `open24h`, `driveMinutes`, `confidence`, `sourceUrl`. |
| `Lodging` | `type: hotel\|vacation-rental\|bnb\|camping\|marina`; links only — no scraped OTA data (Airbnb/VRBO are search deep links per their ToS, see `src/app/stay/page.tsx`). |
| `EventCategory` | `festival\|market\|music\|community\|charity\|sports\|arts`. |
| `EventItem` | `start`/`end?` ISO 8601 (portal writes anchor to Pacific wall time via `pacificWallTimeToISO`); `charityId?` links nonprofit events into the charity portal; **`ownerId?` is the portal-ownership key** — the listing/org id whose account manages the event; `canEdit(user, ownerId)` gates every mutation (§4, §6). Seed-data convention: a midnight start renders "All day" (`src/app/events/page.tsx`). |
| `ItineraryStop` / `Itinerary` | Static content; `mapQuery?` builds a Google Maps deep link; `mode: walk-on\|car\|either`. |
| `Charity` / `VolunteerNeed` | Org profile (4 portal-editable fields) and a shift: `slotsFilled` is clamped server-side to `0..slotsTotal`; `date` is a full ISO instant (bare form dates get anchored at Pacific midnight, §6). |
| `HuntStop` / `Hunt` | `radiusMeters` — *"how close (meters) the GPS check-in must be"* — is the verification threshold (server clamps to 20..1000, default 100); coordinates are deliberately approximate with generous radii (seed-file comment: *"GPS is an assist, not a gate"*). `difficulty: easy\|moderate`. |
| `SurveyResponse` | *"One anonymous LTAC visitor-survey response. No PII is collected."* `distanceBand` enum (`local\|10-50mi\|50mi-plus\|out-of-state\|international`) is the only required field; `lodgingNights` capped at 60, `partySize` at 50 server-side. |

**Domain extensions living outside types.ts** (deliberate: local modules extend rather than bloat the shared model):

- `MapZone` + `ParkingRule` (`src/lib/data/parking.ts`): the rich parking dataset. `rule: free-2hr | free-unrestricted | paid | park-and-ride-24h | prohibited`; **`confidence: "verified" | "probable" | "unverified"`** with `sourceNote` — the confidence label is a first-class product feature (surfaced as badges, italic caveats, and popup captions; "probable" entries all trace to the 2015 county curb study and carry *"per 2015 county study — obey posted signs"*); `overnight: "yes" | "no" | "confirm-first"`; `center: [lat,lng]`; optional `polygon` for lots with known corners. Moving behind `parking-store.ts` **(landing in map v2)**.
- `StoredHunt`/`StoredHuntStop`/`AdminHunt`/`HuntSubmission` (`src/lib/hunt-store.ts`): adds `referencePhoto` (relative path), `source: seed|custom`, and the submission record (§3).
- `User`/`InviteCode`/`Role` (`src/lib/auth.ts`, §4).
- `AnalyticsEvent`/`AnalyticsGeo`/`AreaBox`/`AnalyticsSummary` (`src/lib/analytics-store.ts`, §3, §8).
- `SurveyStore`/`SurveySummary` (`src/lib/survey-store.ts`).

**Seed-data inventory** (all hand-verified against live sources, dated 2026-07-02 in file comments): 17 restaurants, 16 events, 6 charities + 4 volunteer needs, 5 lodging entries, 8 ATMs, 13 `MapZone`s + 6 legacy `ParkingArea`s, 11 webcams, 4 itineraries, 2 hunts (7 + 6 stops), plus the ferry fallback schedule.

---

## 3. Persistence design

There is no database. Persistence is files under `.data/` (gitignored), in four idioms: **seed+overlay JSON stores**, the **hunt file tree**, **append-only JSONL**, and **plain JSON auth files**.

### 3.1 The seed+overlay pattern — `src/lib/stores/json-store.ts`

~45 lines that everything portal-editable is built on:

- Overlay files live at `.data/stores/<name>.json`, each an array of records with `id` plus an optional `_deleted` flag: `type Overlay<T> = (T & { _deleted?: boolean })[]`.
- `readOverlay(name)` — parse the file; **any error (missing, corrupt) returns `[]`** (fail-soft read).
- `writeOverlayRecord(name, record)` — read-modify-write: replace by `id` or append, then write the whole array (`JSON.stringify(..., null, 1)`). No locking; last write wins (acceptable single-node, small-town scale — a known limitation, §11).
- `readMerged(name, seed)` — the core merge: build a `Map<id>` from seed, then overlay each overlay record over it (overlay wins by id), filter out `_deleted`, and strip the `_deleted` key before returning. **Deletion is a tombstone**: `{ id, _deleted: true }` written to the overlay hides a seed record forever (and removes an overlay-only record from reads); the tombstone itself persists in the file as a record.

Consequences worth knowing: an overlay record fully *replaces* the seed record (no field-level merge — which is why the portal PUT handlers merge onto the *stored* record before saving, §6); seeds can be edited in git and the change shows through unless an overlay shadows that id.

### 3.2 The concrete stores

| Store module | Overlay name(s) | Seed | API |
|---|---|---|---|
| `src/lib/stores/business-store.ts` | `restaurants` | `data/restaurants.ts` | `getRestaurants`, `getRestaurant(id)`, `saveRestaurant` (no delete — listings are Chamber-curated) |
| `src/lib/stores/event-store.ts` | `events` | `data/events.ts` | `getEvents` (sorted by `start`), `getEvent`, `saveEvent`, `deleteEvent` (tombstone), `eventsSharingDate(dateIso, excludeId?)` — the deconfliction query: same `start.slice(0,10)` calendar date, excluding one id |
| `src/lib/stores/charity-store.ts` | `charities`, `volunteer-needs` | `data/charities.ts` | `getCharities/getCharity/saveCharity`; `getVolunteerNeeds` (sorted by date) `/saveVolunteerNeed/deleteVolunteerNeed` |
| `src/lib/stores/parking-store.ts` **(landing in map v2)** | `parking` | `data/parking.ts` (`parkingZones`) | seed+overlay like the above, so the `/admin/map` polygon editor's edits overlay the researched seed zones; the public map and parking page will read through it instead of importing `parkingZones` directly |

### 3.3 Hunt store — `src/lib/hunt-store.ts`

Server-only module (header warning: *"Do NOT import from client components (it touches the filesystem); `import type` is fine anywhere"*). Its own file layout under `.data/hunts/`:

```
.data/hunts/custom-hunts.json            admin hunts — full StoredHunt objects (pretty-printed, 2-space)
.data/hunts/refs/<huntId>-<stopId>.<ext> per-stop reference photos ("what the spot looks like")
.data/hunts/photos/<huntId>/<stopId>/<epochMs>-<rand6>.<ext>   player submissions
.data/hunts/submissions.jsonl            one JSON line per HuntSubmission
```

- **Merge rule** (`getAllHunts`): seed hunts (`data/hunts.ts`) merged with `custom-hunts.json`; *a custom hunt with the same id overrides the seed* (tagged `source: "custom"`); custom-only hunts are appended. No tombstones — hunts are never deleted through the app.
- `saveHunt` re-validates ids (`isSafeId`, because ids become file-path segments), rejects slug collisions across the merged set, and **preserves a stop's existing `referencePhoto` when the incoming stop omits one**; incoming `referencePhoto` values are only kept if they pass `getPhotoAbsolutePath` *and* start with `refs/`.
- `saveReferencePhoto` writes `refs/<huntId>-<stopId>.<ext>`, deletes a stale reference in another format, and **materializes a seed hunt into custom-hunts.json** if needed so the pointer has somewhere to live.
- `saveSubmission` computes the check-off decision (§8): `verified = coords present && haversine ≤ radiusMeters`; stores the photo, then appends a `HuntSubmission` line (`ts, huntId, stopId, photoPath, lat?, lng?, distanceMeters?` (rounded), `verified`).
- `listSubmissions` reads the JSONL, skipping corrupt lines, newest first.
- `getPhotoAbsolutePath` / `readPhoto`: strict path sanitization for query-string-supplied paths (§11).
- Constants: `MAX_PHOTO_BYTES = 8 MiB`; accepted images jpeg/png/webp/heic (both MIME→ext and ext→MIME maps; `jpeg` normalizes to `jpg`).

### 3.4 Append-only JSONL stores

- **Analytics** — `src/lib/analytics-store.ts`, file `.data/analytics/events.jsonl`. `saveEvent` appends one line; `summarize()` re-reads and re-aggregates the whole file on every call — the header comment declares this *"fine at Kingston scale (thousands of rows)"* and names the upgrade path: *"swap this module's internals for a database (Vercel Postgres / Supabase) keeping the same exports."* What is stored (and only this, per the module's privacy contract): `ts`, `type` (`pageview|outbound|geo-ping`), `path`, random per-browser-session `sessionId`, coarse header-derived `geo {country?,region?,city?,source}`, outbound `href/label`, and for geo-pings `lat/lng` rounded to 3 decimals plus a server-classified `area`. Corrupt lines are skipped, never fatal.
- **Survey** — `src/lib/survey-store.ts`, file `.data/ltac-responses.jsonl`. This one is *explicitly* pluggable: a `SurveyStore` interface (`save`, `summarize` — *"aggregate counts … never raw rows with timestamps"*), a `FileSurveyStore` implementation, and a single exported instance `surveyStore`. The header says it plainly: in production, implement `SurveyStore` against a database and change the export at the bottom.

### 3.5 Auth files

`.data/auth/users.json` (array of `User`, including scrypt `passwordHash`) and `.data/auth/invites.json` (array of `InviteCode`). Read via a fail-soft `readJson(file, fallback)`; written whole with `JSON.stringify(..., null, 1)` after `mkdir -p`. See §4.

### 3.6 The `.data/` directory tree (complete)

```
.data/
├── auth/
│   ├── users.json               # User[] — created by /api/auth/setup
│   └── invites.json             # InviteCode[] — created on first invite (lazy)
├── stores/                      # seed+overlay files, all lazy-created
│   ├── restaurants.json         # Overlay<Restaurant>
│   ├── events.json              # Overlay<EventItem>
│   ├── charities.json           # Overlay<Charity>
│   ├── volunteer-needs.json     # Overlay<VolunteerNeed>
│   └── parking.json             # Overlay<MapZone>            (landing in map v2)
├── hunts/
│   ├── custom-hunts.json        # StoredHunt[]
│   ├── refs/                    # <huntId>-<stopId>.<ext>
│   ├── photos/<huntId>/<stopId>/# player uploads
│   └── submissions.jsonl        # HuntSubmission per line
├── analytics/
│   └── events.jsonl             # AnalyticsEvent per line
└── ltac-responses.jsonl         # SurveyResponse per line
```

Every writer `mkdir`s its parent recursively, so a fresh checkout needs no setup beyond `.env.local`.

### 3.7 Migration path

The stated design intent, repeated in `json-store.ts`, `analytics-store.ts`, and `survey-store.ts` headers: module *interfaces* are the contract; the file I/O behind them is an implementation detail sized for one node and small volume. A Postgres implementation replaces the internals of each store module (or the `surveyStore` export) without changing any route or page. Reasons you would migrate: serverless/read-only filesystems, multi-instance deployment (the read-modify-write overlay writes are not concurrent-safe), or data volume.

---

## 4. Authentication & authorization design (`src/lib/auth.ts`)

Self-hosted, ~220 lines, server-only (node:crypto + fs + `next/headers` cookies). Design summary from the header: *"invite-based accounts (the Chamber controls who gets in), scrypt password hashes, and stateless HMAC-signed session cookies — no database, no third-party auth service."*

### 4.1 Passwords

- `hashPassword`: 16 random bytes of salt (hex), `scryptSync(password, salt, 64)` (Node defaults: N=16384, r=8, p=1), stored as **`scrypt$<salt-hex>$<hash-hex>`**.
- `verifyPassword`: splits on `$`, requires scheme `scrypt`, recomputes, compares with `timingSafeEqual` after a length check. Any malformed stored value → `false`.

### 4.2 Session tokens — stateless HMAC cookie

- **Format:** `base64url(JSON{ uid, exp }) + "." + base64url(HMAC-SHA256(payload, AUTH_SECRET))` — `makeSessionToken`. `exp` is epoch-ms, `Date.now() + 30 days` (`SESSION_DAYS = 30`).
- **Verification** (`parseSessionToken`): split on `.`; recompute signature; `timingSafeEqual` (guarded by a length check so unequal lengths return null instead of throwing); then parse payload and enforce `exp >= now`. Returns `uid` or `null`. There is no server-side session list — tokens are self-contained; the only revocations are expiry and user deletion (below).
- **Cookie** (`sessionCookie`): name **`vk-session`**, `httpOnly: true`, `sameSite: "lax"`, `path: "/"`, `maxAge: 30 days`. Note: **no `secure: true`** — acceptable for the current LAN/local posture, on the pre-deploy hardening list (§11).
- `getSessionUser()`: read cookie → parse token → look the uid up in `users.json`. Because the user list is consulted per request, **deleting a user from users.json invalidates their outstanding tokens** despite statelessness.
- `secret()`: reads `process.env.AUTH_SECRET` and **throws** if missing — auth cannot silently run unsigned.

### 4.3 Role model & `canEdit`

`Role = "business" | "nonprofit" | "admin"`. A `User` carries `linkedIds: string[]` — *"restaurant ids (business) or charity ids (nonprofit) this account manages."* The single authorization primitive:

```ts
export function canEdit(user: User, id: string): boolean {
  return user.role === "admin" || user.linkedIds.includes(id);
}
```

Admins can edit everything; others exactly their linked listings/orgs. There is no finer-grained permission anywhere.

### 4.4 Invite lifecycle

1. **Mint** (admin-only, `POST /api/portal/invites`): `createInvite` generates a 12-hex-char code (`randomBytes(6)`), stores `{ code, role, linkedIds, note?, createdAt }`. The route validates `linkedIds` against the *real* stores (restaurants for business, charities for nonprofit) so *"a typo'd or malicious id can never grant edit rights to a listing that exists later"*; admin invites always get `linkedIds: []`. Note ≤ 200 chars.
2. **Redeem** (`POST /api/auth/redeem` → `redeemInvite`): code must exist and have no `usedBy`. Creates the user with the invite's role/linkedIds (email uniqueness enforced case-insensitively in `createUser`), then marks `invite.usedBy = user.id`. **One-time use; used codes are kept as an audit record** (rendered struck-through in `/admin/accounts`). Invites do not expire.
3. The `/admin/accounts` UI generates a paste-ready email blurb containing the join URL + code.

### 4.5 First-run bootstrap

- `POST /api/auth/setup` creates the **first** account, hard-coded `role: "admin"`, `linkedIds: []` — and refuses with 403 the moment `hasAnyUsers()` is true (*"Locked forever after"*).
- `/portal/setup` is the UI; it `redirect("/portal")`s once users exist. `/portal` conversely redirects *to* `/portal/setup` while no users exist.
- **The `/admin` layout no-users grace** (`src/app/admin/layout.tsx`): everything under `/admin` is gated by one server layout — role `admin` → allowed; **zero users → allowed with a loud amber banner** (*"pre-setup grace so a fresh local install can reach /admin before the first admin account is created … otherwise bootstrap could lock itself out"*); anyone else → `redirect("/portal")`.

### 4.6 Defense in depth

The layout gate is not trusted alone. Re-checks in code:

- `/admin/accounts/page.tsx` re-checks (`user?.role !== "admin" && hasAnyUsers() → redirect`) and strips `passwordHash` before passing users to the client component (*"props to a client component are serialized into the page payload"*).
- Every portal API route (`/api/portal/*`) independently calls `getSessionUser()` and returns 401/403; invite and user routes require role `admin` explicitly.
- Every mutation resolves ownership from the **stored** record, never the client's word: event update/delete checks `canEdit(user, existing.ownerId)`; needs use `existing.charityId`; the listing PUT checks `canEdit(user, stored.id)` and re-pins `next.id = stored.id` (*"belt and braces"*).
- Portal pages (`/portal/business/[id]`, `/portal/nonprofit/[id]`) redirect server-side on `!canEdit`.

### 4.7 Known limitations (by design, current posture)

Stated in code comments and to be fixed pre-deploy (§11): **no rate limiting** (login is brute-forceable), **no password reset** flow (admin edits `users.json` by hand), **no CSRF token** — mitigation is `sameSite: "lax"` plus JSON bodies on all mutating routes, **single-node file store** (no locking; users.json read per request), no `secure` cookie flag, sessions not individually revocable, invites never expire. Separately, the **hunt admin API has no auth at all** (§6, §11).

---

## 5. External integrations (adapters in `src/lib/`)

Four adapters, all sharing one contract: **never throw, never block the page — return a fallback and mark it.** All server-side fetches use Next's `fetch(..., { next: { revalidate: N } })` data cache for self-throttling.

### 5.1 WSDOT Ferries — `wsf.ts`

- **Constants (verified 2026-07-02, per header + `docs/DATA_SOURCES.md`):** Edmonds `TerminalID = 8`, Kingston `= 12`, Edmonds–Kingston `ED_KING_ROUTE_ID = 6`. Bases: `https://www.wsdot.wa.gov/ferries/api/schedule/rest` and `.../terminals/rest`.
- **Auth:** free WSDOT access code in `WSDOT_API_KEY`, appended as `apiaccesscode=` **in the URL query string — so these calls must stay server-side** (header comment). No key → `wsfFetch` returns `null` immediately and everything falls back.
- `wsfFetch<T>(url, revalidateSeconds)`: returns `null` on missing key, non-OK status, or thrown fetch/JSON error.
- **WCF date quirk:** responses carry `/Date(1719936000000-0700)/` strings; `parseWsdotDate` extracts the epoch-ms with regex `/\/Date\((\d+)(?:[-+]\d{4})?\)\//`, ignores the embedded offset, and emits UTC ISO (`new Date(ms).toISOString()`) — correct because the ms value is absolute.
- `getTodaysSailings()` → two parallel `GET /scheduletoday/{from}/{to}/false` calls (revalidate **900 s**; `/scheduletoday` means *"no date math, WSDOT handles the seasonal schedule"*). Both must succeed for `live: true`; response shape is `TerminalCombos[].Times[]` (`DepartingTime`, `ArrivingTime | null`, `VesselName`), flat-mapped into `Sailing`s. Otherwise `{ sailings: fallbackSailings(), live: false }`.
- `getTerminalStatus(terminal)` → parallel `GET /terminalsailingspace/{id}` (revalidate **60 s**) + `GET /terminalwaittimes/{id}` (revalidate **300 s**). Quirks handled: drive-up space is nested `DepartingSpaces[0].SpaceForArrivalTerminals[0].DriveUpSpaceCount` and *"can be -1/null when unavailable"* — only `count >= 0` is surfaced; **the wait-times payload nests under `WaitTimes[]`** and is filtered to `RouteID === ED_KING_ROUTE_ID` with non-null `WaitTimeNotes` (the terminal serves multiple routes). Space failure → base `{ live: false }`; wait-notes failure alone still returns `live: true`. Ed-King has no vehicle reservations, so drive-up count is *the* number that matters (comment).
- `getRouteAlerts()` → `GET /alerts` (revalidate **300 s**); filtered to `AllRoutesFlag || AffectedRouteIDs?.includes(6)`; returns `AlertFullTitle` strings, `[]` on failure.
- **Fallback** — `data/ferry-fallback.ts`: a typical two-boat summer timetable (23 sailings each way, ~50-min headways, 30-min crossing), rebuilt for *today* on each call via `todayPacific()` + `pacificWallTimeToISO`, each sailing annotated `notes: "Approximate seasonal time — confirm with WSDOT"`. The UI renders `live:false` data with "Schedule only" badges and confirm-at-WSDOT links.

### 5.2 Kitsap Transit fast ferry — `kitsap.ts`

No live API. Times were **extracted from Kitsap Transit's official GTFS feed** (feed `S1000066`, valid 2026-06-14 → 2026-09-12; header documents the URL and the refresh obligation when the fall schedule drops). Hardcoded arrays: 6 weekday sailings each way; 8 Saturday sailings each way **summer-only** (`dow === 6 && month 5..9` in Pacific time via `Intl.formatToParts`); **no Sunday service ever**. `CROSSING_MINUTES = 39`. `getFastFerrySailings()` is synchronous and always `{ live: false }`. Also exports `FAST_FERRY_FACTS` — verified prose constants (the direction-based $2/$13 fare, Pier 50 vs Colman Dock, walk-on-only boarding, tracker/schedule URLs) rendered on the ferry page.

### 5.3 National Weather Service — `weather.ts`

`GET https://api.weather.gov/gridpoints/SEW/121,78/forecast` — gridpoint verified for the ferry dock (47.796, −122.498). **NWS requires an identifying User-Agent**: `"visit-kingston-wa (community tourism site)"` sent on every request. Revalidate **1800 s**. Returns the first `count` (default 4) `properties.periods` entries (`name`, `temperature`, `temperatureUnit`, `shortForecast`, `isDaytime`); `[]` on any failure — the home page then renders "See forecast at weather.gov".

### 5.4 NOAA CO-OPS tides — `tides.ts`

Station **9445639** (Kingston, Appletree Cove) — header explicitly warns *"NOT 9445478, which is Union/Hood Canal."* One GET to `api.tidesandcurrents.noaa.gov/api/prod/datagetter` with `product=predictions&datum=MLLW&interval=hilo&date=today&time_zone=lst_ldt&units=english&format=json`; revalidate **21600 s** (6 h). Maps `{t, v, type: "H"|"L"}` → `{time, type: "high"|"low", heightFeet}`. Quirk: `time` is NOAA's *station-local* `"YYYY-MM-DD HH:mm"` string, not ISO — the home page slices `t.time.slice(11)` for display rather than parsing it. `[]` on failure.

### 5.5 Pacific-time construction — `time.ts`

The lynchpin that makes fallback schedules and portal dates correct regardless of server timezone (*"Kingston runs on Pacific time; the server may not"*):

- `todayPacific()` — `Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" })` → `YYYY-MM-DD`.
- `pacificWallTimeToISO(dateStr, hhmm)` — probes noon UTC of that date with `timeZoneName: "longOffset"` to learn the offset in effect (PDT vs PST handled per-date), falls back to `-08:00`, and emits `YYYY-MM-DDTHH:mm:00±HH:MM`. Used by the ferry fallback, kitsap schedule, and portal event/need date anchoring.
- `formatPacificTime/Date(iso)` — display formatting pinned to the zone.

---

## 6. API surface (`src/app/api/**` — 19 routes)

### 6.1 Summary table

| # | Route | Methods | Auth | Purpose |
|---|---|---|---|---|
| 1 | `/api/auth/setup` | POST | none (self-locking) | Create first admin; 403 once any user exists |
| 2 | `/api/auth/login` | POST | none | Verify credentials, set `vk-session` cookie |
| 3 | `/api/auth/logout` | POST | none | Clear cookie (`maxAge: 0`) |
| 4 | `/api/auth/redeem` | POST | invite code | Redeem invite → create user → set cookie |
| 5 | `/api/portal/listing` | PUT | session + `canEdit` | Update a restaurant listing (whitelisted fields) |
| 6 | `/api/portal/events` | GET/POST/DELETE | mixed (see detail) | Business-portal events + public date deconfliction |
| 7 | `/api/portal/org` | PUT/POST | session + `canEdit` | Nonprofit profile; nonprofit events via `action` |
| 8 | `/api/portal/needs` | GET/POST/DELETE | mixed | Volunteer shifts + public date deconfliction |
| 9 | `/api/portal/invites` | GET/POST | admin only | List / mint invite codes |
| 10 | `/api/portal/users` | GET | admin only | User list, `passwordHash` stripped |
| 11 | `/api/feeds/events` | GET | none, CORS `*` | Public events feed — JSON or iCalendar |
| 12 | `/api/feeds/business/[id]` | GET | none, CORS `*` | One listing + computed `openNow` |
| 13 | `/api/hunts` | GET/POST | **none** (documented) | Hunt list/merge + submissions list; hunt CRUD |
| 14 | `/api/hunts/photo` | GET | **none** | Stream a stored hunt image by sanitized path |
| 15 | `/api/hunts/reference` | POST | **none** | Attach a stop reference photo (multipart) |
| 16 | `/api/hunts/submit` | POST | none (public by design) | Player photo submission → verified/unverified |
| 17 | `/api/survey` | POST/GET | none | Save survey response; GET aggregate summary |
| 18 | `/api/track` | POST | none | Analytics beacon; always `{ ok: true }` |
| 19 | `/api/ferry/status` | GET | none | Live ferry payload the ferry page polls |

All routes are `fs`-backed and therefore dynamic; only the two feeds set explicit cache headers.

### 6.2 Auth group

- **`POST /api/auth/login`** — body `{email, password}`; 400 on bad JSON/missing fields; 401 `"wrong email or password"` (single message for both cases); success `{ok:true, role}` + cookie.
- **`POST /api/auth/logout`** — unconditional `{ok:true}`, cookie cleared with `maxAge: 0`.
- **`POST /api/auth/redeem`** — `{code, email, name, password}`; password ≥ 8 chars; code trimmed; errors from `redeemInvite`/`createUser` (invalid/used code, duplicate email) surface as 400 with the message; success sets cookie, `{ok:true, role}`.
- **`POST /api/auth/setup`** — 403 `"setup already completed"` if `hasAnyUsers()`; else validates like redeem and creates role-admin user + cookie.

### 6.3 Portal group

- **`PUT /api/portal/listing`** — 401 without session; loads the **stored** restaurant by `body.id` (404 if absent), 403 unless `canEdit(user, stored.id)`. Field policy (comment: *"only whitelisted fields merge onto the stored record"*): required text `description/cuisine/address` only overwritten by non-empty strings; optional text `phone/website/menuUrl/orderingUrl/hours` where empty string clears; `orderingPlatform` validated against the 5-value enum (empty/null clears, unknown → 400); `priceLevel` must be exactly 1|2|3; `tags` array of strings, trimmed, max 12; `weeklyHours` through `parseWeeklyHours` — a strict shape check requiring all 7 day keys, ≤ 2 spans/day, `HH:mm` matching `^([01]\d|2[0-3]):[0-5]\d$`, and `open !== close` (close < open allowed = past-midnight); `hoursVerified` must be `YYYY-MM-DD`. **Admin-only fields:** `name`, `lat`, `lng`, `walkMinutesFromFerry` (*"placement fields … stay Chamber-controlled"*). Returns `{ok, listing}`.
- **`GET /api/portal/events`** — two modes: `?onDate=YYYY-MM-DD[&exclude=id]` is **public** (comment: *"no auth: this is the same data the events page shows"*) and returns `{events}` sharing that calendar date; `?ownerId=X` requires session + `canEdit(user, X)` and returns the events with that `ownerId`. Neither param → 400.
- **`POST /api/portal/events`** — session required; `ownerId` required + `canEdit`; `title` required; `start` must match `^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}` (datetime-local values pass through as-is); category ∈ enum; `organizer` defaults to `user.name`, `venue` to organizer. **Update path:** loads the stored event by `body.id`, 404 if missing, 403 unless `canEdit(user, existing.ownerId)` (*"never trust the client-sent id alone"*). **Create path:** id = `slugify(title).slice(0,48)` + `-` + 6 hex chars. Returns `{ok, event}`.
- **`DELETE /api/portal/events?id=`** — session; stored-owner `canEdit`; tombstones via `deleteEvent`.
- **`PUT /api/portal/org`** — session + `canEdit(user, id)`; whitelists exactly four fields (`name` non-empty-or-keep, `mission`, `website`/`contactEmail` where empty clears); id pinned.
- **`POST /api/portal/org`** — action dispatch, exists so *"the two portals never collide on a file"* (nonprofit events go here, not through `/api/portal/events`): `action:"saveEvent"` takes `{orgId, event:{title, venue, date: YYYY-MM-DD, startTime: HH:mm, endTime?, address?, description?, category?, organizer?, url?, id?}}`, requires `canEdit(user, orgId)` and an existing org; on update re-checks `canEdit` against the stored event's `ownerId ?? charityId`; builds `start`/`end` with `pacificWallTimeToISO`; category defaults to `"charity"`; sets both `charityId` and `ownerId` to the org. `action:"deleteEvent"` mirrors the ownership check then tombstones. Unknown action → 400.
- **`GET /api/portal/needs`** — `?onDate=` public deconfliction (same `eventsSharingDate` as the events route, `excludeId` param name differs) returning `{ok, events}`; `?charityId=` auth + `canEdit` returning `{ok, needs}`.
- **`POST /api/portal/needs`** — session required. Branch 1, the **slots stepper**: `{action:"slots", id, delta:+1|-1}` → loads the need, `canEdit(user, need.charityId)`, clamps `slotsFilled` to `0..slotsTotal`. Branch 2, create/update a shift: `title`, `timeRange`, `date` required; a bare `YYYY-MM-DD` is anchored at Pacific midnight (`pacificWallTimeToISO(date, "00:00")` — comment: *"so it lands on the right calendar day"*), a full ISO instant passes through; `slotsTotal` clamped 1..999, `slotsFilled` 0..slotsTotal; update takes id/charityId/eventId from the **stored** record; create requires `charityId` + `canEdit` and mints `slug-6hex`.
- **`DELETE /api/portal/needs?id=`** — session + stored-charity `canEdit` → tombstone.
- **`GET|POST /api/portal/invites`** — both verbs behind `requireAdmin()` (401 no session, 403 non-admin). POST validates role ∈ enum, dedupes `linkedIds`, **cross-checks each id against the live store** for that role (unknown ids → 400 listing them), admin invites forced to `linkedIds: []`, note trimmed to 200. Returns `{ok, invite}` (the full code).
- **`GET /api/portal/users`** — admin only; maps users through a destructure that drops `passwordHash` (*"Password hashes never leave the server"*).

### 6.4 Feeds group (public, CORS `*` on purpose)

- **`GET /api/feeds/events`** — headers `Access-Control-Allow-Origin: *` and `Cache-Control: public, s-maxage=300, stale-while-revalidate=600`. Filters to *"anything not yet finished (events in progress still count)"*: `new Date(e.end ?? e.start) >= now`. `?owner=` filters `ownerId === owner || charityId === owner`. Default JSON: `{source, generatedAt, count, events[]}` with a stable public projection (no ownerId/charityId leak — fields are explicitly enumerated). **`?format=ics`** returns RFC 5545 iCalendar (`text/calendar; charset=utf-8`; filename slug sanitized `[^a-zA-Z0-9_-]`): UTC `DTSTART/DTEND` via `toUtcStamp` (basic format `YYYYMMDDTHHMMSSZ` — emitting UTC avoids shipping a `VTIMEZONE`; *"calendar apps re-render in the viewer's zone"*), `escapeText` per §3.3.11 (backslash, semicolon, comma, newlines — `URL` is exempt as a URI value type), and **75-octet line folding that iterates code points so a multi-byte UTF-8 character is never split** (`fold`, continuation lines start with a space that counts toward their own 75). UID = `<escaped id>@explorekingston`. Calendar-level props: `X-WR-CALNAME: Kingston WA Events`, `X-WR-TIMEZONE: America/Los_Angeles`.
- **`GET /api/feeds/business/[id]`** — same CORS; `Cache-Control: public, s-maxage=60, stale-while-revalidate=300` (*"short because open/closed flips on minute boundaries"*). 404 `{error}` (with CORS header) when the id is unknown. Payload: identity/contact/links (nulls, not undefined), `weeklyHours`, `hoursVerified`, and **server-computed `openNow`/`openLabel`** via the same `getOpenStatus` the site badge uses, plus `asOf`. This is the anti-drift mechanism: a restaurant's own website polls this so its hours never diverge from the portal's canonical copy. Consumed by `public/embed/kingston-events.js`'s sibling flow (the embed itself consumes the events feed; it is a dependency-free IIFE that inserts a `<div>` after its own script tag, renders via `textContent` only — nothing from the feed is parsed as HTML — and **removes itself entirely on any failure**).

### 6.5 Hunts group

Posture, stated verbatim in `/api/hunts/route.ts`: *"this app runs local-only for the Chamber (one laptop, no public deployment), so there is NO auth on these endpoints. Before deploying anywhere public, gate /api/hunts POST and ?submissions= behind admin auth."*

- **`GET /api/hunts`** — `{hunts}` (seed+custom merged; each stop gains `referencePhotoUrl` via `photoUrl()` while the on-disk path also remains). **`GET /api/hunts?submissions=<huntId>`** — validates `isSafeId`, returns `{submissions}` newest-first, each with `photoUrl`.
- **`POST /api/hunts`** — full-hunt create/update. `parseHuntPayload` validation: slug `^[a-z0-9][a-z0-9-]{0,63}$` (lowercased); id defaults to slug, `isSafeId`; title required ≤ 120; description ≤ 2000; difficulty coerced (`"moderate"` else `"easy"`); `durationMinutes` rounded and clamped 5..600 (default 45); 1..40 stops; per stop: safe unique id, title required, lat ∈ [−90,90], lng ∈ [−180,180], `radiusMeters` clamped 20..1000 (default 100), text fields length-capped, `referencePhoto` ≤ 400 chars (re-validated in `saveHunt`). Errors → 400 `{error}`; slug-collision errors from `saveHunt` also 400.
- **`GET /api/hunts/photo?p=<relPath>`** — streams via `readPhoto`; 400 without `p`, 404 when sanitization or read fails; headers `Content-Type` (by extension), `Content-Length`, and **`Cache-Control: private, no-store`** — *"reference photos can be replaced under the same name — don't cache."*
- **`POST /api/hunts/reference`** — multipart `photo` (File) + `huntId` + `stopId`; 400 non-multipart/missing/empty, **413** > 8 MB, **415** non-jpeg/png/webp/heic (`imageExtension` checks MIME first, then filename extension); "not found" errors map to 404, the rest 400. Returns `{ok, referencePhoto, referencePhotoUrl}`.
- **`POST /api/hunts/submit`** — the player check-off endpoint; same multipart validation; optional `lat`/`lng` parsed by `parseCoord` (finite, |lat| ≤ 90, |lng| ≤ 180 — else treated as absent). Responds `{ok, verified, distanceMeters | null}`. Decision logic in §8. This endpoint is public *by design* (players are anonymous); the player-facing copy discloses that photos+coords go to organizers.

### 6.6 Survey, track, ferry

- **`POST /api/survey`** — validates `distanceBand` against the 5-value list (400 otherwise); everything else optional and clamped (`homeZip` ≤ 5 chars, `homeState` ≤ 20, `lodgingNights` 0..60, `lodgingType` ≤ 40, `partySize` 1..50, `primaryReason` ≤ 60); `submittedAt` set server-side. **A store failure is swallowed** with `console.warn` — *"don't fail the visitor's request over telemetry"* — and still returns `{ok:true}`. **`GET /api/survey`** — unauthenticated aggregate `SurveySummary` (total, byDistance, overnightCount, totalLodgingNights); aggregates only, never raw rows.
- **`POST /api/track`** — reads **raw text** and parses JSON itself because `navigator.sendBeacon` posts with a `text/plain` content type (comment at top; fetch-fallback JSON also works). Validation → silent drop (always HTTP 200 `{ok:true}`, even on total garbage — *"telemetry must never break or slow down a visitor's session"*): type ∈ {pageview, outbound, geo-ping}; `path` ≤ 200, must start `/`, **`/admin` paths dropped** (defense in depth — the client tracker already skips them); `sessionId` ≤ 64, stripped to `[A-Za-z0-9_-]`; geo-pings default `path` to `/`. **Geo-ping privacy invariants enforced server-side regardless of client behavior:** coordinates must be finite and inside the Kitsap-ish box (lat 47.5..48.1, lng −123.0..−122.2) else dropped; then rounded to 3 decimals (~100 m) and classified into a named area — *"nothing finer ever reaches the store."* Geography: prefers Vercel's `x-vercel-ip-country/-region/-city` headers (city is URL-decoded), else peeks at `x-forwarded-for`/`x-real-ip` **only** to label loopback/RFC-1918/link-local traffic as `dev-local` — *"the IP is never stored or logged"*; otherwise `unknown`. Outbound events keep `href` ≤ 500 and `label` ≤ 120.
- **`GET /api/ferry/status`** — aggregates `getTodaysSailings` + both `getTerminalStatus` + `getRouteAlerts` (parallel) + synchronous `getFastFerrySailings` into `{carFerry, fastFerry, terminals:{kingston, edmonds}, alerts}` — exactly the `FerryStatusPayload` shape `ferry-board.tsx` declares. No explicit cache headers; freshness is governed by the adapters' fetch revalidation.

---

## 7. Page & component design

### 7.1 The 24 pages

Rendering modes are explicit in each file (`export const revalidate = 60` → ISR-60; `export const dynamic = "force-dynamic"` → per-request; neither + static data → build-time static).

| Route | Mode | Data dependencies | Notes |
|---|---|---|---|
| `/` | ISR-60 | wsf, weather(2), tides, event-store, kitsap | Hero + live strip (next boats, weather), next-3 events, feature grid, photo strip, tides card, `<VisitorSurvey/>` |
| `/ferry` | ISR-60 | wsf ×3, kitsap | Comment: revalidate so today's sailings never go stale *"even when the WSDOT key is missing and no fetches mark the page dynamic"*; alerts banner; hands `initial` + `serverNow` to `<FerryBoard/>`; verified fare prose |
| `/eat` | ISR-60 | business-store | Curated groups by id (anything unlisted falls into "More around town"); per-card `<LocalBusinessJsonLd/>`, `<OpenBadge/>`, `<OrderTimingNote/>`; `<NearMe/>` gets a serialized subset |
| `/events` | ISR-60 | event-store | "This weekend" = next 4 Pacific dates; month grouping; midnight-start = "All day" convention |
| `/give` | ISR-60 | charity-store, event-store | Upcoming shifts (mailto/website/county-portal signup fallback chain) + the date-grouped deconfliction calendar (§8) |
| `/about` | static | — | LTAC/JLARC explainer, tracking honesty table, second `<VisitorSurvey/>` |
| `/itineraries` | static | `data/itineraries` | 4 cards |
| `/itineraries/[slug]` | static + `generateStaticParams` | `data/itineraries` | Timeline; 404 via `notFound()` |
| `/parking` | static | `data/parking`, `data/atms` | `<TownMap zones atms/>` + `<MapLegend/>`; rule-grouped `ZoneCard`s with confidence badges; overnight-honesty section; ATM cards with `atmMeta`. Will read via parking-store **(landing in map v2)** |
| `/stay` | static | `data/lodging` | Compliance note: Airbnb/VRBO search deep-links only |
| `/webcams` | static | `data/webcams` | Static shell; all liveness in `<WebcamGrid/>` |
| `/hunt` | **force-dynamic** | hunt-store | *"Admin-created hunts must appear immediately"* — every request reads the merged store |
| `/hunt/[slug]` | force-dynamic | hunt-store | Maps `StoredHunt` → `PlayerHunt` (paths become `/api/hunts/photo` URLs; *"the on-disk path stays server-side"*); `generateMetadata` from the hunt |
| `/portal` | force-dynamic | auth | Redirects to `/portal/setup` when no users; login form when signed out; role-dependent dashboard cards |
| `/portal/setup` | force-dynamic | auth | Redirects to `/portal` once users exist |
| `/portal/join` | static | — | Invite-redemption form (all logic client + API side) |
| `/portal/business` | force-dynamic | auth, business-store | Session + role gate; admins see all listings, businesses their `linkedIds` |
| `/portal/business/[id]` | force-dynamic | auth, business-store, event-store | Server-side `canEdit` redirect; hands listing + owned events to `<BusinessEditor/>` |
| `/portal/nonprofit` | force-dynamic | auth, charity-store | Mirror of business list |
| `/portal/nonprofit/[id]` | force-dynamic | auth, charity/event stores, time | Hands org, needs, events, `today` (Pacific) to `<NonprofitEditor/>` |
| `/portal/syndicate` | force-dynamic | auth, all three stores, `headers()` | Server component; builds absolute URLs from `x-forwarded-host`/`host` + proto; feeds, platform checklist (*"Honest status: no auto-sync yet"*), prewritten social posts; interactivity is one inline delegated-click copy script — no client component |
| `/admin` | force-dynamic | analytics-store, survey-store | Visitor Insights: stat cards, geo/survey tables, top pages, outbound links, geo-ping area bars; *"numbers must be fresh on every load"* |
| `/admin/accounts` | force-dynamic | auth, business/charity stores | Re-checks role; strips hashes; renders `<AccountsManager/>` |
| `/admin/hunts` | force-dynamic | hunt-store | Hunt cards (source/ref-photo/submission badges), recent submissions grid, `<HuntEditor/>` (selected via `?hunt=` searchParam) |
| `/admin/map` **(landing in map v2)** | force-dynamic | parking-store | Leaflet + `@geoman-io/leaflet-geoman-free` polygon editor: admins draw/edit zone polygons and edit zone metadata; writes overlay records through parking-store |

Layout (`src/app/layout.tsx`): fonts (§9) + `<Tracker/>` + `<SiteNav/>` + `<main>` + `<SiteFooter/>`; metadata title template `%s · Explore Kingston`.

### 7.2 Client-component islands — why each is client, props contract, state machine

- **`tracker.tsx`** — needs `usePathname`, `sessionStorage`, `navigator.sendBeacon`. Exports: `Tracker` (renders null; one `pageview` per pathname change, skipping `/admin`), `trackOutbound(href, label)`, and `OutboundLink` — the client anchor behind `ui.tsx`'s `ExternalLink` (it lives here *"because ui.tsx must stay a shared server-safe module"*; no `preventDefault` — *"sendBeacon survives the navigation"*). Session id: `vk-sid` UUID in sessionStorage with an in-memory fallback for privacy modes where sessionStorage throws.
- **`open-badge.tsx`** — needs the browser clock (*"computed in the visitor's browser so static pages never show stale state"*). `OpenBadge{weeklyHours?}` and `OrderTimingNote{weeklyHours?}` (renders a closed-kitchen warning only when closed). Both render **nothing until mounted** (hydration-mismatch avoidance) then re-run `getOpenStatus` every 60 s.
- **`near-me.tsx`** — geolocation. Props: `places: NearMePlace[]` (a serializable Restaurant subset: id, name, lat, lng, weeklyHours?, walkMinutesFromFerry). State machine `Status: idle → locating → ready | denied | error`. One `getCurrentPosition` per tap (never `watchPosition`); sorts by client-side haversine, shows top 6 with ~80 m/min walk times and live open labels; **sends at most one geo-ping per page visit** (a `useRef` latch), coordinates rounded to 3 decimals *before leaving the device* (the server re-rounds regardless). Denied/error states degrade to friendly copy.
- **`town-map.tsx`** — Leaflet touches `window` at module scope, so it is **dynamically imported inside `useEffect`**; the component renders an empty shell on the server. Props: `{ zones?: MapZone[], atms?: Atm[], showStreets = true, height = "460px", center = [47.7985,-122.4975], zoom = 15 }`. Design (map v2 restyle, landed): street overlay fetched at runtime from `/geo/street-parking.json` (*"so the JS bundle stays lean"*; fetch failure = base map still works); segments drawn quiet-first (`default` → `ferry-holding` → rule-bearing) so colored streets sit on top; the **`ferry-holding` street class** renders as a muted dashed slate line (*"it's the boat line, not a parking hazard to shout about"*); zones with `polygon` render **as filled polygons only ("no marker bubbles — owner feedback")** with permanent name tooltips on `port-*` zones gated to zoom ≥ 17 via a container-class toggle on `zoomend`; zones without polygons get compact white `divIcon` label chips (code extracted from `(POKPARK)`-style names). **Quick-view buttons** above the map: Downtown (15), Port parking (18), Whole area (fitBounds of the UGA boundary). Every popup gets a keyless Google Street View deep link; with `NEXT_PUBLIC_GMAPS_EMBED_KEY` set, clicking a feature also opens an embedded Street View iframe panel below the map (`selected` state). Colors are intentionally raw hex (*"they live on the map canvas, not in the page's token system"*); rule→color maps are string-keyed so new rules from the data layer render sensibly. Default Leaflet marker icons deliberately unused (bundler asset-path breakage). The effect runs once (`[]` with an eslint disable — *"re-running the effect would tear the map down mid-interaction"*) and guards against StrictMode double-mount. `MapLegend` is a server-safe sibling.
- **`hunt-player.tsx`** — geolocation, camera capture, localStorage. Props: `PlayerHunt` (stops carry `referencePhotoUrl?`). Three state machines, exactly as typed: per-stop **`CheckState: idle | locating | too-far | confirmed | gps-unavailable`** (the GPS check-in — *"an assist, not a gate"*); per-stop **`UploadState: idle | uploading | failed`**; and the persisted per-stop **`StopStatus: verified | unverified | offline | honor`** with badge copy per status (`STATUS_BADGE`). Flow: stops unlock sequentially (`activeIndex` = first uncompleted); photo submit reuses the check-in fix or grabs one fresh (8 s timeout), POSTs multipart to `/api/hunts/submit`; server verdict → `verified`/`unverified`; upload failure → retry, or **"Mark complete anyway" → `offline`** (nobody gets stranded on the beach); a no-photo escape hatch → `honor`. Progress persists in localStorage keys `vk-hunt-<id>` (completed ids) and `vk-hunt-<id>-status` (status map; legacy entries default to `honor`); renders nothing until localStorage is loaded; completion screen at 100%.
- **`visitor-survey.tsx`** — localStorage + form state. Step machine `distance → overnight → details → done`; "local" answers short-circuit straight to submit (`overnight: false`); dismiss and submit both set `vk-survey-done` so the visitor is never re-asked; POST failure silently ignored.
- **`webcam-grid.tsx`** — timers + `<img>` error handling. Per-card state: `stamp` (epoch cache-buster, **null until mount** so SSR and first client render match), `now` (1 s tick for "Refreshed Xs ago"), `offline`. Refreshes on each cam's own `refreshSeconds` cadence by swapping `?t=<stamp>` — required because images.wsdot.wa.gov sends no Cache-Control; plain `<img>` hotlinks because the host sends no CORS headers (fetch/canvas would fail) and remote domains aren't configured for next/image. `onError` → offline placeholder; the next cycle resets `offline` and retries automatically.
- **`ferry-board.tsx`** — polling + countdowns. Props: `{ initial: FerryStatusPayload, serverNow: string }` (server ISO timestamp *"so SSR and hydration agree"*). Polls `/api/ferry/status` every 60 s, **paused while `document.hidden`** (visibilitychange stops/starts the interval and refreshes on return); countdown labels re-render on a 20 s tick; `upcoming()` applies a 90 s grace for a boat leaving right now; alerts that appear *after* load render as a "New WSF alert" banner (diffed against `initial.alerts` — the page already showed the initial ones). Poll failures keep the last good data. Live vs "Schedule only" badges keyed off `live`.
- **`site-nav.tsx`** — `usePathname` active states + two pieces of open/close state: desktop "More ▾" dropdown (closes on blur with a 150 ms grace) and the mobile bottom-sheet. Fixed 5-slot mobile bottom bar (Home/Ferry/Eat/Events/More); `globals.css` reserves `padding-bottom: 4.5rem` under 768 px for it.
- **Portal editors:**
  - `portal/forms.tsx` — Login/Setup/Join forms + LogoutButton; *"deliberately plain: fetch + reload on success"* (`window.location.href` redirect); shared `useSubmit` hook (busy/error state).
  - `portal/business/[id]/editor.tsx` (`BusinessEditor{initial, initialEvents}`) — three independent sections each with its own `useSave` (busy/message): (a) **details** form posting the whitelisted fields; (b) **hours**: `HoursEditor` + live preview (a `nowMs` state, null until after mount, minute interval → `getOpenStatus`), `formatWeeklyHours` regenerating the human string by grouping consecutive identical days ("Mon–Thu 11 am–9:30 pm, … Sun closed", with noon/midnight words), an optional note suffix recovered on load by `initialNote` (prefix-matching the stored string), save blocked while `weeklyHoursIssues` is non-empty, and **saving stamps `hoursVerified` = today (Pacific, en-CA)**; (c) **events**: draft-based CRUD with the deconfliction effect — when the draft's date (first 10 chars of the datetime-local) changes, fetch `/api/portal/events?onDate=…&exclude=<id>`; results are remembered *with the date they answer for* so a date change instantly clears stale hits; conflicts render informationally (*"still fine, just know"*). `fmtEventDate` deliberately parses the ISO string textually ("no timezone math") so stored Pacific wall times display as entered.
  - `portal/nonprofit/[id]/editor.tsx` (`NonprofitEditor{org, initialNeeds, initialEvents, today}`) — org-profile form (PUT `/api/portal/org`); volunteer shifts with the **±1 stepper** (POST `{action:"slots"}`), upcoming/past split on the server-provided `today`, full CRUD; events CRUD through `/api/portal/org` `action:saveEvent/deleteEvent`, with the same on-date deconfliction via `/api/portal/needs?onDate=`.
  - `admin/accounts/manager.tsx` (`AccountsManager{users, invites, restaurants, charities}`) — accounts table, pending/used invite lists, create-invite form (role picker resets selections; client requires ≥ 1 linked id for non-admin; server re-validates). Fills `window.location.origin` after mount for join-URL copy; clipboard failures tolerated (*"plain-http LAN"*). All authorization server-side — *"this UI just talks to /api/portal/invites."*
  - `admin/hunts/editor.tsx` (`HuntEditor{initialHunts, initialSelectedId}`) — the builder. Draft types hold **numeric fields as strings** (*"so typing '47.' or '-' never fights the input"*) and validate on save via `buildPayload`, a *"client-side mirror of the server's validation — friendlier errors, same rules"*; save POSTs the full hunt to `/api/hunts`; reference-photo upload POSTs to `/api/hunts/reference` **after auto-saving the draft** (so the server knows the stop); per-stop submissions load from `/api/hunts?submissions=` and render beside the reference photo; photo URLs carry a `&v=` version to bust the no-store-but-memory-cached image.
  - `components/portal/hours-editor.tsx` (`HoursEditor{value, onChange}` + `emptyWeeklyHours` + `weeklyHoursIssues`) — fully controlled; **editing rules:** ≤ 2 spans/day; toggling a closed day open *borrows the nearest earlier open day's spans* (else defaults `11:00–20:00`; second span defaults `17:00–21:00`); "Copy Monday to all weekdays" one-click; inline flags — "set both times", "open and close can't match" (both blocking via `weeklyHoursIssues`), and a **non-blocking** "past midnight — closes the next morning" badge when `close < open` (the convention, not an error).
  - Admin map editor **(landing in map v2)** — client for the same reason as town-map (Leaflet); geoman drawing tools produce polygon vertex arrays saved as `MapZone.polygon` overlay records via parking-store.
- **`components/ui.tsx` is intentionally server-safe** (§9) — its only client dependency is delegated to `OutboundLink`.
- **`components/json-ld.tsx`** — server component emitting one `<script type="application/ld+json">` per restaurant card: schema.org `Restaurant` with `OpeningHoursSpecification` per span (past-midnight spans emit raw closes — schema.org documents `opens > closes` as spanning midnight), a heuristic `PostalAddress` splitter (end-anchored state/zip regex so a 5-digit street number is never mistaken for the zip), and `<` escaped to `<` so listing text can never close the script tag.

---

## 8. Algorithms

### 8.1 Hours engine — `src/lib/hours.ts`

Pure functions (*"so they run identically on server and client"*). `getOpenStatus(weekly, now = new Date()) → { open, label }`:

1. **Pacific wall clock via Intl** (`nowInPacific`): `formatToParts` with `timeZone: "America/Los_Angeles"`, `hourCycle: "h23"` → weekday index (0=Sun) + minutes-since-midnight. No Date arithmetic in local server time, ever.
2. **Today's spans:** for each span, if it `crossesMidnight` (`toMinutes(close) <= toMinutes(open)`) it matches when `minutes >= open` (open side only — the tail belongs to tomorrow's check); otherwise the half-open interval `open <= minutes < close`. Match → `"Open · closes 8 pm"` (via `fmt`, 12-hour, minutes only when non-zero).
3. **Yesterday's past-midnight tail:** `spansForDay(weekly, dayIndex - 1)` (the `(dayIndex + 7) % 7` wrap handles −1); a crossing span matches when `minutes < close`. This is what keeps a bar showing "Open · closes 1 am" at 12:30 am.
4. **Next-open scan:** ahead 0..6 days; each day's spans sorted by open time; on day 0 skip opens already past (`open <= minutes`). Label grammar: today → `"Closed · opens 5 pm"`, +1 → `"opens tomorrow …"`, else `"opens Fri …"`. A completely empty week → `"Closed"`.

Consumers: `OpenBadge`/`OrderTimingNote` (browser, minute timer), the business feed (`openNow` server-side at response time), NearMe result rows, and the portal live preview.

### 8.2 Haversine + GPS verification — `src/lib/hunt-store.ts`

Standard haversine on a 6 371 000 m sphere (`haversineMeters`; duplicated deliberately in the client files `hunt-player.tsx` and `near-me.tsx`, which cannot import the fs-touching server module). Verification decision in `saveSubmission`:

```
hasCoords = lat & lng are finite numbers
distance  = hasCoords ? haversine(player, stop) : undefined
verified  = distance !== undefined && distance <= stop.radiusMeters
```

Thresholds: `radiusMeters` is clamped **20..1000 m (default 100)** at the API layer; seed stops use 80–150 m — deliberately generous, since *"GPS is an assist, not a gate."* Missing/denied GPS still saves the photo with `verified: false` (honor system); `distanceMeters` is stored rounded. The player's separate check-in button uses the same math client-side purely as feedback (`too-far` shows the distance and the required radius).

### 8.3 Deconfliction — Pacific date-key grouping

Two implementations of "what else happens that day":

- **Store query** (`eventsSharingDate` in event-store, used by both portals' on-date lookups): compares `e.start.slice(0, 10) === dateIso.slice(0, 10)`. This is a *string* date key — correct because every write path stores Pacific-offset ISO strings (portal events store datetime-local text or `pacificWallTimeToISO` output), but it would misbucket a UTC-`Z` timestamp (see inconsistencies, end of doc).
- **Give-back page** (`src/app/give/page.tsx`): the robust variant — `Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" })` over the parsed date (`pacificDateKey`), used to group every upcoming event into a `Map<dateKey, EventItem[]>` and count "busy days" (≥ 2 events). The same Intl-based day key is used in analytics (`pacificDay` in analytics-store) for the by-day table.

The portal editors surface deconfliction *before commit*: picking a date immediately fetches other events that day and renders them as an informational callout, never a block.

### 8.4 Area classification — `src/lib/analytics-store.ts`

`classifyArea(lat, lng)`: linear scan over `AREAS`, six axis-aligned bounding boxes around downtown Kingston (ferry-terminal, marina-waterfront, village-green, downtown-104-strip, north-neighborhoods, west-kingston), **first match wins** — so the list is ordered *"specific waterfront spots before the broader neighborhoods that surround them"* (the boxes overlap). Miss → `"outside-uga"`. Inputs are already `roundCoord`ed (3 decimals ≈ 100 m); the comment is explicit that block-perfect edges would be *false precision*. `areaLabel` maps ids to display labels for the dashboard.

### 8.5 Street-parking overlay generator — `scripts/gen-street-parking.py`

Offline pipeline producing `public/geo/street-parking.json` (currently 208 segments / ~68 KB minified: 118 default, 41 prohibited, 33 ferry-holding, 12 free-2hr, 4 free-unrestricted, plus a 160-point boundary):

1. **Inputs** (curl commands in the docstring): an Overpass export of highways in the Kingston UGA bbox `(47.770, -122.530, 47.812, -122.483)` matching `highway ~ ^(primary|secondary|tertiary|residential|unclassified)$` with `out geom`; and the Census TIGERweb GeoJSON for Kingston CDP **GEOID 5335870** (the UGA boundary).
2. **CDP point-in-ring filter:** for each way, probe its first/middle/last points with a ray-casting `point_in_ring`; keep the way if *any* probe is inside — ways that merely touch the UGA stay.
3. **Classification** (`classify`): exact name matches first (`NAME_RULES` — e.g. Central Ave & Washington Blvd `prohibited`, both SR 104 name variants `ferry-holding`, Georgia & Pennsylvania `free-unrestricted`); then **the midpoint rule** for streets whose rule changes block-by-block — the way's *midpoint* is compared against hand-picked thresholds ≈ block boundaries: NE 1st St `free-2hr` iff `lng > -122.4992`; Ohio Ave iff `47.7978 ≤ lat ≤ 47.8004` (NE 1st–NE 2nd); Iowa Ave iff `lat ≤ 47.8010`; Illinois Ave `lat ≤ 47.8003 → free-2hr` else `free-unrestricted`. Everything else → `default` (no known restriction; note cites RCW 46.55.085's 24-hour rule). Rules trace to the 2015/2016 county Complete Streets study; the shared note warns it hasn't been re-surveyed.
4. **Output:** coordinates rounded to 5 dp, `{generated, boundary, segments:[{name, rule, coords, note?}]}`, minified. `town-map.tsx` consumes it verbatim (`StreetData`), normalizing unknown rules to `default`.

Regeneration is manual (fetch fresh inputs, run from repo root); the JSON is committed.

---

## 9. Frontend design system

### 9.1 Token remapping — `src/app/globals.css`

Tailwind 4, config-less: `@import "tailwindcss"` + an `@theme inline` block defines the design tokens as CSS variables, which Tailwind 4 exposes as utilities (`bg-tide`, `text-ink-soft`, `border-sand`, `font-display`…). The header comments document the remapping approach: the token *names* are stable seaside metaphors; the *values* were re-pointed at the Explore Kingston Chamber brand (primary cyan `#1E96C0` from the logo sailboat, deep navy `#324A6D`, warm peach accent family, near-white page with `#E4E4E0` warm-gray fills) — so a rebrand is a values-only edit.

**The twelve color tokens and their Explore Kingston values:**

| Token | Value | Role (from the file's comments) |
|---|---|---|
| `--color-shell` | `#fbfcfd` | page background — near-white, sits under the topo texture |
| `--color-sand` | `#e4e4e0` | warm light gray — borders, subtle section fills |
| `--color-seaglass` | `#b7e0f2` | pale brand-blue tint — light text on navy, tint fills |
| `--color-tide` | `#1e96c0` | brand primary cyan-blue (logo sailboat) |
| `--color-tide-deep` | `#16758f` | darker cyan — accessible link/text variant |
| `--color-sound` | `#324a6d` | brand deep navy — secondary |
| `--color-sound-deep` | `#22334d` | darker navy — footer, hero depths |
| `--color-coral` | `#c97940` | warm CTA — deepened from brand peach `#FFBC7D` |
| `--color-coral-deep` | `#a85c28` | hover + accessible text-on-white variant |
| `--color-ink` | `#20262e` | near-black headings/body |
| `--color-ink-soft` | `#6b7683` | muted body gray |
| `--color-fern` | `#4a7c59` | PNW evergreen — success, open-now |

**Contrast decisions:** the coral ramp is the documented one — the brand's peach `#FFBC7D` fails contrast as a button/text color, so `coral` is a deepened `#c97940` for white-text CTAs and `coral-deep` `#a85c28` is the on-white text variant (used for warnings/errors throughout); similarly `tide-deep` exists as the accessible link color where `tide` on white would be weak. The home hero layers a `sound-deep/95 → tide-deep/75` gradient over the photo, per its comment, to keep white text *"AAA-readable over the bright sky."*

### 9.2 Fonts (next/font in `src/app/layout.tsx` → variables in `@theme`)

| CSS token | Font (weights) | Use |
|---|---|---|
| `--font-sans` | Roboto (400/500/700/900) | body text (set on `body`) |
| `--font-display` | Roboto Slab (400/600/700) | `h1–h3` and `.font-display` |
| `--font-nav` | Poppins (500/600/700) | nav / uppercase UI labels |
| `--font-script` | Satisfy (400) | big script accents ("Explore Kingston" style) — *"use sparingly"*; used for the word "Kingston" in the hero |

Each is a `next/font/google` instance exposing a `--font-*` variable on `<html>`; `@theme` maps them with system fallback stacks.

Other global CSS: Leaflet's stylesheet imported globally (the map component needs it and can't scope it); the body carries the brand's **topographic contour texture** (`/brand/bg-topographical-texture.jpg`, 1100 px repeat) over `shell`; `.bg-topo` re-uses it on white for standout sections; `padding-bottom: 4.5rem` under 768 px reserves room for the fixed mobile bottom nav.

### 9.3 `ui.tsx` primitives (server-safe by design)

`PageHeader{eyebrow?, title, intro?}` · `Section{title?, subtitle?, id?}` (max-w-5xl column) · `Card` (rounded-2xl, sand border, white, soft navy shadow) · `Badge{tone: navy|teal|coral|green|sand}` · `Callout{title, tone: teal|coral}` (left-border alert) · `ExternalLink` (tracked via `OutboundLink`, teal underline style) · helpers `mapSearchUrl(query)` / `mapDirectionsUrl(dest, walking|driving)` — keyless Google Maps deep links. Every page composes these; there is no other component library.

### 9.4 Brand assets — `public/brand/`

`logo-explore-kingston-primary.png` (horizontal; nav) and `-alt.png` (stacked; footer, on a white chip because it's black-on-transparent), favicons at 150/192, `bg-topographical-texture.jpg`, `bg-kingston-currents-blog.webp`, and the photo library (`photo-kingston-37.jpg` hero — fast ferry at the dock with Rainier behind, `photo-hansville-hero.jpg`, `photo-kingston-59.jpg`, `photo-kingston-harbor-35.jpg`, `photo-heritage-park.webp`, `photo-suquamish-17.jpg`), all served via `next/image`.

---

## 10. Error handling & degradation catalogue

The system-wide rule: visitor-facing surfaces never hard-fail on a dependency. The complete inventory:

| Failure | Behavior | Where |
|---|---|---|
| WSDOT API unreachable / no key | Bundled seasonal schedule, `live: false`; UI shows "Schedule only" badges + confirm-at-WSDOT links; terminal cards simply omit live numbers | `wsf.ts`, `ferry-fallback.ts`, `ferry-board.tsx`, home live-strip footnote |
| WSDOT wait-notes fetch fails (space ok) | Status stays `live: true` without the note | `wsf.ts getTerminalStatus` |
| NWS forecast fails | `[]` → home card renders "See forecast at weather.gov" | `weather.ts`, `page.tsx` |
| NOAA tides fail | `[]` → "Tide data unavailable right now — NOAA station 9445639 has the official predictions" | `tides.ts`, `page.tsx` |
| Webcam image error | Per-card offline placeholder ("WSDOT feeds hiccup sometimes"); auto-retry on the next refresh cycle | `webcam-grid.tsx` |
| Ferry-board poll fails | Keep showing last good data; footer timestamps only successful updates | `ferry-board.tsx` |
| Tracking beacon/store failure | `send()` swallows; `/api/track` catches everything and returns `{ok:true}` regardless (bad JSON, read-only fs) | `tracker.tsx`, `track/route.ts` |
| Survey store unavailable | POST logs `console.warn`, still `{ok:true}`; client fetch failure also swallowed | `survey/route.ts`, `visitor-survey.tsx` |
| Hunt photo upload fails (offline/no signal) | `UploadState: failed` → retry button + "Mark complete anyway" → status `offline`; hunt continues; separate honor-system path when no photo is possible | `hunt-player.tsx` |
| GPS denied/unavailable | Check-in: `gps-unavailable` message; submission still accepted `verified:false`; NearMe: `denied`/`error` copy pointing to walk-times | `hunt-player.tsx`, `hunt-store.ts`, `near-me.tsx` |
| Map street-overlay fetch fails | Caught; base tiles + zones still render (*"progressive enhancement"*) | `town-map.tsx` |
| Embed feed/network/old browser failure | The widget **removes its own mount node** and leaves the host page untouched | `public/embed/kingston-events.js` |
| Overlay/JSONL file missing or corrupt | `readOverlay`/`readJson` → fallback value; JSONL readers skip corrupt lines individually | `json-store.ts`, `auth.ts`, `analytics-store.ts`, `hunt-store.ts` |
| localStorage/sessionStorage throws (private mode) | Hunt progress starts fresh; session id falls back to in-memory | `hunt-player.tsx`, `tracker.tsx`, `near-me.tsx` |
| Clipboard API unavailable | Accounts manager: silent (text is selectable); syndicate page: hidden-textarea `execCommand` fallback | `manager.tsx`, `syndicate/page.tsx` |
| Deconfliction lookup fails | `.catch` — *"best-effort — never block the form on it"* | `business editor`, `nonprofit editor` |
| Portal save fails | Inline error message, form state preserved | `useSave`/`useSubmit` hooks |

---

## 11. Security considerations

**Path sanitization (`hunt-store.ts`)** — the one place query strings reach the filesystem. `getPhotoAbsolutePath` rejects, in order: non-string / empty / > 400 chars; null bytes and backslashes; absolute (`/`) and home (`~`) prefixes; any path segment that is empty, `.`, or `..`; extensions outside the image whitelist; and finally re-verifies the `path.resolve`d result is strictly inside `.data/hunts` (prefix check with separator). `isSafeId` (`^[a-z0-9][a-z0-9_-]{0,63}$/i`) gates every id that becomes a path segment, at both the API and store layers.

**Upload constraints** — 8 MiB cap (413), MIME/extension whitelist jpeg/png/webp/heic (415), empty-file rejection; stored filenames are server-generated (`refs/<huntId>-<stopId>.<ext>`; `photos/.../<epochMs>-<rand>.<ext>`) — client filenames are only ever consulted for an extension hint. Note: there is **no total-disk quota** on submissions.

**Secret handling** — `AUTH_SECRET` and `WSDOT_API_KEY` live in `.env.local` (gitignored); the WSDOT key rides in server-side URL query strings only (never shipped to the client); `AUTH_SECRET` absence throws rather than degrading. `NEXT_PUBLIC_GMAPS_EMBED_KEY` is intentionally public (Maps Embed API key, free tier, referrer-restrictable).

**Injection surfaces** — Leaflet popup HTML is built from data through `esc()` (town-map); the embed widget writes only `textContent`; JSON-LD escapes `<`; ICS output escapes per RFC 5545. React handles the rest.

**Intentionally unauthenticated** (documented in code, by design):
- The public feeds (`/api/feeds/*`) with `Access-Control-Allow-Origin: *` — *"public directory data"*; business sites fetch them cross-origin.
- Deconfliction date lookups (`?onDate=` on the events and needs routes) — same data as the public events page.
- `/api/track` POST and `/api/survey` POST (anonymous telemetry), `/api/survey` GET (aggregate-only), `/api/ferry/status`, `/api/hunts/submit` (anonymous players).
- The **entire hunt admin API** (`/api/hunts` POST, `?submissions=`, `/api/hunts/reference`, `/api/hunts/photo`) — the local-only posture; the code carries its own warning to gate these before public deployment. Note the `/admin` *pages* are now gated by the layout, but these API routes are not.

**Pre-deploy hardening list** (aggregating every in-code warning + limitations from §4):
1. Gate `/api/hunts` POST, `?submissions=`, `/api/hunts/reference` (and consider `/api/hunts/photo` for submission paths) behind admin auth.
2. Rate-limit `/api/auth/login` (and `/api/track`, `/api/hunts/submit` against abuse); add a password-reset story.
3. Set `secure: true` on the session cookie; serve over HTTPS.
4. Add CSRF tokens for the portal mutations (current mitigation: `sameSite=lax` + JSON bodies).
5. Decide whether `GET /api/survey` and the admin dashboard aggregates should require admin (the dashboard page is gated; the raw aggregate endpoint is not).
6. Move `.data/` stores to a database before any multi-instance/serverless deployment (write races; read-only fs).
7. Add a submissions disk quota / retention policy; document the photo-privacy retention promise.
8. Consider invite expiry and admin-visible session revocation.

**Privacy posture** (a feature, restated): no cookies for visitors, no IPs stored, geo-pings opt-in + bounded + rounded + area-bucketed server-side, survey PII-free, `/admin` traffic never tracked (client skip + server drop).

---

## 12. Testing status

**Honest statement: there is no automated test suite.** Zero `*.test.*`/`*.spec.*` files, no test runner in `package.json` (scripts are `dev/build/start/lint` only), no CI config in the repo.

**How the system has actually been verified** (manual/e2e, as practiced during development):
- **curl smoke flows** against a running dev server: the auth lifecycle (setup → login → invite → redeem → 403s), portal writes (listing PUT field policy, event create/update/delete with ownership checks), the feeds (JSON shape, ICS validity, CORS headers), hunt submission with/without coords, and `/api/track` validation edges.
- **Preview/browser checks** of the client islands: ferry board polling and tab-visibility pause, webcam refresh/offline behavior, hunt player state machine on a phone (GPS grant/deny, airplane-mode upload failure), hours editor ↔ live badge agreement, the map overlay and Street View panel.
- **`tsx` one-off scripts** for the pure engines — feeding synthetic `Date`s through `getOpenStatus` (weekday boundaries, split shifts, past-midnight spans, the yesterday-tail case, DST edges) and checking `pacificWallTimeToISO` offsets — plus `next build` + `eslint` as the standing static gate.
- The data files carry their own verification discipline in comments (sources + dates checked, e.g. hours *"verified 2026-07-02 against two live sources per business"*).

**What a proper suite should cover first** (highest value ÷ risk, all pure or near-pure):
1. **Hours engine** (`hours.ts`): open/closed across every span shape — normal, split shift, past-midnight open side, *yesterday's tail*, next-open scan labels (today/tomorrow/weekday), empty week, DST transition days, and a fixed `now` in both PST and PDT.
2. **Auth token** (`auth.ts`): sign/parse round-trip, expiry rejection, signature tamper (payload swap, sig truncation, wrong secret), length-mismatch safety, password hash/verify including malformed stored strings.
3. **Store merge** (`json-store.ts`): overlay-wins-by-id, tombstone hides seed and overlay records, `_deleted` stripped from results, corrupt-file → seed-only, write replace-vs-append.
4. **ICS output** (`feeds/events`): TEXT escaping (§3.3.11 characters, newlines), UTC stamp format, and the 75-octet folding property with multi-byte input (no split code points; continuation-space accounting).
5. **`canEdit` matrix** across the routes: role × ownership for events (ownerId), needs (charityId), listings, org events (`ownerId ?? charityId`), plus the invite `linkedIds` validation and the admin-only listing fields.
6. Next tier: `getPhotoAbsolutePath` adversarial paths, `/api/track` validation table (bounds box, rounding, `/admin` drop, sessionId stripping), `classifyArea` first-match ordering, `parseWeeklyHours` strictness, `parseWsdotDate`, and `formatWeeklyHours` grouping.

---

## Appendix: file map (orientation)

```
src/lib/types.ts                domain model (§2)
src/lib/time.ts                 Pacific-time helpers (§5.5)
src/lib/hours.ts                open/closed engine (§8.1)
src/lib/wsf.ts | kitsap.ts | weather.ts | tides.ts    external adapters (§5)
src/lib/auth.ts                 auth (§4)
src/lib/stores/json-store.ts    seed+overlay core (§3.1)
src/lib/stores/{business,event,charity}-store.ts      stores (§3.2)
src/lib/stores/parking-store.ts (landing in map v2)
src/lib/hunt-store.ts           hunt files + verification (§3.3, §8.2)
src/lib/analytics-store.ts      JSONL analytics + areas (§3.4, §8.4)
src/lib/survey-store.ts         pluggable survey store (§3.4)
src/lib/data/*                  seed data (verified, dated comments)
src/app/**                      24 pages + 19 API routes (§6, §7)
src/components/**               client islands + ui primitives (§7, §9)
scripts/gen-street-parking.py   street overlay generator (§8.5)
public/geo/street-parking.json  generated overlay (208 segments)
public/embed/kingston-events.js self-removing events widget (§6.4)
public/brand/*                  logos, texture, photo library (§9.4)
docs/                           ARCHITECTURE, DATA_SOURCES, REQUIREMENTS, SYNDICATION, GIT_SETUP, this SDD
.data/                          all mutable state (§3.6, gitignored)
```
