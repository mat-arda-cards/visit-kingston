# ADR-0005 — Events canonical source: recording the ADR-0002 decision, with probe evidence

## Status

Accepted — this ADR is an **addendum to ADR-0002** (`docs/adr/ADR-0002-app-first-events-and-manual-exports.md`, accepted by Mat 2026-07-10). It records a decision that is already made and human-accepted; nothing here is a new decision, so no human gate applies. Minted by E12 at execution time (2026-07-20) per the epic's RE-CHARTER AMENDMENT delta 1: the two-branch decision rule E12 step 3 originally carried is VOID — the canonical-source question it was chartered to answer mechanically was answered by ADR-0002 first.

ADR-0001 (`docs/adr/ADR-0001-ams-ground-truth.md`) is cited throughout as **CLOSED — walk-away** history: its verified tenant facts remain true and load-bearing (GrowthZone tenant 3508 behind two hostnames, the `/events/ical` soft-404, `X-PUBLISHED-TTL:P1H`), but its gate is retired — the GrowthZone API will never be purchased, and no API client code is ever authorized.

## Context

E12 builds the unified events calendar: in-app events merged with two external ingest families — the GrowthZone per-event iCal files at business.kingstonchamber.com (legacy ChamberMaster naming, same tenant 3508 per ADR-0001's Correction) and The Events Calendar (Tribe) REST feeds on explorekingstonwa.com and portofkingston.org. The epic opens by re-probing all three sources; `npm run events:probe` (`scripts/events-source-probe.mjs`) is the re-runnable form of that probe and writes `docs/adr/events-source-probe.json`.

### Probe evidence

| Source | 2026-07-04 | 2026-07-05 | 2026-07-20 (this ADR) |
| --- | --- | --- | --- |
| explorekingstonwa.com Tribe REST | HTTP 200, valid JSON, `total: 0` | HTTP 200, valid JSON, `total: 0` | HTTP 200, `application/json`, `total: 0` — healthy endpoint, still publishes no events |
| portofkingston.org Tribe REST | — | live, real events; field shapes verified (naive local `start_date`, `utc_start_date`, `timezone`, `all_day`, `hide_from_listings`, `global_id`) | HTTP 200, `application/json`, `total: 32`, first `global_id` `portofkingston.org?id=18728`; **note: `venue` observed as a single OBJECT here, where the 2026-07-05 probe recorded an ARRAY — both shapes are real and the normalizer handles both** |
| business.kingstonchamber.com (GrowthZone tenant 3508) | — | events index lists `/events/Details/{slug}-{id}`; per-event `.ics` valid `text/calendar`, `PRODID:-//ChamberMaster//Event Calendar 2.0//EN`, `X-PUBLISHED-TTL:P1H`; `/events/ical` is a soft-404 (HTTP 200 + `text/html` + "Event is not found.") | index HTTP 200 with 3 Details slugs; 3/3 per-event iCals valid, `X-PUBLISHED-TTL:P1H` unchanged; soft-404 unchanged; staff-generated whole-calendar feed URL **not yet delivered** (`docs/OPERATIONS.md` §9 item 6b) |
| kingstonchamber.com WordPress Tribe | permanently empty shell — do not integrate (`docs/DATA_SOURCES.md` §10) | unchanged | not re-probed; do-not-integrate stands |

With three probe dates showing `total: 0`, the explorekingstonwa Tribe feed's only remaining job in this ADR is setting its source-config state (below). The original Chamber action item "start publishing events on explorekingstonwa.com or confirm the AMS calendar is the system of record" is **retired** — ADR-0002 made the app the events front door, and confirming the AMS as system of record is now impossible (the AMS is being cancelled).

## Decision

**In-app is canonical.** Recorded from ADR-0002 decision 1, not re-decided here: the app is the events front door and entry point; members and orgs submit events in the app; GrowthZone event entry is legacy.

**Unified-calendar precedence is in-app > GrowthZone > Tribe** — in source-id terms, `in-app > ams-ical > tribe-*` (`SOURCE_PRECEDENCE` in `src/lib/events/types.ts`). Confirmed as Chamber policy by ADR-0002; changing this order means amending ADR-0002 with Mat, never a code-review call. Rationale for in-app winning same-day accuracy: the GrowthZone feed self-declares `X-PUBLISHED-TTL:P1H` — it lags edits by about an hour — while in-app records are live on write.

**The GrowthZone source is transitional with an explicit end.** The whole-calendar feed (when the staff-generated URL arrives) and the per-event iCal fallback both end at the R3 freeze / GrowthZone cancellation, ~April 2027 (roll-off plan §4; written non-renewal notice due March 1, 2027). The ingest adapter is disable-able with no deploy: the per-source `enabled` flag in the `calendar-sources` config store, surfaced as an admin toggle. Disabling `ams-ical` cleanly drops its events from the merged output (the unified read path serves live records from enabled sources only). Actually flipping it off is an **R4 migration-completeness gate item**, not an E12 action. If the subdomain dies before the source is disabled, the adapter fails soft — a truth-triple rejection recorded in the per-run report, never a crash.

**Post-cancellation merge shape: in-app > Tribe.** After the GrowthZone feed ends, the merged calendar is in-app plus whichever Tribe sources are enabled — portofkingston.org (built, **default OFF pending Chamber sign-off**) and explorekingstonwa.com (if it ever fills). The merge core (`SOURCE_PRECEDENCE`, `mergeCalendar`) is total over any subset of sources: no code path or invariant requires an `ams-ical` member in a cluster, and the test suite includes the absent-source case (the same merge input minus every `ams-ical` event yields correct in-app > tribe precedence).

**Source-config states recorded by this ADR** (seeded in the `calendar-sources` store):

| source id | state | why |
| --- | --- | --- |
| `ams-ical` | enabled (transitional — ends at R3/cancellation ~April 2027) | the Chamber's own published calendar during the transition |
| `tribe-explorekingstonwa` | enabled-but-empty-tolerant | healthy endpoint, `total: 0` on all three probe dates; auto-activates nothing — if the Chamber starts publishing there, events flow in with no deploy |
| `tribe-portofkingston` | disabled | live with real events, but publicly rendering a third party's calendar needs the Chamber's say-so (ask-first in the epic charter) |
| kingstonchamber.com | never a source | permanently empty shell; `docs/DATA_SOURCES.md` §10 |

**Ingested external events land `status: live`.** These are the Chamber's (and Port's) already-published calendars, moderated upstream by their own staff; re-holding every ingested occurrence in the app's moderation queue would re-review the Chamber's own published output. The E08 hold-by-default floor governs *submissions* (member, org, and anonymous suggest paths — all of which hold as pending); ingest is aggregation of already-public data, is idempotent, and stamps `source`/`external_id` plus audit rows on every write. Rendering remains flag-gated (ship-dark) until E15 flips the unified-calendar flag.

## Consequences

- The unified `/api/feeds/events` JSON+iCal feed and the `public/embed/kingston-events.js` widget are **cutover-critical replacement infrastructure**: at R4 the whole business.kingstonchamber.com subdomain is repointed/301'd, and the kingstonchamber.com WordPress site repoints its events links and widgets to these surfaces (E12 RE-CHARTER delta 3). The feed contract is additive-only; the embed file is ask-first to touch.
- `docs/OPERATIONS.md` documents the GrowthZone-source disable procedure and its end date alongside the Tribe-wakes-up procedure (enable the source in admin; no deploy needed).
- `npm run events:probe` is the quarterly drift alarm; a changed answer (explorekingstonwa fills, the soft-404 becomes a real feed, the whole-calendar URL arrives or dies) updates the `calendar-sources` config, and this ADR's evidence table gains a row only if the *decision-relevant* facts move.
- The "AMS integration ladder" framing is historical: E16 is a one-time migration importer + native member store, E24 is cancelled, and ADR-0001's closure authorizes no API code, permanently (no `X-ApiKey`, no `api.micronetonline.com`, no `AmsProvider`).
