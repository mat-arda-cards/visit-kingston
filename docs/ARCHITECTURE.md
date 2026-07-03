# Architecture

Next.js 16 (App Router) + TypeScript + Tailwind 4, deployed on Vercel Hobby.
No database in v1; content lives in typed seed files, live data comes from
free public APIs through adapters.

```
src/
  app/                      # routes (one folder per feature)
    api/
      ferry/status/         # live status JSON (client polls this)
      survey/               # LTAC survey intake + aggregate summary
    ferry/ eat/ events/ itineraries/ stay/
    parking/ webcams/ give/ hunt/ about/
  components/
    site-nav.tsx            # header + mobile bottom bar
    site-footer.tsx
    ui.tsx                  # Card, Badge, Section, PageHeader, map deep links
    visitor-survey.tsx      # anonymous LTAC survey widget
  lib/
    types.ts                # the entire domain model — start here
    wsf.ts                  # WSDOT Ferries API adapter (live when key set)
    kitsap.ts               # Kitsap fast ferry (seed schedule, GTFS later)
    weather.ts              # NWS forecast, keyless (gridpoint SEW/121,78)
    tides.ts                # NOAA tide predictions (station 9445639)
    time.ts                 # Pacific-time helpers (server TZ-safe)
    survey-store.ts         # pluggable survey storage (file now, DB later)
    data/                   # seed content the Chamber edits
      ferry-fallback.ts     # approximate schedule when no API key
      restaurants.ts  events.ts  parking.ts  atms.ts
      lodging.ts  itineraries.ts  charities.ts  hunts.ts  webcams.ts
```

## Rules

1. **UI never fetches external services directly.** Pages call `src/lib`
   adapters that return `src/lib/types.ts` shapes. Swapping a seed file for
   a live feed touches one adapter.
2. **Everything degrades.** Adapters return `{ live: boolean }` alongside
   data; UI labels non-live data and links to the authoritative source.
3. **Caching:** classic fetch caching (`next: { revalidate: N }`) — Cache
   Components is intentionally not enabled. Schedules revalidate at 15 min,
   terminal space at 60 s, alerts at 5 min.
4. **Dynamic route params are Promises** in Next 16 (`await params`).
5. **Maps are deep links** (`mapSearchUrl`/`mapDirectionsUrl` in
   `components/ui.tsx`) — free at any scale. If we later embed maps, prefer
   MapLibre + OSM before paid Google SKUs.
6. **No PII, ever**, in the survey path. Aggregate summaries only.

## Environment variables

| Var | Required | Purpose |
|-----|----------|---------|
| `WSDOT_API_KEY` | no (fallback schedule without it) | Free access code from https://wsdot.wa.gov/traffic/api/ — unlocks live sailings, drive-up space, alerts |

## Deploy

Vercel Hobby: `vercel` from repo root, set `WSDOT_API_KEY` in project env.
The file-based survey store does not persist on serverless — wire
`survey-store.ts` to Vercel Postgres/Supabase before relying on survey data
in production (interface is already in place).
