// E12 public event-suggestion intake (M-05-03 / FR-EVT-04): the no-account
// "add your event to the Kingston calendar" form. ALWAYS lands
// status='pending' in the E08 moderation queue — the anonymous path has no
// bypass of any kind (trustedAutoPublish is an org flag; there is no org
// here).
//
// MHMDA-floor data minimization: submitter name + ONE contact field, nothing
// else about the submitter, no location capture. The contact rides in the
// worklist payload (admin-only surface) for moderation follow-up and is
// NEVER rendered publicly; the content record itself carries no submitter
// contact.
//
// Abuse controls: IP rate limit (5/hour, the epic's number) BEFORE the body
// parse (report-route pattern), plus a honeypot field — bots that fill
// "website2" get a 200 and nothing else (no signal to adapt to).

import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { holdSuggestedRecord } from "@/lib/moderation";
import { checkRateLimit, clientKey } from "@/lib/rate-limit";
import { RecordValidationError } from "@/lib/db/store-schemas";
import { eventSchema, firstZodMessage } from "@/lib/schemas";
import { getUnifiedCalendarAccess } from "@/lib/stores/unified-calendar-store";
import { WorklistValidationError } from "@/lib/schemas/worklist";
import type { EventItem } from "@/lib/types";

export const dynamic = "force-dynamic";

const MAX_NAME = 200;
const MAX_CONTACT = 200;

function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "event"
  );
}

export async function POST(request: NextRequest) {
  // Ship-dark: the suggest surface exists only where the unified calendar
  // does (flag ON, or a signed-in admin previewing). 404, not 403 — the
  // surface is dark, not forbidden.
  const access = await getUnifiedCalendarAccess();
  if (!access.enabled && !access.adminPreview) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const ipLimit = await checkRateLimit(clientKey(request, "events-suggest"), {
    limit: 5,
    windowMs: 60 * 60_000,
  });
  if (!ipLimit.ok) {
    return NextResponse.json(
      { error: "too many suggestions, please try again later" },
      { status: 429, headers: { "Retry-After": String(ipLimit.retryAfterSeconds) } },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Honeypot: a hidden field humans never see. A filled one gets a bland 200
  // so the bot learns nothing; nothing is stored.
  if (typeof body.website2 === "string" && body.website2.trim() !== "") {
    return NextResponse.json({ ok: true, pending: true });
  }

  const submitterName =
    typeof body.submitterName === "string" ? body.submitterName.trim() : "";
  const contact = typeof body.contact === "string" ? body.contact.trim() : "";
  if (!submitterName || submitterName.length > MAX_NAME) {
    return NextResponse.json({ error: "your name is required" }, { status: 400 });
  }
  if (!contact || contact.length > MAX_CONTACT) {
    return NextResponse.json(
      { error: "a way to reach you is required (email or phone)" },
      { status: 400 },
    );
  }

  // Event fields validate through the ONE events schema (E07 rule: never a
  // parallel validator). The intake supplies what the public form doesn't
  // ask: a fresh id, the default category, and organizer = submitter name
  // (the name is fine to show; the CONTACT is the protected field).
  const candidate = {
    id: `${slugify(typeof body.title === "string" ? body.title : "")}-${randomBytes(3).toString("hex")}`,
    title: body.title,
    start: body.start,
    end: body.end,
    venue: body.venue,
    description: body.description,
    category: "community",
    organizer: submitterName,
    url: body.url,
  };
  const parsed = eventSchema.safeParse(candidate);
  if (!parsed.success) {
    return NextResponse.json({ error: firstZodMessage(parsed.error) }, { status: 400 });
  }
  const event = parsed.data as EventItem;

  try {
    await holdSuggestedRecord("events", event, event.title, { submitterName, contact });
  } catch (err) {
    if (err instanceof RecordValidationError || err instanceof WorklistValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }

  return NextResponse.json({ ok: true, pending: true });
}
