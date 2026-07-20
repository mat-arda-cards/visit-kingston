// POST /api/admin/audit/restore — put a record back to how it stood after a
// chosen change (E09; FR-A06/FR-A12). 401 signed out · 403 signed in but not
// admin — API routes bypass layouts, so the gate is re-checked here.
//
// Body: { store, recordId, auditId, expectedUpdatedAt }. The snapshot
// restored is always that audit entry's `after` ("the record as it stood
// after that change"); a delete entry replays as a re-delete, and restoring
// a live snapshot onto a tombstoned record is the un-delete path. The write
// goes through the writeRecord choke point with action 'restore' — the
// trail records the undo; nothing here touches the audit table directly.
//
// Status is PRESERVED, not defaulted: writeRecord's meta.status falls back
// to 'live', so replaying a pending record's snapshot without threading the
// row's current status would silently publish it (E08 moderation gate).
//
// The raw (unredacted) stored snapshot is what gets written — never a
// redaction-filtered projection — which is safe because sensitive stores are
// rejected before any row is read, and the response carries metadata only.

import { NextRequest, NextResponse } from "next/server";

import { getRecordMetaView, isSensitiveStore } from "@/lib/audit/read";
import {
  RESTORE_UNAVAILABLE_MESSAGE,
  getRestoreEntry,
  isRestorableAction,
} from "@/lib/audit/restore-registry";
import { getSessionUser, requireAdmin } from "@/lib/auth";
import { getAuditRow, getRecordMeta } from "@/lib/db/audit-read";
import { RecordValidationError } from "@/lib/db/store-schemas";
import type { RecordStatus, WriteMeta } from "@/lib/db/records";

export const dynamic = "force-dynamic";

function bad(error: string, status = 400): NextResponse {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  // The gate proved a session exists — this only re-reads it for the actor.
  const actor = (await getSessionUser())!.email;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return bad("Invalid request body");
  }
  const store = typeof body.store === "string" ? body.store : "";
  const recordId = typeof body.recordId === "string" ? body.recordId : "";
  const auditId = typeof body.auditId === "number" ? body.auditId : NaN;
  const expectedUpdatedAt =
    typeof body.expectedUpdatedAt === "string" ? body.expectedUpdatedAt : null;
  if (!store || !recordId || !Number.isInteger(auditId)) {
    return bad("store, recordId and auditId are required");
  }

  // Auth objects are a role-escalation surface — rejected before any row is
  // even read, ahead of the registry (which structurally excludes them too).
  if (isSensitiveStore(store)) {
    return bad("Account and invite records can't be restored");
  }

  const entry = await getAuditRow(auditId);
  if (!entry || entry.store !== store || entry.recordId !== recordId) {
    return bad("That history entry doesn't belong to this record", 404);
  }

  if (!isRestorableAction(entry.action)) {
    return bad(
      `This entry records a '${entry.action}' event, not a full version of the record — it can't be restored`,
    );
  }

  const registered = getRestoreEntry(store);
  if (!registered) return bad(RESTORE_UNAVAILABLE_MESSAGE);

  // Optimistic concurrency: the client pins the updated_at it saw when the
  // history panel loaded; anyone else's write in between is a 409.
  const current = await getRecordMeta(store, recordId);
  const currentUpdatedAt = current?.updatedAt.toISOString() ?? null;
  if (currentUpdatedAt !== expectedUpdatedAt) {
    return bad(
      "Someone changed this record since you opened its history — reload to see the latest version",
      409,
    );
  }

  const snapshot = entry.after;
  if (!snapshot || typeof snapshot.id !== "string") {
    return bad("This entry has no restorable snapshot");
  }
  if (snapshot.id !== recordId) {
    return bad("This entry's snapshot doesn't match the record id");
  }

  // A delete entry replays as a re-delete; writeRecord's tombstone path
  // validates { id } only, so the strict-schema check applies to live
  // snapshots. Old snapshots can predate a schema change — say so in field
  // terms (422), and write the RAW snapshot on success (writeRecord validates
  // but never mutates the doc, so nothing form-shaped is projected out).
  const isRedelete = entry.action === "delete";
  if (!isRedelete) {
    const parsed = registered.schema.safeParse(snapshot);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => ({
        path: i.path.join(".") || "(root)",
        message: i.message,
      }));
      return NextResponse.json(
        {
          error:
            `This version of the ${registered.label} no longer matches the current rules: ` +
            issues.map((i) => `${i.path}: ${i.message}`).join("; "),
          issues,
        },
        { status: 422 },
      );
    }
  }

  const meta: WriteMeta = {
    actor,
    source: "admin",
    action: "restore",
    // Preserve the row's current lifecycle status (see header). A record with
    // no overlay row can't reach here — every audit entry implies a write.
    status: (current?.status as RecordStatus | undefined) ?? "live",
  };

  try {
    await registered.save(
      isRedelete ? { ...snapshot, _deleted: true } : snapshot,
      meta,
    );
  } catch (err) {
    if (err instanceof RecordValidationError) {
      return NextResponse.json(
        {
          error: `This version of the ${registered.label} no longer matches the current rules: ${err.message}`,
        },
        { status: 422 },
      );
    }
    throw err;
  }

  const recordMeta = await getRecordMetaView(store, recordId);
  return NextResponse.json({ ok: true, recordMeta });
}
