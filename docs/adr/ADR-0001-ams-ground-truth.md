# ADR-0001 — AMS ground truth: ChamberMaster/MemberZone, gated API access

## Status

BLOCKED-ON-HUMAN — awaiting written GrowthZone support answers via the Chamber (draft email: docs/chamber/ams-support-email.md). Accepted only when the Questions section below is filled from a written vendor reply and Mat signs the walk-away decision.

## Context

GrowthZone (the vendor) sells two distinct platforms with two different APIs: GrowthZone AMS (tenants at `{subdomain}.growthzoneapp.com`, REST + OAuth/OIDC, support-configured webhooks) and the legacy-but-still-sold ChamberMaster/MemberZone (API at `api.micronetonline.com/v1`, OData v2 queries, `X-ApiKey` header auth, no webhooks, access quote-gated through GrowthZone's Engagement team). The v2 plan syncs the Chamber's member directory and events from its AMS (E16 inbound, E24 write-back) and reads membership level for entitlements, so designing against the wrong platform — or an unquoted vendor fee — would sink those epics. This ADR records the machine-verifiable ground truth (the Chamber's tenant is ChamberMaster/MemberZone) and holds the open questions only GrowthZone can answer in writing. Re-verify the machine-checkable half anytime with `npm run ams:checks`; the harness (`scripts/ams-ground-truth-checks.mjs`) writes its timestamped snapshot to `docs/adr/ams-ground-truth-checks.json` and doubles as the platform-drift alarm. No AMS sync code may be written while this ADR reads BLOCKED-ON-HUMAN.

## Verified facts

All rows below are transcribed from the harness snapshot generated **2026-07-10T21:40:09Z** (`docs/adr/ams-ground-truth-checks.json`); each fact was first verified 2026-07-05 and re-verified on the probe date shown. Every feed probe uses the truth triple — HTTP status + `Content-Type` + body prefix — because of the soft-404 row below.

| # | Fact | Evidence | Probed |
|---|---|---|---|
| 1 | The Chamber's tenant is **ChamberMaster/MemberZone, not GrowthZone AMS** | `dig CNAME business.kingstonchamber.com` → `public.west.us.memberzone.org` | 2026-07-10 |
| 2 | Public events index is live and yields per-event Details links | `GET /events` → HTTP 200; ≥ 3 `/events/Details/{slug}-{id}` links found | 2026-07-10 |
| 3 | **Per-event iCal is live and free** | `GET /events/ICal/{slug}-{id}.ics` → HTTP 200, `text/calendar; charset=utf-8`, body starts `BEGIN:VCALENDAR`; `PRODID:-//ChamberMaster//Event Calendar 2.0//EN`; `TZID:America/Los_Angeles` present; `X-PUBLISHED-TTL:P1H` (3/3 probed events valid) | 2026-07-10 |
| 4 | **Soft-404 trap:** `/events/ical` (no slug) returns HTTP **200** with `text/html` and body "Event is not found." — status codes alone prove nothing on this host | `GET /events/ical` → 200, `text/html; charset=utf-8`, soft-404 body confirmed | 2026-07-10 |
| 5 | **No calendar-wide feed exists** | `/events/rss`, `/events/icalfeed`, `/events/calendar.ics`, `/rss` all 404; `/events/ical` is the soft-404 above; nothing served `text/calendar` or XML | 2026-07-10 |
| 6 | Module state: jobs on, hot deals off | `GET /jobs` → 200; `GET /hotdeals` → 404 | 2026-07-10 |
| 7 | CM/MZ API endpoint reference is public, no login | `GET https://api.micronetonline.com/v1/documentation` → 200 (https worked; no http fallback needed) | 2026-07-10 |
| 8 | Members objects expose enough for listings + entitlements (`Status`, `Level`, `WebParticipationLevel`, `DoNotDisplayOnWeb`, `DropDate`, `Slug`, `Latitude/Longitude`, `LogoUrl`); write endpoints exist but key scope is unknown (Question 3) | Public v1 documentation, read 2026-07-05 | 2026-07-05 |
| 9 | API access is enablement-gated with unpublished pricing; keys are per-developer and granted only with the account holder's (the Chamber's) express permission | GrowthZone support docs, read 2026-07-05 — hence the Chamber sends the email, not Mat | 2026-07-05 |
| 10 | Rate limits for `api.micronetonline.com` are not documented anywhere public; `events/feeds` and `RecentActivity` appear in the v1 docs with no description | Public v1 documentation, read 2026-07-05 (Questions 4–5) | 2026-07-05 |

## Questions awaiting written answers (the gate)

The eight questions below are the gate. They match `docs/chamber/ams-support-email.md` exactly; the gate closes only when each **Answer** is filled from GrowthZone's written reply.

1. Which product/edition/package is our account on (ChamberMaster vs MemberZone branding, module version — our public modules live at business.kingstonchamber.com), and does that edition include API access?

   **Answer:** TBD-HUMAN

2. If API access is not included: what does enablement cost for an account of our size, and which editions include it?

   **Answer:** TBD-HUMAN

3. Is an issued API key read-only or read-write? Can write scopes (members `PUT`, events `POST`/`PUT`, Marketplace `POST`) be granted to a chamber-built app, and is there an approval workflow for API-written content?

   **Answer:** TBD-HUMAN

4. What are the rate limits / throttling / burst rules for `api.micronetonline.com`?

   **Answer:** TBD-HUMAN

5. What do the `events/feeds` and `RecentActivity` endpoints do (both appear in the v1 documentation without descriptions)? Can `RecentActivity` be used as a change feed, given no webhooks exist?

   **Answer:** TBD-HUMAN

6. Is there any webhook or change-notification option for ChamberMaster/MemberZone customers, and does an all-events iCal or RSS feed exist for v4 public modules (per-event iCal works today; we found no calendar-wide feed)?

   **Answer:** TBD-HUMAN

7. Do the "Marketplace" API objects correspond to Hot Deals / Member-to-Member Deals, and what does enabling the hot-deals module on our tenant involve?

   **Answer:** TBD-HUMAN

8. If we later migrate to GrowthZone AMS: which API modules are contractually supported for external use (vs. Curated-API-only), what webhook action types are available, and does OAuth client issuance cost extra?

   **Answer:** TBD-HUMAN

## Walk-away price

Recommended defaults — TBD-HUMAN (Mat) to confirm or amend before the gate closes.

Decision rule for whatever GrowthZone quotes for API enablement:

- **(a) Quoted fee ≤ $500/yr** — proceed on the Chamber ops budget. This fits the ~$65/mo headroom under the $100/mo infra ceiling (current band ~$7–20/mo; projected steady state after Phase 2 is $15–35/mo).
- **(b) $500–$2,000/yr** — proceed ONLY contingent on a 2027 Kitsap County LTAC award (RFP window Oct 1–30, 2026). Until awarded, stay on integration-ladder rungs 0–1 (CSV import/export + per-event iCal), which are free.
- **(c) > $2,000/yr** — walk away. Rungs 0–1 permanently; revisit only if pricing changes or the Chamber migrates platforms.

Decision: TBD-HUMAN (Mat) — date: ____

## LTAC funding route

Kingston is unincorporated Kitsap County, so the Kitsap County Lodging Tax Advisory Committee (LTAC) is the funding authority. The Chamber, a 501(c)(6), applies in the Oct 1–30, 2026 RFP window for 2027 funds, framing the AMS API enablement fee as tourism promotion under RCW 67.28.080 — a paid feature integration for the community tourism app. LTAC and ops money are never mixed: this fee's funding source is declared explicitly here (ops budget for band (a), LTAC award for band (b), per the walk-away rule above) and later recorded in the Phase 3 cost-attribution ledger (E18).

## Decision

TBD-HUMAN. No AMS sync code (E16/E24) may merge while this reads TBD-HUMAN.

## Consequences

- All AMS calls in later epics go through the `AmsProvider` interface (`ChamberMaster | GrowthZoneAMS | CSV | Null`) — built in E16, not before.
- ChamberMaster/MemberZone has no webhooks, so sync is pull-based idempotent reconciliation (nightly members, hourly events), never push.
- Entitlements are derived locally from polled member fields with "as-of last sync" semantics.
- AMS-synced member PII falls inside the MHMDA data-minimization floor (E11).
- If DNS ever resolves to `.growthzoneapp.com`, this ADR is stale and must be redone — `npm run ams:checks` fails loudly on exactly that drift.
