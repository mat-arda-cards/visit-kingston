# Operations Runbook

How to run, back up, deploy, and maintain Explore Kingston. Written July 2026.
Companion docs: [ARCHITECTURE.md](ARCHITECTURE.md) (code layout),
[DATA_SOURCES.md](DATA_SOURCES.md) (every upstream source + gotchas),
[SYNDICATION.md](SYNDICATION.md) (outbound-channel plan).

---

## 1. Local development

**Prereqs:** Node 23+ (developed on 23.11; Next 16 requires ≥ 20.9) and npm.
No database, no Docker, no paid services.

```bash
npm install
npm run dev        # http://localhost:3000
```

### .env.local

Never commit this file (`.env*` is gitignored). The values already exist in
the working copy's `.env.local` — reference that, don't reprint secrets.

| Key | Required | Where the value comes from |
|-----|----------|----------------------------|
| `WSDOT_API_KEY` | No (app falls back to the bundled schedule, labeled not-live) | Free access code from <https://wsdot.wa.gov/traffic/api/> — enter an email, code issued instantly. Current code registered under matt.hager12@gmail.com; already in `.env.local`. Rotating = registering again. |
| `AUTH_SECRET` | Yes for the portals (`src/lib/auth.ts` throws without it) | Any long random string, e.g. `openssl rand -hex 32`. Already in `.env.local`. **Changing it invalidates every portal session** (see Troubleshooting). |
| `NEXT_PUBLIC_GMAPS_EMBED_KEY` | No (map falls back to free Street View deep links) | Google Maps **Embed API** key (that API is free/unlimited, but any Google key needs a billing account with a card — hard-cap quotas and restrict the key by HTTP referrer). Not currently set. Used only by `src/components/town-map.tsx`. |

### First run

1. `npm run dev`, open <http://localhost:3000>.
2. **Bootstrap the admin:** visit `/portal/setup`. It only works while
   `.data/auth/users.json` has zero users — it creates the first admin
   account, then disables itself.
3. **Mint invites:** as admin, go to `/admin/accounts`. Each invite code is
   tied to a role (`business` / `nonprofit` / `admin`) and the listing/org
   ids that account may edit (`linkedIds`). Hand the code to the business;
   they redeem it at `/portal/join`.
4. Portal edits (hours, listings, events, volunteer needs) land in
   `.data/stores/*.json` and appear on public pages within ~60 s (ISR).

---

## 2. The `.data/` directory — all mutable state, and the backup story

Everything the app ever writes at runtime lives under `.data/`. Everything
else (code, seed content, brand assets, the parking overlay) is reproducible
from git + `npm install`.

```
.data/
  auth/users.json            portal accounts (scrypt hashes, roles, linkedIds)
  auth/invites.json          invite codes (created lazily on first mint)
  stores/restaurants.json    portal edit overlays — custom record wins by id,
  stores/events.json           { "_deleted": true } tombstones hide seed rows
  stores/charities.json        (see src/lib/stores/json-store.ts)
  stores/volunteer-needs.json
  hunts/custom-hunts.json    admin-built/edited hunts (override seed by id)
  hunts/refs/                per-stop reference photos (<huntId>-<stopId>.<ext>)
  hunts/photos/<huntId>/<stopId>/   player photo submissions
  hunts/submissions.jsonl    one JSON line per hunt submission (GPS verdicts)
  analytics/events.jsonl     pageviews / outbound clicks / opt-in geo-pings
  ltac-responses.jsonl       anonymous LTAC visitor-survey responses
```

Files and subdirectories appear lazily — a missing file just means that
subsystem hasn't been used yet.

### The backup story

- **`.data/` is the ONLY mutable state.** A copy of `.data/` is a complete
  backup of the deployment: accounts, portal edits, hunts, photos,
  analytics, survey rows.
- **Git does NOT cover it** — `.data/` is in `.gitignore` (correctly: it
  holds password hashes and player photos). Do not "fix" that by committing it.
