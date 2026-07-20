// E09 (vk/audit-read-layer) — the public read surface over the audit trail.
// Every function here returns REDACTED entries; redaction is not the caller's
// job. Raw Drizzle queries live in src/lib/db/audit-read.ts (only the db
// layer may touch the client); this module owns what is allowed to LEAVE the
// server:
//
//  - Sensitive stores (auth/user/org/invite trails) are metadata-only: their
//    before/after bodies are stripped entirely. E06's auditableInvite
//    allowlist deliberately includes the invite `code` — an unredeemed code
//    is a live credential — and legacy `auth-users` rows predate today's
//    write-time redaction, so nothing from these stores can be trusted as a
//    response body.
//  - Everything else gets recursive denylist redaction, defense in depth on
//    top of records.ts's narrow write-time redactSecrets: denylisted KEYS are
//    removed outright (a masked value still leaks the key's existence into
//    CSV/JSON greps — AC: neither value nor key may appear).
//
// The audit table's writers remain exactly records.ts, auth-store.ts and
// worklist.ts — this layer must never become a fourth.

import "server-only";

import {
  type AuditFilters,
  type AuditRow,
  type RecordMeta,
  getAuditRow,
  getRecordMeta,
  listAuditStores,
  queryAudit,
  queryAuditForExport,
} from "@/lib/db/audit-read";

export type { AuditFilters } from "@/lib/db/audit-read";

/** Stores whose audit bodies never leave the server (metadata-only rows).
 *  Covers the E05-era record-table auth stores AND the E06 dedicated-table
 *  labels auth-store.ts writes today. */
export const SENSITIVE_STORES: ReadonlySet<string> = new Set([
  "auth-users",
  "auth-invites",
  "users",
  "invites",
  "orgs",
]);

export function isSensitiveStore(store: string): boolean {
  return SENSITIVE_STORES.has(store);
}

/** Keys removed from every outgoing audit body, case-insensitive. */
const DENYLIST_KEYS = new Set([
  "password",
  "passwordhash",
  "temppassword",
  "token",
  "secret",
]);
/** Additionally removed on invite-shaped stores (codes are credentials —
 *  moot while those stores are body-stripped, but the intent stays coded). */
const INVITE_DENYLIST_KEYS = new Set([...DENYLIST_KEYS, "code"]);
const INVITE_STORES = new Set(["auth-invites", "invites"]);

function stripDenylisted(value: unknown, denylist: ReadonlySet<string>): unknown {
  if (Array.isArray(value)) return value.map((v) => stripDenylisted(v, denylist));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (denylist.has(k.toLowerCase())) continue;
      out[k] = stripDenylisted(v, denylist);
    }
    return out;
  }
  return value;
}

/** One audit row as it is allowed to appear in a response. `ts` is ISO —
 *  server pages hand Dates to clients as strings (house convention). */
export type AuditEntry = {
  id: number;
  ts: string;
  actor: string;
  action: string;
  store: string;
  recordId: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  source: string;
  /** True when before/after were stripped because the store is sensitive. */
  metadataOnly: boolean;
};

export function redactAuditEntry(row: AuditRow): AuditEntry {
  const metadataOnly = isSensitiveStore(row.store);
  const denylist = INVITE_STORES.has(row.store)
    ? INVITE_DENYLIST_KEYS
    : DENYLIST_KEYS;
  const clean = (body: Record<string, unknown> | null) =>
    metadataOnly || body === null
      ? null
      : (stripDenylisted(body, denylist) as Record<string, unknown>);
  return {
    id: row.id,
    ts: row.ts.toISOString(),
    actor: row.actor,
    action: row.action,
    store: row.store,
    recordId: row.recordId,
    before: clean(row.before),
    after: clean(row.after),
    source: row.source,
    metadataOnly,
  };
}

/** Record-level metadata for the provenance strip, ISO-serialized. Null when
 *  the record has no overlay row (seed-only — nothing has ever written it). */
export type RecordMetaView = {
  status: string;
  source: string;
  externalId: string | null;
  updatedAt: string;
  updatedBy: string | null;
  deleted: boolean;
};

function toMetaView(meta: RecordMeta | null): RecordMetaView | null {
  if (!meta) return null;
  return {
    status: meta.status,
    source: meta.source,
    externalId: meta.externalId,
    updatedAt: meta.updatedAt.toISOString(),
    updatedBy: meta.updatedBy,
    deleted: meta.deleted,
  };
}

/** Global, filterable page of the trail (the /admin/audit browser). */
export async function listAudit(
  filters: AuditFilters,
  opts?: { cursor?: number; limit?: number },
): Promise<{ entries: AuditEntry[]; nextCursor: number | null }> {
  const { rows, nextCursor } = await queryAudit(filters, opts);
  return { entries: rows.map(redactAuditEntry), nextCursor };
}

/** One record's history plus its current metadata, so the provenance strip
 *  needs no second endpoint. */
export async function listRecordHistory(
  store: string,
  recordId: string,
  opts?: { cursor?: number; limit?: number },
): Promise<{
  entries: AuditEntry[];
  nextCursor: number | null;
  recordMeta: RecordMetaView | null;
}> {
  const [page, meta] = await Promise.all([
    queryAudit({ store, recordId }, opts),
    getRecordMeta(store, recordId),
  ]);
  return {
    entries: page.rows.map(redactAuditEntry),
    nextCursor: page.nextCursor,
    recordMeta: toMetaView(meta),
  };
}

/** Single entry by the audit row's own id PK. */
export async function getAuditEntry(auditId: number): Promise<AuditEntry | null> {
  const row = await getAuditRow(auditId);
  return row ? redactAuditEntry(row) : null;
}

/** Current record metadata alone (the restore route's response body). */
export async function getRecordMetaView(
  store: string,
  recordId: string,
): Promise<RecordMetaView | null> {
  return toMetaView(await getRecordMeta(store, recordId));
}

/** Export read (CSV): redacted like everything else — the CSV serializer
 *  additionally drops bodies entirely, but discipline starts here. */
export async function listAuditForExport(
  filters: AuditFilters,
): Promise<AuditEntry[]> {
  const rows = await queryAuditForExport(filters);
  return rows.map(redactAuditEntry);
}

/** Store names present in the trail — feeds the browser's dropdown so E05's
 *  final store naming can never drift a hardcoded list. */
export async function auditStoreNames(): Promise<string[]> {
  return listAuditStores();
}
