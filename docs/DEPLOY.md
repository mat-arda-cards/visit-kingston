# Deployment guide

The authoritative deploy guide for Explore Kingston. Written 2026-07-02.

Companion docs: [OPERATIONS.md](OPERATIONS.md) (runbook, backups, env vars,
troubleshooting — §3 points here for step-by-step), [ARCHITECTURE.md](ARCHITECTURE.md)
(§8 deployment topology), [SYNDICATION.md](SYNDICATION.md) (Resend email + the
outbound-platform APIs), [DATA_SOURCES.md](DATA_SOURCES.md) (WSDOT key, DNS facts).

This app writes all of its mutable state to a directory on disk (accounts,
portal edits, hunts + photos, analytics, survey). That single fact drives the
whole plan below: **first host it where a real disk persists; move to a
serverless host only after that state moves to a database + object storage.**

---

## a. Two-phase plan

### Phase 1 — persistent-disk host, now

Ship exactly the code that exists today onto a host with a **persistent
volume**: Render, Fly.io, Railway, or a plain VPS. Nothing in the store layer
changes. The two pieces that make this work already exist in the repo:

- **`src/lib/data-dir.ts`** — `dataDir()` / `dataPath(...)` resolve every
  read/write through `process.env.DATA_DIR` (an absolute path), falling back
  to `<repo>/.data` locally. On the host you mount a volume and set
  `DATA_DIR` to its mount point. Every store module already routes through
  this, so runtime state lands on the volume and survives redeploys and
  container restarts.
- **`src/app/api/health/route.ts`** — a `GET /api/health` probe that returns
  `200 {ok:true,...}` only when `DATA_DIR` is writable, `503` otherwise. This
  is the exact failure (an unmounted or read-only volume) the app most needs
  to catch before real users hit it. Wire it as the host's health check.

