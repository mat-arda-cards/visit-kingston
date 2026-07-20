// E08 staleness sweep — POST enqueues one worklist item per live record whose
// verify-by window has lapsed (see STALENESS_DEFAULTS for the per-store
// intervals). Idempotent by construction: the worklist's partial unique index
// makes a re-run of an already-open subject a no-op, so the cron can fire as
// often as it likes.
//
// Auth: an admin session OR `Authorization: Bearer $WORKLIST_SWEEP_TOKEN`
// (?token= also accepted — cron schedulers vary; pattern from
// src/app/api/ferry/observe/route.ts). UNLIKE the ferry route this gate
// FAILS CLOSED: with the env var unset the token path simply doesn't exist —
// a worklist write is not public-data telemetry, so open-when-unset would be
// wrong here. The scheduler registration lives in docs/OPERATIONS.md.
//
// Seed-only records carry no governance row and are not swept until a write
// overlays them — docs/OPERATIONS.md "Worklist & moderation" explains.

import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, requireAdmin } from "@/lib/auth";
import { listVerifyDue } from "@/lib/db/records";
import { createWorklistItem, STALENESS_DEFAULTS } from "@/lib/stores/worklist-store";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const expected = process.env.WORKLIST_SWEEP_TOKEN;
  const provided =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    request.nextUrl.searchParams.get("token") ??
    "";
  const tokenOk = Boolean(expected && provided && provided === expected);

  let actor = "system";
  if (!tokenOk) {
    const denied = await requireAdmin();
    if (denied) return denied;
    actor = (await getSessionUser())!.email;
  }

  const due = await listVerifyDue(STALENESS_DEFAULTS);
  let created = 0;
  let alreadyOpen = 0;
  for (const record of due) {
    const label =
      String(record.doc.name ?? record.doc.title ?? record.id) || record.id;
    const result = await createWorklistItem(
      {
        type: "staleness",
        subjectStore: record.store,
        subjectId: record.id,
        subjectLabel: label,
        payload: {
          lastVerifiedAt: record.lastVerifiedAt?.toISOString() ?? null,
          intervalDays: record.intervalDays,
        },
      },
      { actor, source: "system" },
    );
    if (result.created) created += 1;
    else alreadyOpen += 1;
  }

  return NextResponse.json({ ok: true, scanned: due.length, created, alreadyOpen });
}
