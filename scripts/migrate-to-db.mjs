#!/usr/bin/env node
// One-time data migration: local .data/ tree -> configured cloud stores.
//
// Reads the on-disk .data/ files this app writes in Phase 1 and loads them into
// the Phase-2 backends the app reads in production:
//   - Neon Postgres `overlay` table   (portal overlays, auth, custom hunts,
//     hunt submissions, map views/features)
//   - Neon Postgres `analytics_event` / `survey_response` append tables
//   - Vercel Blob                       (hunt reference/player photos, map images)
//
// It writes exactly the row shapes the running app expects (see
// src/lib/stores/json-store.ts, src/lib/auth.ts, src/lib/analytics-store.ts,
// src/lib/survey-store.ts): the overlay `doc` is the record WITHOUT its
// `_deleted` flag, the tombstone lifted into the `deleted` column; image URL
// fields are rewritten to the Blob https URL so the record points at cloud
// storage after migration.
//
// Run it once, against the production database, after the schema exists:
//   node --env-file=.env.local scripts/migrate-to-db.mjs
// or, with Vercel-pulled env:
//   vercel env pull .env.production.local
//   node --env-file=.env.production.local scripts/migrate-to-db.mjs
//
// IDEMPOTENCY: overlay upserts use ON CONFLICT DO UPDATE, so re-running is safe
// for auth / overlays / custom hunts / submissions / map data — a second run
// overwrites with the same values. The append tables (analytics_event,
// survey_response) have no natural key and are INSERT-only: re-running would
// DOUBLE those rows. The script guards against that by skipping each append
// table if it ALREADY has rows (see --force to override). Treat the append
// portion as run-once.
//
// Requires DATABASE_URL. Blob uploads require BLOB_READ_WRITE_TOKEN; without it
// image files are left as-is (their relative paths stay in the records) and a
// warning is printed — run again with the token to move the images.

import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { neon } from "@neondatabase/serverless";
import { put } from "@vercel/blob";

// --- config / guards -------------------------------------------------------

const FORCE = process.argv.includes("--force");

if (!process.env.DATABASE_URL) {
  console.error(
    "Refusing to run: DATABASE_URL is not set.\n" +
      "This script writes to the production Neon database. Provide it, e.g.\n" +
      "  node --env-file=.env.local scripts/migrate-to-db.mjs\n" +
      "or `vercel env pull` first, then point --env-file at the pulled file.",
  );
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const HAS_BLOB = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

// Resolve .data relative to the repo root (this file lives in scripts/).
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(REPO_ROOT, ".data");

const HUNTS_DIR = path.join(DATA_DIR, "hunts");
const MAP_IMAGES_DIR = path.join(DATA_DIR, "map", "images");

// Content types for the image extensions the app produces.
const CONTENT_TYPES = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heic",
};

const counts = {
  overlay: {}, // store -> rows upserted
  analytics_event: 0,
  survey_response: 0,
  images: 0,
};
const warnings = [];

// --- small fs helpers (all tolerate a missing file) ------------------------

async function exists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function readJson(p) {
  try {
    return JSON.parse(await readFile(p, "utf8"));
  } catch (err) {
    if (err.code === "ENOENT") return null;
    throw err;
  }
}

async function readJsonl(p) {
  let text;
  try {
    text = await readFile(p, "utf8");
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
  const out = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      out.push(JSON.parse(trimmed));
    } catch {
      warnings.push(`Skipped a corrupt JSON line in ${path.relative(DATA_DIR, p)}`);
    }
  }
  return out;
}

// --- overlay upsert (mirrors writeOverlayRecord in json-store.ts) ----------