- Backup = `cp -R .data /some/backup/location` (or `tar czf`), via cron or
  by hand. Restore = put the directory back and restart the server. There is
  nothing else to back up.

Example cron (daily, keep 14 days):

```cron
15 3 * * * cd "/Users/matatarda/chamber app/visit-kingston" && tar czf "$HOME/backups/vk-data-$(date +\%F).tar.gz" .data && find "$HOME/backups" -name 'vk-data-*.tar.gz' -mtime +14 -delete
```

### Reset procedures (per subsystem)

Deleting a file resets exactly that subsystem to its git-tracked seed state.
Stop the dev server first to avoid a write racing the delete.

| To reset… | Delete… | Effect |
|---|---|---|
| All portal accounts + invites | `.data/auth/users.json` and `.data/auth/invites.json` | `/portal/setup` bootstrap becomes available again |
| One content domain's portal edits | `.data/stores/<name>.json` (`restaurants`, `events`, `charities`, `volunteer-needs`) | That domain reverts to its seed file in `src/lib/data/` |
| Admin-built hunts | `.data/hunts/custom-hunts.json` (and `.data/hunts/refs/` — reference photos are only pointed at from that file) | Hunts revert to `src/lib/data/hunts.ts` seeds |
| Hunt player submissions | `.data/hunts/submissions.jsonl` and `.data/hunts/photos/` | Empty submission review queue |
| Analytics | `.data/analytics/events.jsonl` | Admin dashboard counts return to zero |
| LTAC survey responses | `.data/ltac-responses.jsonl` | Survey summary returns to zero — **export first if a JLARC reporting period is open** |

---

## 3. Deployment to production

Target: Vercel (Hobby tier fits) at **app.explorekingstonwa.com**.

### Steps

1. `npx vercel` from the repo root (link/create the project on first run),
   then `npx vercel --prod`.
2. In Vercel project settings → Environment Variables, set:
   `WSDOT_API_KEY`, `AUTH_SECRET` (generate a fresh production value — do
   not reuse the dev secret), and optionally `NEXT_PUBLIC_GMAPS_EMBED_KEY`.
3. Add the domain `app.explorekingstonwa.com` to the Vercel project.
4. **DNS (verified 2026-07-02):** in the NameHero cPanel **Zone Editor**, add
   `CNAME  app.explorekingstonwa.com  →  cname.vercel-dns.com`.
   **Do NOT move nameservers.** The NameHero VPS (165.140.69.20) serves the
   WordPress site, the domain's DNS, **and email** (MX + SPF point at the
   same box) — changing nameservers breaks Chamber mail. A single CNAME in
   the existing zone has zero impact on WordPress, the apex, or email. If
   the app ever replaces the WP site entirely, swap the apex A record to
   Vercel (76.76.21.21) at cutover time — not before.

### Hard blockers before real users

Local-first works because `.data/` sits on a real disk. Vercel serverless
has no persistent filesystem — writes land on an ephemeral instance and
vanish. Do not invite real businesses onto a serverless deployment until:

1. **Migrate every `.data/` file store to Postgres/Supabase.** This is not
   just the survey store — it's auth (`src/lib/auth.ts`), the portal
   overlays (`src/lib/stores/json-store.ts`), hunts + photos
   (`src/lib/hunt-store.ts`), analytics (`src/lib/analytics-store.ts`), and
   the survey (`src/lib/survey-store.ts`). The store interfaces are the
   seam: each module already isolates reads/writes behind exported
   functions (e.g. `SurveyStore`, `readMerged`/`writeOverlayRecord`), so the
   swap is per-module internals, not a UI change. Photos need object
   storage (Supabase Storage / Vercel Blob), not a table.
2. **Rate-limit auth.** `/api/auth` login and invite redemption currently
   allow unlimited attempts against scrypt hashes. Add per-IP + per-email
   throttling before the portal is on the public internet.
3. **Resend DNS records** so invite email works: SPF + DKIM for
   `mail.explorekingstonwa.com` at NameHero (same Zone Editor session as
   the CNAME). Resend free tier: 3,000/month, 100/day, transactional only.

