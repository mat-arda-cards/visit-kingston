import { NextRequest } from "next/server";
import { checkRateLimit, clientKey } from "@/lib/rate-limit";
import { surveyStore } from "@/lib/survey-store";
import type { SurveyResponse } from "@/lib/types";

const DISTANCE_BANDS = ["local", "10-50mi", "50mi-plus", "out-of-state", "international"];

// E11 (precondition-2 gap closed): cap the raw body before parsing — field
// truncation below only bounds what we keep, not what we buffer.
const MAX_BODY_BYTES = 8_192;

export async function POST(request: NextRequest) {
  const limit = await checkRateLimit(clientKey(request, "survey"), {
    limit: 5,
    windowMs: 10 * 60_000,
  });
  if (!limit.ok) {
    return Response.json(
      { error: "too many submissions, please try again later" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  let body: Partial<SurveyResponse>;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) {
      return Response.json({ error: "body too large" }, { status: 413 });
    }
    body = JSON.parse(raw);
  } catch {
    return Response.json({ error: "invalid JSON" }, { status: 400 });
  }

  if (!body.distanceBand || !DISTANCE_BANDS.includes(body.distanceBand)) {
    return Response.json({ error: "distanceBand required" }, { status: 400 });
  }

  // E11: the dead zip/state fields are gone — the survey UI never asked for
  // them (audit-confirmed dead PII surface); the route no longer accepts them.
  const response: SurveyResponse = {
    submittedAt: new Date().toISOString(),
    distanceBand: body.distanceBand,
    overnight: Boolean(body.overnight),
    lodgingNights:
      typeof body.lodgingNights === "number" && body.lodgingNights >= 0
        ? Math.min(body.lodgingNights, 60)
        : undefined,
    lodgingType: typeof body.lodgingType === "string" ? body.lodgingType.slice(0, 40) : undefined,
    partySize:
      typeof body.partySize === "number" && body.partySize > 0
        ? Math.min(body.partySize, 50)
        : undefined,
    primaryReason:
      typeof body.primaryReason === "string" ? body.primaryReason.slice(0, 60) : undefined,
  };

  try {
    await surveyStore.save(response);
  } catch {
    // Read-only filesystem (e.g. serverless without a DB store configured):
    // don't fail the visitor's request over telemetry.
    console.warn("survey: store unavailable, response dropped");
  }
  return Response.json({ ok: true });
}

/** Aggregate summary for the Chamber's LTAC/JLARC reporting. Admin-only —
 *  the same numbers render on the gated /admin dashboard. Only GET is gated:
 *  POST is the anonymous visitor submission and must stay public. */
export async function GET() {
  // Imported lazily so the public POST path above never pulls the auth/DB
  // module graph in at module scope.
  const { requireAdmin } = await import("@/lib/auth");
  const denied = await requireAdmin();
  if (denied) return denied;

  const summary = await surveyStore.summarize();
  return Response.json(summary);
}