// The overlay `doc` is the record WITHOUT `_deleted`; the tombstone becomes the
// `deleted` column. readOverlay() re-attaches _deleted on read, so this exactly
// reproduces what the app would have written.
async function upsertOverlay(store, id, record) {
  const { _deleted, ...doc } = record;
  await sql`
    INSERT INTO overlay (store, id, doc, deleted)
    VALUES (${store}, ${String(id)}, ${JSON.stringify(doc)}::jsonb, ${Boolean(_deleted)})
    ON CONFLICT (store, id)
    DO UPDATE SET doc = EXCLUDED.doc, deleted = EXCLUDED.deleted
  `;
  counts.overlay[store] = (counts.overlay[store] ?? 0) + 1;
}

// --- image upload ----------------------------------------------------------

const uploadedByKey = new Map(); // dedupe: same source path -> same blob URL

// Upload one image file to Blob; returns the public https URL, or null if the
// file is missing / blob is not configured. `key` is a stable pathname.
async function uploadImage(absPath, key) {
  if (!HAS_BLOB) return null;
  if (uploadedByKey.has(key)) return uploadedByKey.get(key);
  let bytes;
  try {
    bytes = await readFile(absPath);
  } catch (err) {
    if (err.code === "ENOENT") {
      warnings.push(`Image referenced but missing on disk: ${key}`);
      return null;
    }
    throw err;
  }
  const ext = (key.split(".").pop() || "").toLowerCase();
  const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream";
  const { url } = await put(key, bytes, {
    access: "public",
    addRandomSuffix: true,
    contentType,
  });
  uploadedByKey.set(key, url);
  counts.images += 1;
  return url;
}

// --- migrations ------------------------------------------------------------

// 1. .data/stores/*.json -> overlay (store = filename minus .json).
//    Each file is an Overlay<T>: an array of records, some flagged _deleted.
async function migrateStores() {
  const dir = path.join(DATA_DIR, "stores");
  if (!(await exists(dir))) return;
  let files;
  try {
    files = await readdir(dir);
  } catch {
    return;
  }
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const store = file.slice(0, -".json".length);
    const records = await readJson(path.join(dir, file));
    if (!Array.isArray(records)) {
      warnings.push(`Skipped ${file}: expected a JSON array, got ${typeof records}`);
      continue;
    }
    for (const record of records) {
      if (!record || typeof record.id !== "string") {
        warnings.push(`Skipped a record without a string id in stores/${file}`);
        continue;
      }
      await upsertOverlay(store, record.id, record);
    }
  }
}

// 2. .data/auth/users.json -> overlay 'auth-users' (id = user.id).
async function migrateAuthUsers() {
  const users = await readJson(path.join(DATA_DIR, "auth", "users.json"));
  if (!Array.isArray(users)) return;
  for (const user of users) {
    if (!user || typeof user.id !== "string") {
      warnings.push("Skipped an auth user without a string id");
      continue;
    }
    await upsertOverlay("auth-users", user.id, user);
  }
}

// 3. .data/auth/invites.json -> overlay 'auth-invites' (id = invite.code).
//    Matches auth.ts, which stores InviteCode rows keyed by { id: invite.code }.
async function migrateAuthInvites() {
  const invites = await readJson(path.join(DATA_DIR, "auth", "invites.json"));
  if (!Array.isArray(invites)) return;
  for (const invite of invites) {
    if (!invite || typeof invite.code !== "string") {
      warnings.push("Skipped an auth invite without a string code");
      continue;
    }
    // auth.ts persists the invite with an `id` mirror of `code`.
    await upsertOverlay("auth-invites", invite.code, { ...invite, id: invite.code });
  }
}

// 4. .data/hunts/custom-hunts.json -> overlay 'custom-hunts' (id = hunt.id).
//    Reference photos (stop.referencePhoto, relative "refs/…") -> Blob, and the
//    field is rewritten to the returned https URL before upsert.
async function migrateCustomHunts() {
  const hunts = await readJson(path.join(HUNTS_DIR, "custom-hunts.json"));
  if (!Array.isArray(hunts)) return;
  for (const hunt of hunts) {
    if (!hunt || typeof hunt.id !== "string") {
      warnings.push("Skipped a custom hunt without a string id");
      continue;
    }
    if (Array.isArray(hunt.stops)) {
      for (const stop of hunt.stops) {
        if (stop && typeof stop.referencePhoto === "string" && !isHttpUrl(stop.referencePhoto)) {
          const url = await uploadImage(
            path.join(HUNTS_DIR, stop.referencePhoto),
            stop.referencePhoto,
          );
          if (url) stop.referencePhoto = url;
        }
      }
    }
    await upsertOverlay("custom-hunts", hunt.id, hunt);
  }
}

