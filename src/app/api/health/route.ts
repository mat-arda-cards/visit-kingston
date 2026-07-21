// Readiness probe for the platform health check (Render `healthCheckPath`) and
// external uptime monitors.
//
// SINCE E15 (slice 3) THIS GATES ON POSTGRES ONLY. It deliberately does NOT
// touch the filesystem. The persistent disk is being removed, and the previous
// version write-probed DATA_DIR — which would 503 a perfectly healthy service
// the moment the disk is gone, and Render would pull it out of rotation and
// keep it out. Structured data has no filesystem fallback (E05), so "can we
// reach Postgres" IS the readiness question: a substrate release started
// without a reachable DATABASE_URL never reports healthy, so Render keeps
// serving the previous release (fail-closed deploys).
//
// `storage` is REPORTED but NEVER gates. An object-store (R2) blip must 404 a
// single image, never 503 the whole site. hasR2() is a pure env check with no
// network call, so an R2 outage cannot influence this probe.

import { hasR2 } from "@/lib/blob-store";
import { dbHealthy } from "@/lib/db/records";

export const dynamic = "force-dynamic";

/**
 * Where uploaded images are configured to live — informational only.
 *   "r2"           R2 is configured (the post-cutover production target).
 *   "fs"           a persistent disk is mounted (DATA_DIR set) — pre-cutover.
 *   "unconfigured" neither: images have no durable home. Post-cutover this is
 *                  a red flag worth alerting on. (Local dev also reports this —
 *                  it writes to an ephemeral .data/ and is not a deployment.)
 * A pure env read: it must not probe the network or the disk, so a storage
 * outage can never affect the readiness result above.
 */
function storageMode(): "r2" | "fs" | "unconfigured" {
  if (hasR2()) return "r2";
  return process.env.DATA_DIR?.trim() ? "fs" : "unconfigured";
}

export async function GET() {
  const db = await dbHealthy();
  const body = {
    ok: db,
    db,
    storage: storageMode(),
    time: new Date().toISOString(),
  };
  return Response.json(body, { status: db ? 200 : 503 });
}
