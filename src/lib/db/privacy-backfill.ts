// E11 privacy backfill — data-layer half. One-time cleanup of historical
// rows that predate the area-only floor: rounded lat/lng keys on geo-ping
// events, stored outbound taps to food/health-assistance destinations, and
// the dead homeZip/homeState survey fields. Lives in src/lib/db/** because
// only the data layer may touch the DB client (dependency-cruiser + eslint);
// scripts/privacy-backfill.ts is the operator CLI over these helpers.
//
// The analytics/survey tables have no id column (append logs: ts + jsonb),
// so targeted deletes go through Postgres ctids. Ctids move on UPDATE —
// callers must delete BEFORE running the key-strip updates (the CLI does).

import "server-only";

import { sql } from "drizzle-orm";

import { getDb } from "./client";

/** Both drivers expose result rows under `.rows`; the static type is opaque. */
function resultRows<T>(res: unknown): T[] {
  return ((res as { rows?: unknown[] }).rows ?? []) as T[];
}

/** node-postgres reports rowCount; PGlite (the test harness) affectedRows. */
function mutatedRows(res: unknown): number {
  const r = res as { rowCount?: number; affectedRows?: number };
  return r.rowCount ?? r.affectedRows ?? 0;
}

export interface BackfillCounts {
  /** Analytics events still carrying a lat or lng key. */
  latLngEvents: number;
  /** Stored outbound events whose href matches the sensitive list. */
  sensitiveOutboundEvents: number;
  /** Survey rows still carrying homeZip or homeState. */
  surveyPiiRows: number;
}

/** Dry-run counts — reads only, deletes/updates nothing. */
export async function countBackfillTargets(
  isSensitiveOutbound: (href: string) => boolean,
): Promise<BackfillCounts> {
  const db = getDb();
  const [latLng] = resultRows<{ n: number }>(
    await db.execute(
      sql`SELECT count(*)::int AS n FROM analytics_event WHERE event ?| array['lat','lng']`,
    ),
  );
  const outbound = resultRows<{ href: string }>(
    await db.execute(
      sql`SELECT event ->> 'href' AS href FROM analytics_event
          WHERE event ->> 'type' = 'outbound' AND event ? 'href'`,
    ),
  );
  const sensitive = outbound.filter((r) => isSensitiveOutbound(r.href)).length;
  const [survey] = resultRows<{ n: number }>(
    await db.execute(
      sql`SELECT count(*)::int AS n FROM survey_response WHERE response ?| array['homeZip','homeState']`,
    ),
  );
  return {
    latLngEvents: latLng?.n ?? 0,
    sensitiveOutboundEvents: sensitive,
    surveyPiiRows: survey?.n ?? 0,
  };
}

/**
 * Delete stored sensitive-destination outbound events. Runs FIRST (ctids
 * shift on update). The suffix-match itself happens in JS via the injected
 * policy helper — SQL LIKE can't express the hostname-boundary rule safely.
 * Returns deleted-row count.
 */
export async function deleteSensitiveOutboundEvents(
  isSensitiveOutbound: (href: string) => boolean,
): Promise<number> {
  const db = getDb();
  const rows = resultRows<{ ctid: string; href: string }>(
    await db.execute(
      sql`SELECT ctid::text AS ctid, event ->> 'href' AS href FROM analytics_event
          WHERE event ->> 'type' = 'outbound' AND event ? 'href'`,
    ),
  );
  const targets = rows.filter((r) => isSensitiveOutbound(r.href)).map((r) => r.ctid);
  if (targets.length === 0) return 0;
  // One text param per ctid (IN list, sql.join): ctid text contains commas
  // and parens, which array-literal serialization mangles across drivers.
  const res = await db.execute(
    sql`DELETE FROM analytics_event WHERE ctid::text IN (${sql.join(
      targets.map((t) => sql`${t}`),
      sql`, `,
    )})`,
  );
  return mutatedRows(res);
}

/** Strip lat/lng keys from stored analytics events. Returns updated count. */
export async function stripLatLngKeys(): Promise<number> {
  const res = await getDb().execute(
    sql`UPDATE analytics_event SET event = event - 'lat' - 'lng' WHERE event ?| array['lat','lng']`,
  );
  return mutatedRows(res);
}

/** Strip homeZip/homeState from stored survey rows. Returns updated count. */
export async function stripSurveyPiiFields(): Promise<number> {
  const res = await getDb().execute(
    sql`UPDATE survey_response SET response = response - 'homeZip' - 'homeState'
        WHERE response ?| array['homeZip','homeState']`,
  );
  return mutatedRows(res);
}
