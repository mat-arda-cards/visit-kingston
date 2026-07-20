// E09 (vk/audit-read-layer) — the audit table's query half. READ-ONLY by
// doctrine: the `audit` table has exactly three writers — records.ts,
// auth-store.ts (E06), and worklist.ts (E08) — and this module must never
// become a fourth. It exists inside src/lib/db/ because only this layer may
// import the DB client; redaction and response shaping live one level up in
// src/lib/audit/read.ts, which is the only sanctioned consumer.
//
// Every query here is indexed (migration 0004: (store, record_id) + (ts)),
// LIMITed, and cursor-paginated descending on the id PK — the table grows
// forever (≥12-month retention floor, no pruning), so unbounded scans are
// the v1 trap this module exists to avoid.

import "server-only";

import { and, desc, eq, gte, lt, lte, type SQL } from "drizzle-orm";

import { getDb } from "./client";
import { audit, record } from "./schema";

export type AuditRow = typeof audit.$inferSelect;

export type AuditFilters = {
  store?: string;
  recordId?: string;
  actor?: string;
  action?: string;
  /** Inclusive ts bounds. */
  from?: Date;
  to?: Date;
};

export const AUDIT_DEFAULT_LIMIT = 50;
export const AUDIT_MAX_LIMIT = 200;
/** CSV export cap — bounded even for a filter matching the whole table. */
export const AUDIT_EXPORT_CAP = 10_000;

function whereFor(filters: AuditFilters, cursor?: number): SQL | undefined {
  const conds: SQL[] = [];
  if (filters.store) conds.push(eq(audit.store, filters.store));
  if (filters.recordId) conds.push(eq(audit.recordId, filters.recordId));
  if (filters.actor) conds.push(eq(audit.actor, filters.actor));
  if (filters.action) conds.push(eq(audit.action, filters.action));
  if (filters.from) conds.push(gte(audit.ts, filters.from));
  if (filters.to) conds.push(lte(audit.ts, filters.to));
  if (cursor !== undefined) conds.push(lt(audit.id, cursor));
  return conds.length ? and(...conds) : undefined;
}

/** One page of audit rows, newest first. `nextCursor` is the id to pass back
 *  to keep walking, or null when this page reached the oldest match. */
export async function queryAudit(
  filters: AuditFilters,
  opts?: { cursor?: number; limit?: number },
): Promise<{ rows: AuditRow[]; nextCursor: number | null }> {
  const limit = Math.min(
    Math.max(1, opts?.limit ?? AUDIT_DEFAULT_LIMIT),
    AUDIT_MAX_LIMIT,
  );
  const db = getDb();
  // Fetch one past the page to learn whether more rows exist without a COUNT.
  const rows = await db
    .select()
    .from(audit)
    .where(whereFor(filters, opts?.cursor))
    .orderBy(desc(audit.id))
    .limit(limit + 1);
  const page = rows.slice(0, limit);
  return {
    rows: page,
    nextCursor: rows.length > limit ? page[page.length - 1].id : null,
  };
}

/** Export read: same filters, hard-capped, newest first — and PROJECTED to
 *  the six metadata columns the CSV emits. Fetching before/after here would
 *  parse up to 10k pairs of full jsonb documents only to discard them, and
 *  not fetching them is also the structural guarantee that no body can ever
 *  reach an export. */
export type AuditExportRow = Pick<
  AuditRow,
  "id" | "ts" | "actor" | "action" | "store" | "recordId" | "source"
>;

export async function queryAuditForExport(
  filters: AuditFilters,
): Promise<AuditExportRow[]> {
  const db = getDb();
  return db
    .select({
      id: audit.id,
      ts: audit.ts,
      actor: audit.actor,
      action: audit.action,
      store: audit.store,
      recordId: audit.recordId,
      source: audit.source,
    })
    .from(audit)
    .where(whereFor(filters))
    .orderBy(desc(audit.id))
    .limit(AUDIT_EXPORT_CAP);
}

/** Single row by its id PK (the `auditId` the restore route addresses). */
export async function getAuditRow(auditId: number): Promise<AuditRow | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(audit)
    .where(eq(audit.id, auditId))
    .limit(1);
  return row ?? null;
}

// DISTINCT store is a whole-table scan (btree can't skip-scan here), and the
// dropdown it feeds changes only when a brand-new store first writes — so the
// result is memoized ~60s per process, same pattern as records.ts dbHealthy.
let storesCache: { at: number; stores: string[] } | null = null;

/** Store names that actually appear in the trail — feeds the browser's store
 *  dropdown so E05's store naming can never drift a hardcoded list. */
export async function listAuditStores(): Promise<string[]> {
  if (storesCache && Date.now() - storesCache.at < 60_000) {
    return storesCache.stores;
  }
  const db = getDb();
  const rows = await db
    .selectDistinct({ store: audit.store })
    .from(audit)
    .orderBy(audit.store);
  storesCache = { at: Date.now(), stores: rows.map((r) => r.store) };
  return storesCache.stores;
}

/** The provenance strip's record-level metadata (current overlay row, if
 *  any — seed-only records have no row and return null). */
export type RecordMeta = {
  status: string;
  source: string;
  externalId: string | null;
  ownerOrgId: string | null;
  updatedAt: Date;
  updatedBy: string | null;
  deleted: boolean;
};

export async function getRecordMeta(
  store: string,
  id: string,
): Promise<RecordMeta | null> {
  const db = getDb();
  const [row] = await db
    .select({
      status: record.status,
      source: record.source,
      externalId: record.externalId,
      ownerOrgId: record.ownerOrgId,
      updatedAt: record.updatedAt,
      updatedBy: record.updatedBy,
      deleted: record.deleted,
    })
    .from(record)
    .where(and(eq(record.store, store), eq(record.id, id)))
    .limit(1);
  return row ?? null;
}
