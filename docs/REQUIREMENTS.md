# Visit Kingston — Requirements

A community tourism web app for Kingston, Washington, built with the Greater
Kingston Chamber of Commerce. Two audiences:

1. **Visitors** — mostly on phones, often literally sitting in the ferry line.
   They need answers fast: when's the next boat, where do I eat, what's
   happening today, where do I park.
2. **The Chamber & local nonprofits** — need first-party content entry
   (events, volunteer needs) and visitor data that supports Lodging Tax
   (LTAC) grant applications and JLARC reporting.

## Guiding constraints

- **Personal/community project budget: ~$0/month.** Free tiers only
  (Vercel Hobby, WSDOT free API, deep links instead of paid map APIs).
- **Mobile-first.** The primary session is a phone on Highway 104.
- **Every data source is an adapter** (`src/lib/*`), so a static seed file
  today can become a live API tomorrow without UI changes.
- **Degrade gracefully.** No API key, no network, no problem — bundled
  schedules render with a clear "not live, confirm with WSDOT" label.
- **No PII.** Visitor tracking is anonymous and aggregate-only.

## Features (v1)

| # | Feature | Route | v1 scope |
|---|---------|-------|----------|
| 1 | Ferry logistics & planning | `/ferry` | Both routes (WSDOT car ferry + Kitsap fast ferry), today's sailings, next-boat countdown, live drive-up space & alerts when API key set |
| 2 | Ferry practical info | `/ferry` | Walk-on vs drive guidance, boarding logistics, fares & payment (cards accepted; where cash matters), ATM callout linking to `/parking#atms` |
| 3 | Webcams | `/webcams` | WSDOT terminal/highway cams for Kingston & Edmonds + other local cams, auto-refreshing stills with source credit |
| 4 | Parking | `/parking` | Port of Kingston lots, street parking, ferry holding-lane explainer, ATM map/list with fees |
| 5 | Restaurants | `/eat` | Chamber-curated list: cuisine, hours, walk time from ferry, menu + online-ordering deep links (Toast/Square/own site) |
| 6 | Itineraries | `/itineraries`, `/itineraries/[slug]` | Curated plans (walk-on half day, family day, rainy day, gateway-to-Olympics) with timed stops and map links |
| 7 | Events | `/events` | Chamber-entered events grouped by day, category filters, map links; architecture ready for feed ingest |
| 8 | Charity portal | `/give` | Nonprofit directory, shared event calendar for **deconfliction** (see below), volunteer needs with signup links |
| 9 | Maps integration | everywhere | Google Maps deep links (search + directions) — free, no key; optional Maps embed later |
| 10 | Lodging | `/stay` | Chamber-member lodging + compliant Airbnb/VRBO search deep links (no scraping) |
| 11 | LTAC visitor tracking | survey widget + `/api/survey` | Anonymous distance-band/overnight/nights survey; aggregate JSON summary for JLARC reporting |
| 12 | Scavenger hunts | `/hunt`, `/hunt/[slug]` | GPS check-in + photo capture hunts around downtown; progress in localStorage; honor-system verification in v1 |

### Event deconfliction (feature 8)

The problem: local nonprofits schedule fundraisers on top of each other. v1
solution: the `/give` calendar shows **all** known events (tourism + charity)
in one view with a "planning a fundraiser? check this first" framing, plus a
conflict indicator when two charity events share a date. Later: an
authenticated submission flow with automatic conflict warnings.

## Non-goals for v1

- User accounts / auth (volunteer signup links out to each org's existing
  form or email; no credential storage)
- Payment processing or in-app food ordering (deep links to the restaurant's
  own ordering platform)
- Native apps (responsive PWA-ready web instead)
- Scraping any platform whose ToS forbids it (Airbnb especially)

## v2+ backlog

- GTFS ingest for Kitsap Transit fast-ferry schedule
- Chamber admin UI (likely via a headless CMS or the Chamber's GrowthZone
  feed) for events/restaurants/volunteer needs
- Database-backed survey store (Vercel Postgres) + LTAC report export
- Vessel-position map for the car ferry (WSF vessellocations endpoint)
- Photo-verification for scavenger hunts; seasonal hunt rotations
- Push/ICS "next boat" reminders; holiday-weekend surge advisories

## Success criteria

- A first-time visitor can answer "when is the next boat home and what do I
  do until then" in under 30 seconds on a phone.
- The Chamber can update restaurants/events/volunteer data by editing one
  seed file each (until an admin UI exists).
- The site produces an aggregate visitor summary the Chamber can cite in an
  LTAC application.
- `npm run build` deploys clean to Vercel Hobby with zero paid services.