// 5. .data/hunts/submissions.jsonl -> overlay 'hunt-submissions'.
//    Submissions are append-only lines with no id; synthesize a stable id from
//    (ts, huntId, stopId, photoPath) so re-running upserts the same row rather
//    than duplicating. Player photos (photoPath, relative "photos/…") -> Blob.
async function migrateHuntSubmissions() {
  const file = path.join(HUNTS_DIR, "submissions.jsonl");
  const subs = await readJsonl(file);
  for (const sub of subs) {
    if (!sub || typeof sub !== "object") continue;
    if (typeof sub.photoPath === "string" && !isHttpUrl(sub.photoPath)) {
      const url = await uploadImage(path.join(HUNTS_DIR, sub.photoPath), sub.photoPath);
      if (url) sub.photoPath = url;
    }
    const id = submissionId(sub);
    await upsertOverlay("hunt-submissions", id, { ...sub, id });
  }
}

// Stable synthetic id for a hunt submission (kept deterministic for idempotency).
function submissionId(sub) {
  const parts = [sub.ts, sub.huntId, sub.stopId, sub.photoPath].map((v) => String(v ?? ""));
  return parts.join("|").replace(/\s+/g, "_").slice(0, 200);
}

// 6. .data/map/images/** -> Blob, and rewrite the referencing map-feature
//    overlay rows (imageUrl + images[]) to the blob URLs. The features file was
//    already upserted verbatim in migrateStores(); here we re-read it, rewrite
//    the image fields, and re-upsert. No-op when Blob is not configured.
async function migrateMapImages() {
  if (!HAS_BLOB) {
    if (await exists(MAP_IMAGES_DIR)) {
      warnings.push(
        "Map images present but BLOB_READ_WRITE_TOKEN unset — map-feature imageUrl/images left as relative names.",
      );
    }
    return;
  }
  if (!(await exists(MAP_IMAGES_DIR))) return;

  const features = await readJson(path.join(DATA_DIR, "stores", "map-features.json"));
  if (!Array.isArray(features)) return;

  for (const feature of features) {
    if (!feature || typeof feature.id !== "string") continue;
    let changed = false;

    if (typeof feature.imageUrl === "string" && !isHttpUrl(feature.imageUrl)) {
      const url = await uploadImage(path.join(MAP_IMAGES_DIR, feature.imageUrl), imageKey(feature.imageUrl));
      if (url) {
        feature.imageUrl = url;
        changed = true;
      }
    }
    if (Array.isArray(feature.images)) {
      for (let i = 0; i < feature.images.length; i++) {
        const name = feature.images[i];
        if (typeof name === "string" && !isHttpUrl(name)) {
          const url = await uploadImage(path.join(MAP_IMAGES_DIR, name), imageKey(name));
          if (url) {
            feature.images[i] = url;
            changed = true;
          }
        }
      }
    }
    if (changed) await upsertOverlay("map-features", feature.id, feature);
  }
}

// Blob key for a bare map-image name (they are hashes like "abc123.jpg").
function imageKey(name) {
  return `map/${name}`;
}

function isHttpUrl(v) {
  return typeof v === "string" && /^https?:\/\//i.test(v);
}

// 7. .data/analytics/events.jsonl -> analytics_event (append-only).
async function migrateAnalytics() {
  const file = path.join(DATA_DIR, "analytics", "events.jsonl");
  if (!(await exists(file))) return;

  if (!FORCE) {
    const [{ n }] = await sql`SELECT count(*)::int AS n FROM analytics_event`;
    if (n > 0) {
      warnings.push(
        `analytics_event already has ${n} rows — skipped to avoid duplicates. Re-run with --force to append anyway.`,
      );
      return;
    }
  }
  const events = await readJsonl(file);
  for (const event of events) {
    await sql`INSERT INTO analytics_event (event) VALUES (${JSON.stringify(event)}::jsonb)`;
    counts.analytics_event += 1;
  }
}