Until all three land, production is demo-grade: fine for showing the
Chamber, not for accounts that matter.

---

## 4. Seasonal & recurring maintenance calendar

Dated, concrete, and grounded in the seed files — put these on a real calendar.

### Fixed dates

| When | What | Where |
|---|---|---|
| **2026-09-12** | Kitsap Transit GTFS feed S1000066 **expires**. The bundled fast-ferry schedule is hardcoded from it — refresh the times when the fall schedule drops (download `https://pride.kitsaptransit.com/gtfs/google_transit.zip`) or the app shows a stale summer schedule. Also re-check the Saturday seasonal window (currently months 5–9). | `src/lib/kitsap.ts` |
| **~2026-09-14** | Friends and Neighbors Brewing resumes Monday 4–8 pm hours (closed Mondays until MNF returns). Update the hours string. | `src/lib/data/restaurants.ts` (or the portal, once they have an account) |
| **October 2026** | WSF typically changes fares each October. The ferry page hardcodes **summer 2026** fares ($11.35 walk-on, $27.00 car + driver) — grep those numbers and update, or wire the Fares API (see DATA_SOURCES §1). Kitsap Transit fares also historically take effect Oct 1. | `src/app/ferry/page.tsx` |
| **Oct 1–30, 2026** (annually; watch kitsap.gov/das each summer — the window has moved before) | Kitsap County LTAC grant RFP for 2027 funds. Bid conference Oct 21; interviews Nov 5–6. One-month window, late = rejected. Export survey/analytics summaries for the application. | DATA_SOURCES §12 |

### Quarterly

