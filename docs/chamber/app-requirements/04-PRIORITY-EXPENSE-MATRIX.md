# Priority × Cost Matrix & Phasing

_How the consolidated epics sort by priority and implementation cost. 🔒 = contains a non-negotiable. See [05-IMPLEMENTATION-RESEARCH.md](05-IMPLEMENTATION-RESEARCH.md) for cost/effort detail._

**Date:** July 4, 2026

## Consolidated epics

| ID | Epic | Priority | Cost | Non-neg | Requested by |
|----|------|----------|------|---------|--------------|
| accurate-hours-open-now | **Bulletproof hours & 'open now' single source of truth** | 🔴 P0 | Low | 🔒 **YES** | Rosa Delgado, Carol Whitfield, Hank Boyd, Sam Okafor, Meg Sorensen, Dr. Aisha Bello, Danny Cho |
| ten-second-self-service-portal | **Ten-second, delegated, low-tech self-service portal** | 🔴 P0 | Low | 🔒 **YES** | Rosa Delgado, Carol Whitfield, Hank Boyd, Sam Okafor, Meg Sorensen, Tom Iverson, Nadia Fischer, Linda Cho-Ramirez, Dr. Aisha Bello, Marcus Reed |
| post-once-event-syndication | **Post-once, publish-everywhere events (incl. recurring)** | 🔴 P0 | Medium | 🔒 **YES** | Danny Cho, Nadia Fischer, Linda Cho-Ramirez, Marcus Reed, Priya Nair |
| ferry-timed-foot-traffic-capture | **Ferry-timed foot-traffic capture & staffing heads-up** | 🔴 P0 | Medium | — | Rosa Delgado, Danny Cho, Sam Okafor, Carol Whitfield, Meg Sorensen, Tom Iverson, Marcus Reed |
| up-the-hill-discovery-placement | **Up-the-hill discovery & fair featured placement** | 🔴 P0 | Medium | 🔒 **YES** | Carol Whitfield, Rosa Delgado, Hank Boyd, Danny Cho, Marcus Reed |
| reservations-bookings-deposits | **Reservations, bookings & deposit/card-hold to stop no-shows** | 🟠 P1 | High | 🔒 **YES** | Meg Sorensen, Rosa Delgado, Marcus Reed |
| ferry-timed-order-ahead | **Ferry-timed order-ahead & pre-order (flat-fee only)** | 🟠 P1 | High | 🔒 **YES** | Sam Okafor, Marcus Reed, Rosa Delgado |
| realtime-status-truck-taplist | **Real-time daily status: food-truck location, tap list, food-truck-today** | 🟠 P1 | Medium | 🔒 **YES** | Marcus Reed, Danny Cho |
| cross-promotion-b2b | **Business-to-business cross-promotion & bundled itineraries** | 🟠 P1 | Medium | — | Danny Cho, Meg Sorensen, Priya Nair, Nadia Fischer, Sam Okafor, Marcus Reed |
| guest-concierge-guide-offline | **Guest concierge / offline guest-guide link for lodging & STR** | 🟠 P1 | Medium | 🔒 **YES** | Jordan Blake, Priya Nair |
| resident-living-here-mode | **Resident / 'Living Here' mode & everyday-services directory** | 🔴 P0 | Medium | 🔒 **YES** | Linda Cho-Ramirez, Dr. Aisha Bello |
| trusted-local-alerts | **Trusted town-wide alerts & fast cancellation notices** | 🔴 P0 | Medium | 🔒 **YES** | Dr. Aisha Bello, Tom Iverson, Marcus Reed, Priya Nair, Hank Boyd |
| analytics-loyalty-ltac-reporting | **Owner analytics, loyalty & LTAC / grant impact reporting** | 🔴 P0 | Medium | 🔒 **YES** | Priya Nair, Danny Cho, Nadia Fischer, Carol Whitfield, Rosa Delgado, Meg Sorensen, Sam Okafor, Marcus Reed, Jordan Blake, Linda Cho-Ramirez |


## Priority × Cost grid