Phase 1 is genuinely production-capable for the Chamber's scale once the
[pre-launch checklist](#f-pre-launch-checklist) is green. It is not "demo
grade" — the file store is single-writer and fine for a one-admin Chamber
(see ARCHITECTURE.md §9).

### Phase 2 — Vercel (current)

Vercel (and any serverless platform) has **no persistent filesystem**: writes
land on an ephemeral instance and vanish on the next invocation. So every store
behind `data-dir.ts` runs against a database + object storage instead. This is
built: `data-dir.ts` is the migration seam, and each store now branches on
`hasDb()` / `hasBlob()` — with the cloud env vars set it uses the SQL/Blob path,
without them it uses the original `.data/` filesystem path (so `npm run dev`
still works on disk). Nothing above the stores (routes, components, domain
types) changed. **The concrete deploy steps are in [§g](#g-phase-2-deploy-to-vercel).**

**Which store maps to which service (the built layout):**

| Store / data | Backend | Where |
|---|---|---|
| auth (users, invites), portal overlays, custom hunts, hunt submissions, map views/features | **overlay table** | Neon Postgres |
| analytics events, LTAC survey responses | **append tables** (`analytics_event`, `survey_response`) | Neon Postgres |
| hunt reference + player photos, map-feature images | **object storage** | Vercel Blob |
| auth login / invite-redeem rate limiting | **shared counter** | Upstash Redis |

The per-module swap points (what each file's seam targets) — unchanged since the
plan was written:

| Module | Today (file) | Phase-2 target | Notes |
|---|---|---|---|
| `src/lib/auth.ts` | `.data/auth/users.json`, `invites.json` | **`users` + `invites` tables** | scrypt hashes and invite codes become rows. Sessions are already stateless HMAC cookies (no server store) — only the user/invite lookups (`listUsers`, `findUserByEmail`, `createUser`, `listInvites`, `createInvite`, `redeemInvite`) touch disk. `AUTH_SECRET` still signs cookies; unchanged. |
| `src/lib/stores/json-store.ts` | `.data/stores/<name>.json` overlays | **a table per overlay, or a KV** | The seed+overlay merge (`readMerged`, `writeOverlayRecord`, `_deleted` tombstones) becomes rows keyed by `(store, id)` with a `deleted` flag. This one module backs restaurants, events, charities, volunteer-needs, and the map overlays below — reimplement it once and all of them move. |
| `src/lib/hunt-store.ts` | `.data/hunts/custom-hunts.json`, `refs/`, `photos/`, `submissions.jsonl` | **hunts table + object storage for photos** | Custom hunts → a row/JSONB per hunt. Submissions (append-only JSONL) → an append table. **Reference photos and player photos → object storage** (Vercel Blob / Supabase Storage / S3), not a DB column; `readPhoto` / `saveReferencePhoto` / `saveSubmission` and the `/api/hunts/photo` streaming route move to signed object URLs. |
| `src/lib/analytics-store.ts` | `.data/analytics/events.jsonl` (append-only) | **an append table** | `saveEvent` → `INSERT`; `summarize()` currently reads the whole file — in Phase 2 push the aggregation into SQL (`GROUP BY`) rather than scanning rows in Node. Same public exports. |
| `src/lib/survey-store.ts` | `.data/ltac-responses.jsonl` (append-only) | **an append table** | Already the cleanest seam: `SurveyStore` is an interface with a single `FileSurveyStore` implementation, swapped at the bottom of the file. Write a `DbSurveyStore implements SurveyStore` and change the one `export const surveyStore = …` line. |
| `src/lib/stores/map-store.ts` | overlays via `json-store` + `.data/map/images` | **table (via json-store swap) + object storage for images** | The view/feature overlays move for free when `json-store` moves. The uploaded **feature images** (`saveFeatureImage` / `readFeatureImage`, served by `/api/map/image`) need object storage, same as hunt photos. |

**Also required in Phase 2 — shared rate limiting.** `src/lib/rate-limit.ts`
throttles auth login and invite redemption in **process memory**. That is
correct for a single Phase-1 instance but breaks the moment there is more than
one serverless instance (each keeps its own counter, so the effective limit
multiplies by the instance count). Move it to a shared store — Upstash Redis
or Vercel KV — as part of the same migration. Its interface is the seam, same
as the data stores.

Full backlog framing for the DB migration and auth hardening is in
[ROADMAP-V2.md](ROADMAP-V2.md).

---

## b. Phase 1: deploy to Render

Render is the recommended Phase-1 host: a Docker web service plus an attached
**Disk** gives a persistent filesystem with no code changes. A `render.yaml`
blueprint (Docker service + a 1 GB Disk mounted at `/data` +
`healthCheckPath: /api/health`) lives at the repo root — use it so the service,
disk, and health check are declared in one reviewable file.

The app already ships the pieces the blueprint expects: `next.config.ts` sets
`output: "standalone"` (a self-contained server bundle) and there is a
`Dockerfile` at the repo root.

### Steps

1. **Create the service from the repo.** In the Render dashboard →
   **New → Blueprint**, point it at the Git repo. Render reads `render.yaml`
   and provisions the Docker web service and its Disk. (Or **New → Web
   Service → Docker** and add a Disk manually: size **1 GB**, mount path
   **`/data`**.)
2. **Set environment variables** on the service (Render dashboard →
   Environment). The blueprint marks the secrets `sync: false` so Render
   prompts for them on first deploy — never commit them:
   - `AUTH_SECRET` — **generate a fresh production value**, e.g.
     `openssl rand -hex 32`. **Never reuse the dev secret.** (Changing it
     later logs everyone out — see OPERATIONS.md troubleshooting.)
   - `WSDOT_API_KEY` — the WSDOT Ferries access code (see OPERATIONS.md §1 /
     DATA_SOURCES.md §1). Without it the ferry board shows the bundled
     schedule labeled not-live.
   - `NEXT_PUBLIC_GMAPS_EMBED_KEY` — optional; the map falls back to free
     Street View deep links without it. If set, restrict the key by HTTP
     referrer and hard-cap quotas.
   - `DATA_DIR=/data` — **required.** Must equal the Disk's mount path. This
     is what puts all mutable state on the persistent volume.
3. **First deploy.** Trigger the deploy (automatic on blueprint create).
   Render builds the Docker image and boots the standalone server.
4. **Confirm the volume is live.** Hit `https://<service>.onrender.com/api/health`.
   You want `200 {"ok":true,"dataWritable":true,"dataDir":"/data",...}`. A
   `503` means the Disk isn't mounted or `DATA_DIR` is wrong — fix before
   going further; nothing that writes state will survive otherwise.
5. Then bootstrap the admin and mint invites — see
   [First run in production](#e-first-run-in-production).

### Alternative hosts

Any host that gives you a persistent disk works; only the volume-mounting and
secret-setting mechanics differ. Set `DATA_DIR` to the mount path in every
case, and point the platform's health check at `/api/health`.

- **Fly.io.** Add a `fly.toml`, then:
  ```bash
  fly volumes create data --size 1        # a 1 GB volume named "data"
  fly secrets set AUTH_SECRET=$(openssl rand -hex 32) WSDOT_API_KEY=...
  ```
  In `fly.toml` mount that volume (e.g. at `/data`) and set `DATA_DIR=/data`
  in the `[env]` block; set `[[http_service.checks]]` / `[checks]` to
  `GET /api/health`. `fly deploy` builds from the same Dockerfile.
- **Plain VPS (no Docker).** Node 22 (Next 16 needs ≥ 20.9), a reverse proxy
  (Caddy/nginx) terminating TLS in front of the app:
  ```bash
  npm ci && npm run build
  node .next/standalone/server.js        # the standalone output
  ```
  Because `output: "standalone"` only bundles server code, copy the static
  assets next to the server once per build so they're served:
  `cp -r .next/static .next/standalone/.next/static && cp -r public .next/standalone/public`
  (or serve `public/` and `.next/static/` from the reverse proxy). Run it
  under **PM2 or a systemd unit** so it restarts on crash/reboot, with
  `PORT` and the same env vars (`AUTH_SECRET`, `WSDOT_API_KEY`, `DATA_DIR`).
  **Put `DATA_DIR` OUTSIDE the repo** — e.g. `DATA_DIR=/srv/vk-data` — so a
  `git pull` / redeploy never touches live state.

---

## c. Domain & DNS

**Verified 2026-07-02.** Add **one** record and nothing else.

In the **NameHero cPanel → Zone Editor**, add a **CNAME**:

```
app.explorekingstonwa.com   CNAME   <the host's target>
```

- **Render** gives you an `onrender.com` hostname (and, for a custom domain,
  the exact CNAME target to use) — point the CNAME at that.
- **Fly.io** gives you an app hostname (`<app>.fly.dev`) or a dedicated IP;
  use a CNAME to the hostname, or an `A`/`AAAA` to the IP as Fly instructs.

**Do NOT move nameservers.** The NameHero VPS (`165.140.69.20`) serves three
things off that one box: the **WordPress site**, the **domain's DNS**, and
**Chamber email** (MX + SPF point at the same host). A single CNAME added to
the existing zone leaves all three untouched — WordPress, the apex, and mail
keep working. Moving nameservers to the app host would break DNS and email.

Swap the **apex** (`explorekingstonwa.com` → an `A` record at the app host)
**only at a full cutover later**, when the app actually replaces the WordPress
site — not before.

---

## d. Backups

**`DATA_DIR` is the entire backup surface.** Everything the app writes at
runtime lives under it; everything else (code, seed content, brand assets, the
generated parking overlay) is reproducible from git + `npm install`. See
OPERATIONS.md §2 for the file-by-file inventory.

**Git does NOT cover it.** `.data/` is gitignored on purpose — it holds
password hashes and player photos. Do not "fix" that by committing it. On the
host, `DATA_DIR` points at the mounted volume, which git never sees at all.

**Back up on a schedule.** Use `scripts/backup-data.sh` from cron. It tars up
`DATA_DIR` to a timestamped archive and prunes old ones. Example (daily
03:15, keep 14 days):

```cron
15 3 * * * /srv/visit-kingston/scripts/backup-data.sh
```

On Render/Fly, run the same script as a scheduled job (Render Cron Job / Fly
scheduled machine) writing the archive to off-box storage (S3/B2), because a
backup that lives only on the same volume it is backing up is not a backup.

**Restore.** Stop the app (so nothing writes mid-restore), extract the archive
into `DATA_DIR`, start the app:

```bash
# stop the service, then:
tar xzf vk-data-YYYY-MM-DD.tar.gz -C "$DATA_DIR" --strip-components=1
# start the service; hit /api/health to confirm the volume is writable
```

(`--strip-components` depends on how the archive was rooted — inspect it with
`tar tzf` first.) There is nothing else to restore.

---

## e. First run in production

Same bootstrap as local (OPERATIONS.md §1), now against the live volume:

1. **Create the admin once.** Visit `/portal/setup`. It works **only while
   `DATA_DIR/auth/users.json` has zero users** — it creates the first admin
   account, then disables itself. Do this immediately after the first green
   `/api/health`, before anyone else can reach the box.
2. **Mint invites.** As admin, go to `/admin/accounts`. Each invite code is
   tied to a role (`business` / `nonprofit` / `admin`) and the listing/org ids
   that account may edit (`linkedIds`).
3. **Hand codes to businesses.** They redeem at `/portal/join` to create their
   account, then edit hours/listings/events/volunteer needs, which appear on
   public pages within ~60 s (ISR).

Until Resend email is wired (checklist below), invite codes are delivered by
hand — that's fine for the first cohort.

---

## f. Pre-launch checklist

Everything here must be true before real business/nonprofit accounts go on the
public deployment:

- [ ] **Persistent volume mounted and `/api/health` green.** `GET /api/health`
      returns `200 {ok:true, dataWritable:true}` with `dataDir` equal to the
      mount path. This is the whole reason for Phase 1 — verify it, don't
      assume it.
- [ ] **Fresh `AUTH_SECRET` set in production.** A new value, never the dev
      secret, kept stable thereafter (rotating it logs everyone out).
- [ ] **Rate limiting deployed.** `src/lib/rate-limit.ts` throttles
      `/api/auth` login and invite redemption. On a single Phase-1 instance
      its in-memory limiter is sufficient; confirm it is active before the
      portal is on the public internet. (In Phase 2 it must move to a shared
      store — see §a.)
- [ ] **Automated backup scheduled.** `scripts/backup-data.sh` on cron,
      writing off-box, with a restore actually test-run once.
- [ ] **Resend email wired — only when businesses self-serve.** Needed for
      invite email / any transactional mail: SPF + DKIM records for
      `mail.explorekingstonwa.com` in the same NameHero Zone Editor session as
      the app CNAME. Resend free tier: 3,000/month, 100/day, transactional
      only. See [SYNDICATION.md](SYNDICATION.md) "Email". Until then, hand
      invite codes over directly.

When all of the above hold, Phase 1 is a real production deployment for the
Chamber. The remaining work — the DB/blob migration and shared rate limiting —
is Phase 2, gated on the move to Vercel, not on launch.

---

## g. Phase 2: deploy to Vercel

The store layer is now cloud-aware (see [§a Phase 2](#phase-2--vercel-current)):
Neon Postgres for structured state, Vercel Blob for uploaded images, Upstash
Redis for the shared rate limiter. Each store auto-detects its backend from the
presence of an env var, so the whole switch is "provision the three stores, set
their env vars, deploy." OPERATIONS.md is the day-2 runbook; this is the
one-time stand-up.

### Steps

1. **Push to GitHub** — done. Vercel deploys from the repo.
2. **Import the repo.** Go to **[vercel.com/new](https://vercel.com/new)**,
   pick the repo. Vercel auto-detects Next.js; keep the defaults (build
   `next build`, no root-directory change). Don't deploy yet — add the stores
   and env first, or the first build ships with the filesystem fallback and no
   persistence.
3. **Provision the three stores** from the Vercel project's **Storage** tab
   (a.k.a. Marketplace). Installing each integration **injects its env vars
   into the project automatically** — you don't hand-copy secrets:
   - **Neon** → creates a Postgres database and injects **`DATABASE_URL`**
     (use the **pooled** connection string — the host contains `-pooler`; the
     `@neondatabase/serverless` HTTP driver wants it). Backs the overlay table
     + the two append tables.
   - **Upstash** (Redis) → injects **`UPSTASH_REDIS_REST_URL`** and
     **`UPSTASH_REDIS_REST_TOKEN`**. Backs the shared rate limiter.
   - **Vercel Blob** → create a Blob store (**Storage → Create → Blob**);
     injects **`BLOB_READ_WRITE_TOKEN`**. Backs hunt/reference/map images. Make
     sure it's a **public** store so image URLs serve directly from the CDN.
4. **Set the remaining env vars** (Project → Settings → Environment Variables),
   for the **Production** environment:
   - `AUTH_SECRET` — a **fresh** value, `openssl rand -hex 32`. Never reuse the
     dev secret; changing it later logs everyone out (OPERATIONS.md
     troubleshooting).
   - `WSDOT_API_KEY` — WSDOT Ferries access code (OPERATIONS.md §1 /
     DATA_SOURCES.md §1). Without it the ferry board shows the bundled
     schedule, labeled not-live.
   - `NEXT_PUBLIC_GMAPS_EMBED_KEY` — **build-time** (inlined into the client
     bundle), so it must be set **before** the build that ships it, not just at
     runtime. Restrict the key by HTTP referrer and cap its quota.
   - **Do NOT set `DATA_DIR`.** It's the Phase-1 filesystem switch; on Vercel
     there is no persistent disk, and leaving it unset is what routes the
     stores to Neon/Blob.
5. **Deploy.** Trigger the deploy (redeploy if you imported before adding the
   stores, so the build picks up the env). Vercel builds and serves the app.
6. **Create the schema, then migrate data (if any).**
   - Schema: `ensureSchema()` in `src/lib/db.ts` **creates the tables lazily on
     the first request**, so the first hit to any store self-initializes the
     database — nothing to run. To create them up front instead, run
     **`npm run db:setup`** (`psql "$DATABASE_URL" -f db/schema.sql`) against
     the Neon connection string; if `psql` isn't installed, just let
     `ensureSchema()` do it, or paste `db/schema.sql` into the Neon SQL editor.
   - Existing local data: to carry over the current `.data/` tree (accounts,
     overlays, hunts, analytics, survey, images), pull the production env and
     run the migration once:
     ```bash
     vercel env pull .env.production.local   # writes DATABASE_URL + BLOB token
     node --env-file=.env.production.local scripts/migrate-to-db.mjs
     ```
     (`npm run db:migrate` runs the same script but reads `.env.local`.) It
     upserts overlay rows, appends analytics/survey rows, and uploads images to
     Blob (rewriting each record's URL field to the blob URL). It refuses to
     run without `DATABASE_URL`; the overlay upserts are idempotent, but the
     append tables are **run-once** (it skips them if they already have rows —
     `--force` to override). A fresh Chamber deploy with no local data can skip
     this entirely.
7. **Verify `/api/health`.** Hit `https://<project>.vercel.app/api/health`;
   confirm it returns `200 {ok:true,...}`. Then smoke-test a write path: create
   the admin at `/portal/setup` (see [§e](#e-first-run-in-production)) and
   confirm it persists across a redeploy — that proves Neon, not an ephemeral
   disk, is holding state.
8. **Add the domain.** In Vercel **Project → Settings → Domains**, add
   `app.explorekingstonwa.com`. Vercel shows a CNAME target; add it in the
   **NameHero cPanel → Zone Editor** as a single **CNAME**, exactly as in
   [§c](#c-domain--dns):
   ```
   app.explorekingstonwa.com   CNAME   <vercel's target, e.g. cname.vercel-dns.com>
   ```
   **Never move nameservers** — the NameHero box also serves the WordPress
   site, the zone's DNS, and Chamber email (MX/SPF). One CNAME leaves all three
   untouched. Swap the apex only at a full cutover later.

### Cost caveat

Vercel's **Hobby** plan is **non-commercial only**. A Chamber-of-Commerce app
promoting member businesses is commercial use, so this likely needs **Vercel
Pro (~$20/mo)** to be within terms — budget for it. Neon, Upstash, and Blob all
have free tiers that comfortably cover Kingston's scale; watch their usage
dashboards as traffic grows.

Day-2 operations (backups of Neon/Blob, env-var reference, rotating secrets,
troubleshooting) live in [OPERATIONS.md](OPERATIONS.md).