- **Ordering deep links — verify in a real browser.** Toast and DoorDash
  return 403 to server-side fetches, so no automated checker can validate
  them; click every ordering link by hand. Toast slugs rot (Sourdough
  Willy's slug still references their old address).
- **Restaurant hours reconciliation vs the Chamber.** Small-town churn is
  the real data problem; trust no aggregator. Ask "anything change?" per
  venue via the Chamber.
- **Port parking rates re-scrape.** The Port revises its rate schedule and
  Diamond reprices monthly permits — re-verify against
  portofkingston.org/port-of-kingston-parking/ and the PermitPoint page,
  update `src/lib/data/parking.ts` `lastVerified` dates.
- **Airbnb/Vrbo lodging deep links — check in a real browser.** Listing
  URLs die when owners delist; datacenter IPs may be blocked, so browser
  verification is authoritative.

---

## 5. Pending human action items

Consolidated from DATA_SOURCES.md, SYNDICATION.md, and seed-file comments.
These need a person (mostly the Chamber), not code.

| # | Item | Contact / detail |
|---|---|---|
| 1 | **Windshield survey of posted street-parking hours.** The downtown 2-hour zones' posted enforcement hours aren't documented online; the overlay leans on the 2015 county study. After the survey, update `NAME_RULES` in `scripts/gen-street-parking.py` and regenerate the overlay (§6). | Chamber volunteer with a clipboard |
| 2 | **Call the Port office about overnight parking in numbered spaces.** Overnight is probable but never explicitly authorized; the app publishes "call first". Get a definitive answer. | Port of Kingston, 360-297-3545 |
| 3 | **Submit the GBP "Application for Basic API Access" form.** Needs the Chamber's own verified Google Business Profile (60+ days old), filed from an owner/manager email. Days-to-weeks turnaround; the GBP adapter is blocked on it. | SYNDICATION §1 |
| 4 | **Submit the Apple Business application** (third-party listing manager). Timeline unknown — submit early. | SYNDICATION §3 |
| 5 | **Send the Kitsap Transit permission email** — written OK to use GTFS/GTFS-RT in a Chamber-affiliated app (their terms prohibit commercial use without it), and ask them to resolve the PugetPass contradiction while you're at it. | lindsayc@kitsaptransit.com |
| 6 | **Verify the GrowthZone calendar-wide iCal feed exists** on the Chamber's plan (backoffice: Events & Learning → Events → Settings → Calendars). The whole events-ingest architecture hangs on this 10-minute check. | Chamber GrowthZone admin |
| 7 | **Confirm info@kingstonchamber.com is monitored.** The Stay and About pages use it as the public mailto for lodging listings and corrections. | Chamber office, 360-860-2239 |
| 8 | **Recruit hunt reward businesses** — local partners offering a completion perk (discount, sticker, free coffee) so finished scavenger hunts pay off; also needed before printing QR signage on their property. | Chamber member outreach |
| 9 | **Confirm The Kingston Coffee Company details.** Newly opened; hours are reported but unverified ("Daily 9:30 am–4:30 pm (new spot — confirm)"). | Chamber / phone |

---

## 6. Troubleshooting

### Ferry board says schedule is "not live" / fallback

`src/lib/wsf.ts` returns the bundled fallback (`live: false`) whenever
`WSDOT_API_KEY` is unset **or any fetch fails/non-200s** — failures are
silent by design. Check, in order: the key exists in the environment the
server actually runs with (`.env.local` locally; Vercel project env in
prod — and redeploy after setting it); the WSDOT endpoints are up. Note:
as of 2026-07-02 WSDOT wasn't enforcing the access code, so a *wrong* key
may still work — don't use "it works" as proof the key is valid.

### Open-now badges all show "Closed" (or all open)

The hours engine (`src/lib/hours.ts`) computes everything in
**America/Los_Angeles** regardless of server or browser TZ — so first check
your expectations are Kingston wall-clock, not local time. If badges are
genuinely wrong: spans are `["HH:mm","HH:mm"]` 24-hour strings; a span whose
close ≤ open is treated as crossing midnight (17:00–01:00 shows open after
midnight via *yesterday's* tail). Bad data in a portal-edited overlay
(`.data/stores/restaurants.json`) overrides the seed — inspect it before
blaming the seed file.

### Parking map street overlay missing / outdated

The overlay is a generated artifact at `public/geo/street-parking.json`
(fetched client-side by `src/components/town-map.tsx`). Regenerate from the
repo root:

```bash
# 1. OSM street geometry for the Kingston UGA bbox (Overpass):
curl -s -X POST https://overpass-api.de/api/interpreter --data-urlencode \
  'data=[out:json][timeout:90];(way["highway"~"^(primary|secondary|tertiary|residential|unclassified)$"](47.770,-122.530,47.812,-122.483););out geom;' \
  -o streets-raw.json

# 2. Census TIGERweb boundary for Kingston CDP (GEOID 5335870):
curl -s "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Places_CouSub_ConCity_SubMCD/MapServer/5/query?where=GEOID%3D%275335870%27&outFields=NAME,GEOID&returnGeometry=true&geometryPrecision=5&f=geojson" \
  -o kingston-cdp.json

# 3. Generate:
python3 scripts/gen-street-parking.py streets-raw.json kingston-cdp.json
```

Street rules live in `NAME_RULES` inside the script — edit there (e.g.
after the windshield survey), rerun, commit the regenerated JSON.

### Portal login loops / everyone logged out

Sessions are stateless HMAC cookies (`vk-session`) signed with
`AUTH_SECRET`. If that secret changes (rotated, differs between local and
prod, missing), every existing session fails signature verification and
users bounce back to sign-in. Fix: keep `AUTH_SECRET` stable; users clear
the cookie and sign in again. This is also the intentional global
"log everyone out" lever — there is no per-session revocation yet.

### Edits not showing up on public pages (stale ISR)

Content pages export `revalidate = 60` (home, eat, events, give, ferry), so
a portal edit can take up to a minute to appear — that's normal. Feed
endpoints add CDN caching (`s-maxage=60` business feeds, `s-maxage=300`
events). Upstream adapters cache separately: WSF schedule 15 min, terminal
space 60 s, alerts 5 min, weather 30 min, tides 6 h. If a page seems stuck
beyond that locally, restart `npm run dev`; in prod, redeploy or wait out
the window before digging deeper.