| Priority ↓ / Cost → | Low cost | Medium cost | High cost |
|---|---|---|---|
| **🔴 P0** | Bulletproof hours & 'open now' single source of truth 🔒<br>Ten-second, delegated, low-tech self-service portal 🔒 | Post-once, publish-everywhere events (incl. recurring) 🔒<br>Ferry-timed foot-traffic capture & staffing heads-up<br>Up-the-hill discovery & fair featured placement 🔒<br>Resident / 'Living Here' mode & everyday-services directory 🔒<br>Trusted town-wide alerts & fast cancellation notices 🔒<br>Owner analytics, loyalty & LTAC / grant impact reporting 🔒 | — |
| **🟠 P1** | — | Real-time daily status: food-truck location, tap list, food-truck-today 🔒<br>Business-to-business cross-promotion & bundled itineraries<br>Guest concierge / offline guest-guide link for lodging & STR 🔒 | Reservations, bookings & deposit/card-hold to stop no-shows 🔒<br>Ferry-timed order-ahead & pre-order (flat-fee only) 🔒 |
| **🟢 P2** | — | — | — |


## Suggested phasing

Sequenced so quick wins on the existing platform ship first and the expensive, LTAC-sensitive commerce features come last. **Enhancement** = builds on what Visit Kingston already has; **Net-new** = from scratch.

### Phase 1 — Harden the foundation (mostly enhancements, Low cost, P0)
The cheapest, highest-trust wins, almost all extending existing features.
- **Accurate hours & open-now** (enhancement): add the owner-facing same-day 'closed today / out of fuel' one-tap override with midnight-Pacific auto-expiry (reuse the boarding-pass override pattern); finish the live GBP write path.
- **Ten-second self-service portal** (enhancement): sub-account delegation, a service-business profile template, big-button/high-contrast/Spanish-friendly mobile pass.
- **Post-once event syndication** (enhancement): recurring events + self-service posting for non-restaurant members; wire the live social/GBP push (Meta ≤50-tester pilot).
- **Cross-promotion & bundled itineraries** (enhancement): member listing-to-listing links over the existing itinerary engine.
- **Analytics dashboards** (enhancement): per-owner plain-English monthly summaries + ferry-time correlation over existing privacy-first analytics.
- Validate and, once the +22 bias is corrected, cautiously enable the **ferry-timed staffing/visitor** surfaces (enhancement) — the busyness forecast already exists but is admin-gated OFF pending accuracy work.

### Phase 2 — New reach without heavy commerce (mixed, Medium cost, P0/P1)
Net-new capabilities that don't yet touch payments.
- **Resident / 'Living Here' mode & everyday-services directory** (net-new) — the winter-survival and dual-mode decision; fund from non-LTAC money.
- **Trusted local alerts & fast cancellation notices** (mixed) — requires the **PWA/offline + web-push milestone** (roadmap P0, not yet shipped); this is the phase's gating dependency.
- **Offline guest concierge guide for lodging/STR** (net-new) — depends on the same PWA/offline milestone; deep-links OTAs.
- **Real-time food-truck location / tap list / food-truck-today** (net-new, Medium) — reuses map + auto-expiry pattern.
- **LTAC / grant impact reporting & overnight/50-mile capture** (enhancement) — critical to defend the funding; slot early in this phase because everything else depends on the money staying.

### Phase 3 — Commerce & bookings (net-new, High cost, LTAC-sensitive, P1)
Last, because they're the most expensive, the most operationally heavy for owners, and the sharpest LTAC edge — ship only after city/county-attorney + LTAC pre-clearance and with per-transaction money kept off the public-funded layer.
- **Reservations, bookings & deposit/card-hold** (net-new) — with 21+ age-gating and Google Calendar sync.
- **Ferry-timed order-ahead & pre-order** (net-new) — flat-fee-only, pickup-timed to live ferry departures; preserves the seam toward the late-2027 line-side delivery vision.
- Loyalty/punch-card and resident perks (net-new, Low) can piggyback here or earlier if cheap.