// 8. .data/ltac-responses.jsonl -> survey_response (append-only).
async function migrateSurvey() {
  const file = path.join(DATA_DIR, "ltac-responses.jsonl");
  if (!(await exists(file))) return;

  if (!FORCE) {
    const [{ n }] = await sql`SELECT count(*)::int AS n FROM survey_response`;
    if (n > 0) {
      warnings.push(
        `survey_response already has ${n} rows — skipped to avoid duplicates. Re-run with --force to append anyway.`,
      );
      return;
    }
  }
  const responses = await readJsonl(file);
  for (const response of responses) {
    await sql`INSERT INTO survey_response (response) VALUES (${JSON.stringify(response)}::jsonb)`;
    counts.survey_response += 1;
  }
}

// --- schema (create tables if the DB is fresh) -----------------------------

// Mirror of db/schema.sql / ensureSchema() so a brand-new database self-inits.
// The neon() HTTP driver runs ONE statement per call.
async function ensureSchema() {
  await sql`CREATE TABLE IF NOT EXISTS overlay (
    store   text NOT NULL,
    id      text NOT NULL,
    doc     jsonb NOT NULL,
    deleted boolean NOT NULL DEFAULT false,
    PRIMARY KEY (store, id)
  )`;
  await sql`CREATE TABLE IF NOT EXISTS analytics_event (
    ts    timestamptz NOT NULL DEFAULT now(),
    event jsonb NOT NULL
  )`;
  await sql`CREATE TABLE IF NOT EXISTS survey_response (
    ts       timestamptz NOT NULL DEFAULT now(),
    response jsonb NOT NULL
  )`;
}

// --- run -------------------------------------------------------------------

async function main() {
  if (!(await exists(DATA_DIR))) {
    console.error(`No data directory at ${DATA_DIR} — nothing to migrate.`);
    process.exit(1);
  }

  console.log(`Migrating ${DATA_DIR} -> Neon${HAS_BLOB ? " + Vercel Blob" : " (Blob NOT configured)"}`);
  if (!HAS_BLOB) {
    console.log("  BLOB_READ_WRITE_TOKEN unset: image files will be left as relative paths.");
  }

  await ensureSchema();

  // Overlay collections first (map-features gets re-upserted with blob URLs in
  // migrateMapImages once its images are uploaded).
  await migrateStores();
  await migrateAuthUsers();
  await migrateAuthInvites();
  await migrateCustomHunts();
  await migrateHuntSubmissions();
  await migrateMapImages();

  // Append tables last (guarded run-once unless --force).
  await migrateAnalytics();
  await migrateSurvey();

  // --- summary ---
  console.log("\nMigration complete. Rows written:");
  const overlayStores = Object.keys(counts.overlay).sort();
  if (overlayStores.length === 0) {
    console.log("  overlay:            (none)");
  } else {
    let overlayTotal = 0;
    for (const store of overlayStores) {
      const n = counts.overlay[store];
      overlayTotal += n;
      console.log(`  overlay[${store}]:`.padEnd(30) + n);
    }
    console.log("  overlay TOTAL:".padEnd(30) + overlayTotal);
  }
  console.log("  analytics_event:".padEnd(30) + counts.analytics_event);
  console.log("  survey_response:".padEnd(30) + counts.survey_response);
  console.log("  images uploaded to Blob:".padEnd(30) + counts.images);

  if (warnings.length) {
    console.log(`\n${warnings.length} warning(s):`);
    for (const w of warnings) console.log(`  - ${w}`);
  }
}

main().catch((err) => {
  console.error("\nMigration FAILED:", err);
  process.exit(1);
});
