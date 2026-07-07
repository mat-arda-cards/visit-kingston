# One Kingston App — Consolidated Request from the Kingston Business Coalition

_A single, prioritized request to the Greater Kingston Chamber of Commerce, consolidated from the requirements of 13 local business leaders. Supporting docs: [personas](01-PERSONAS.md) · [per-business requirements](02-PERSONA-REQUESTS.md) · [priority×cost matrix](04-PRIORITY-EXPENSE-MATRIX.md) · [implementation research](05-IMPLEMENTATION-RESEARCH.md)._

**Date:** July 4, 2026 · **From:** The Kingston Business Coalition · **To:** Greater Kingston Chamber of Commerce

## Cover letter

Dear Greater Kingston Chamber of Commerce,

We are thirteen Kingston business owners — a family cantina, a brewery taproom, a winery tasting room, a gift boutique, a boutique inn, a short-term rental host, the fuel dock, a coffee-and-bakery, the farmers market, the Firehouse Theater, a food truck and kayak guide, a relocation broker, and a family wellness clinic. We compete for the same customers and we rarely agree on anything. We agree on this.

Build on what "Visit Kingston" already is, and make it the single, always-correct, dead-simple, free-to-us hub that turns the ferry's twelve-minute walk-on bursts into measured foot traffic and overnight stays. The bones are already here — live ferry status, a busyness forecast, verified "open now" hours, the map, the portals. We are not asking you to start over. We are asking you to finish the right things, in the right order, and to treat our shared non-negotiables as the character of the product rather than as feature requests.

Those non-negotiables, at a high level: **accuracy above everything** — never show a wrong hour, tide, or ferry time; hide it or flag it instead, because our reputations ride on it. **Trivial mobile self-service** — if a 70-year-old market volunteer or a Spanish-speaking line cook can't update a status in ten seconds from a phone, it will go stale and die like every system before it. **No per-transaction commissions** — a marketplace cut is an instant no; flat or cost-recovery only, and nothing that bills a seasonal shop while it's closed. **Sync outward, don't silo** — feed the tools we already run. And **serve residents too**, so the app has a reason to be open on a dead Tuesday in February.

We are ready to help — testing, hours verification, honest feedback. Let's build it in phases and start now.

— The Kingston Business Coalition

## Executive summary

Thirteen Kingston business owners — restaurants, a brewery, a winery, retail, two lodging operators, a marina, a coffee shop, a farmers market, an arts nonprofit, a food-truck/tour operator, a relocation broker, and a wellness clinic — converge on one message: **build on what "Visit Kingston" already has, and make it the single, always-correct, dead-simple, free-to-me hub that turns the ferry's 12-minute walk-on bursts into measured foot traffic and overnight stays.**

The strongest, most universal demands are **accuracy above all** (never show a wrong hour, tide, or ferry time — hide it or flag it instead), **trivial mobile self-service** (edit hours/status in under 10 seconds, from a phone, with delegated staff/volunteer access), and **no per-transaction commissions** (flat/low fees only; a 25–30% marketplace cut is an instant no). Ferry-timing threads through nearly every ask — staffing heads-ups, order-ahead timed to real departures, return-boat reminders, and busyness that converts day-trippers to overnight guests.

Two owners (broker, clinic) insist the app also **serve residents year-round** with a "Living Here" mode, a trusted alerts channel, and resident-serving directory categories — the antidote to a winter-dead, tourist-only app. Nonprofits (market, theater) need **volunteer signup, fast cancellation alerts, and one-click grant/impact exports**.

The consolidation below organizes 90+ stories into 14 epics, phased so quick wins ship first and expensive, LTAC-sensitive commerce features (ordering, ticketing, deposits) come last — funded on the **platform/information layer**, never on per-transaction fees to private for-profits, to keep lodging-tax money defensible under RCW 67.28.

## Shared vision

One app for Kingston. When a boat lands and 200 people walk up the strip in a twelve-minute burst, the app is what's already open in their hand — telling them, correctly, what's open right now, how busy the return boat will be, what the tide's doing at the marina, where to park, and what's happening at the market or the Firehouse tonight. It converts a day-tripper's impulse into a coffee, a flight of cider, a boutique purchase, and — the prize — a booked night at the inn or the cabin. Every listing is trustworthy because the owner keeps it true in seconds from their phone, and the platform never shows a fact it can't stand behind.

But a tourist-only app is dark half the year, and Kingston is a town before it is a destination. So the same app has a "Living Here" side: a trusted local alerts channel, resident-serving categories the broker and the clinic actually need, the market and theater calendars, the ferry planner a commuter checks every morning. That is what keeps it alive in January — and an app that's alive year-round is the one visitors find working in July.

Underneath, it's the connective tissue we can't build alone: the live WSF integration and the busyness forecast, the privacy-first analytics we each own and can export, the syndication that pushes our hours and events outward to Google, our calendars, and our booking tools instead of demanding we type everything twice. It is funded on the platform and the information — the part that's clearly tourism promotion — and never on skimming our sales, which is what keeps the lodging-tax money defensible and keeps every one of us willing to put our name on it.

## Guiding principles (coalition-wide)

These nine principles are the whole coalition's shared ground. They are not preferences — they are conditions. We ask that every epic be measured against them.

- **Accuracy is the product.** Correct-or-don't-show-it. Anything unverified is hidden or flagged, stamped with a last-verified date, and honest about stale or missing data. A wrong hour, tide, or ferry time is worse than no data — it burns the customer and our name with it.
- **Mobile-first, dead-simple, low-tech self-service.** Core edits take seconds to two minutes on a phone, with big buttons and no manual. Delegated staff and volunteer logins. If our least-technical member can't do the task alone, it won't get done — and adoption is where every prior system died.
- **No per-transaction commissions.** Percentage-of-sale cuts are an instant no. Any fee is flat, low, and ideally cost-recovery only. Nothing bills a seasonal owner while the doors are closed.
- **Sync outward, don't be a second silo.** Post once, publish everywhere. The app feeds Google Business Profile, Google Calendar, Airbnb/Vrbo, Untappd, and our socials — it does not replace them, and it never makes us enter the same thing twice.
- **Ferry-timing is the connective tissue.** The twelve-minute walk-on burst and the SR-104 queue shape nearly everything — staffing heads-ups, order-ahead timed to real departures, return-boat reminders, and busyness that converts day-trippers into overnight guests. Lean on the live WSF feed and the forecast already built.
- **Offline-capable.** Low-signal cabins and dead-connection ferry arrivals make offline a hard requirement for the guest guide and a strong want everywhere. This is the P0 that gates the guide and web-push.
- **Privacy-first, owner-owned data.** Opt-in only, no hoarding, no location tracking near the clinic. Analytics we each control and can export. Hold the line the app already took.
- **Serve residents too — survive winter.** A "Living Here" mode, resident-serving categories, and a trusted local alerts channel, so the app is useful on a quiet Tuesday in February and reframes itself from a seasonal tourist toy into a year-round town utility.
- **Low cost to members and LTAC-defensible.** Free or near-free to us, and funded on the promotion and information platform — never on per-transaction fees to private for-profits — so the lodging-tax money stays clearly within RCW 67.28.

## 🔒 Non-negotiables register

_These are the guardrails the build cannot violate. Each was a deal-breaker for one or more coalition members._

| # | Non-negotiable | Why | Insisted on by |
|---|---|---|---|
| 1 | **Accuracy above all: never display a wrong hour, tide, ferry time, or phone number — hide it or clearly flag it as unavailable/last-verified rather than guess.** | A wrong 'open' badge sends a ferry crowd to a locked door and earns undeserved bad reviews; a wrong tide or last-boat strands a guest and becomes a one-star review. A wrong badge is worse than no listing at all. | Rosa Delgado, Carol Whitfield, Hank Boyd, Priya Nair, Linda Cho-Ramirez, Marcus Reed, Dr. Aisha Bello |
| 2 | **One owner-editable source of truth for hours/status that also corrects Google and the in-app kiosk — no divergent copies.** | Owners cannot keep five sites in sync; the town screen, Google, and Yelp already contradict each other and the owner catches the blame. | Rosa Delgado, Hank Boyd, Carol Whitfield |
| 3 | **Trivially easy mobile self-service — core edits in seconds to two minutes from a phone, big buttons, no manual, no computer required.** | Tech-averse, time-poor, often seasonal owners will abandon anything that becomes a chore; if it's not trivial they won't keep it current and it goes stale. | Rosa Delgado, Carol Whitfield, Hank Boyd, Sam Okafor, Tom Iverson, Nadia Fischer, Dr. Aisha Bello, Marcus Reed |
| 4 | **Delegated access — owners can grant edit rights to family, staff, or rotating volunteers with no IT setup and no training.** | The owner is on the line or out sick; the market's info dies if only the manager can touch it; a 70-year-old volunteer must be able to take over alone. | Rosa Delgado, Tom Iverson, Nadia Fischer |
| 5 | **Free or near-free to the member — no per-order, per-cover, or per-sale commission, and no percentage-of-sale marketplace cut; flat/low fee only where any fee exists.** | A 25–30% marketplace cut exceeds the margin on a coffee-and-pastry or a $12 flight — an instant no; nonprofits and tomato-money vendors have zero budget. | Rosa Delgado, Danny Cho, Meg Sorensen, Carol Whitfield, Sam Okafor, Nadia Fischer, Tom Iverson, Marcus Reed |
| 6 | **Sync with the tools owners already run (Google Business Profile, Google Calendar, Airbnb/Vrbo, Untappd, socials) — never become a second silo to babysit.** | Every 'community platform' before this became a dead dashboard abandoned by August; double data entry is a non-starter. | Danny Cho, Meg Sorensen, Jordan Blake, Priya Nair |
| 7 | **Post-once, publish-everywhere for events, from a single entry (town calendar + GBP + socials).** | Owners currently retype the same event into four places and the town calendar is the one they forget, so it's always stale. | Danny Cho, Nadia Fischer |
| 8 | **Drive people physically into the business — discovery, directions, 'open now, X-min walk' — never an online cart that ships a retailer's sales away.** | Brick-and-mortar retail cannot out-ship Amazon and shouldn't try; foot traffic and the in-person experience are the whole point. | Carol Whitfield |
| 9 | **Real-time daily status that auto-expires — a stale/yesterday location or a lapsed 'closed' must never display as current.** | A fixed or stale pin sends people to an empty lot and the vendor gets blamed; a wrong pin is worse than no pin. | Marcus Reed, Rosa Delgado, Hank Boyd |
| 10 | **One-tap cancellation that instantly notifies everyone booked / a fast weather-cancel that reaches people within minutes and self-clears.** | Manually texting booked guests an hour before when the wind turns is impossible; people haul to an empty waterfront and blame the operator. | Marcus Reed, Tom Iverson |
| 11 | **Deposit or card-hold support on bookings, and 21+ age-gating on every alcohol-related action.** | A deposit/hold is the only thing that actually stops peak-weekend no-shows; age-gating protects the liquor license. | Meg Sorensen |
| 12 | **Order/pickup timing tied to REAL live WSF ferry departures.** | Drinks must be hot when grabbed and nobody can miss their boat waiting on an order; the app already has the live data to do this. | Sam Okafor, Rosa Delgado |
| 13 | **One shareable, OFFLINE-capable guest-guide link that deep-links the host's existing OTA listing (no re-entry).** | Cabins get one bar of signal so guests arrive with dead connections; the link pasted into check-in messaging is the entire point; photos/rules already live on Airbnb/Vrbo. | Jordan Blake |
| 14 | **Direct booking must lead for lodging — never funnel a guest to an OTA above the owner's own 'Book direct' link.** | OTA commissions bleed 15–18% of every room; the app helped generate the stay, so it must not hand it to Booking/Expedia. | Priya Nair |
| 15 | **A genuine resident 'Living Here' mode with its own home — not a bolted-on afterthought tab — plus resident-serving directory categories (medical, salon, gym, hardware, bank).** | 90% of a relocation broker's business and a clinic's patients are locals; a tourist-only app goes cold in winter exactly when local businesses still work. | Linda Cho-Ramirez, Dr. Aisha Bello |
| 16 | **A trustworthy, sourced emergency/alert channel (ferry, road, power, emergency) locals can rely on, readable with no login.** | When the ferry goes down or power's out there's no trusted local channel and rumor fills the gap; owners need something they can tell patients and staff to trust. | Dr. Aisha Bello, Tom Iverson, Priya Nair |
| 17 | **Strict, plainly-stated, privacy-first data practice — no data hoarding, opt-in only, no location tracking near clinics, no turning patients/guests into tourism marketing data; analytics owner-controlled and exportable.** | A health-adjacent business won't feed patient behavior into tourism analytics; owners want analytics they own and control, not a platform that harvests them. | Dr. Aisha Bello, Danny Cho, Priya Nair |
| 18 | **Big, high-contrast, legible text everywhere.** | An older boater/owner can't read small type in the sun on the water; if he can't read it, he and his customers won't use it. | Hank Boyd |
| 19 | **Simple and Spanish-friendly owner-side (and no ongoing upkeep treadmill).** | The owner and half her staff are Spanish-speaking; English-only tools buried in menus get abandoned. | Rosa Delgado |
| 20 | **Defensible, privacy-first overnight-stay and 50-mile-visitor data anchored to the statutory tourist definition, plus exportable attendance/volunteer-hour data for grant reports.** | The lodging tax pays for the app; without defensible overnight/50-mile ROI data the Chamber's LTAC reports are hand-waving and the funding (and the app) is at risk; nonprofits need clean numbers grant reviewers accept. | Priya Nair, Nadia Fischer, Linda Cho-Ramirez |
| 21 | **Near-zero, seasonal-safe upkeep — no fee or maintenance burden that hits when a seasonal business is closed, and the Chamber keeps town content fresh.** | Weather-dependent, seasonal operators can't pay a January bill or babysit software off-season; owners should touch only their own handful of fields. | Jordan Blake, Marcus Reed, Tom Iverson, Priya Nair |

**Additional guardrails recommended by review (should also be treated as non-negotiable):**
- 🔒 Every displayed fact carries visible provenance and a 'last verified' timestamp, and anything past a defined staleness threshold is auto-flagged or hidden — accuracy must be enforceable, not aspirational.
- 🔒 WCAG 2.2 AA is the minimum conformance target for the visitor app AND the physical kiosk; accessibility is a launch gate, not a polish item.
- 🔒 Public LTAC money funds only the information/marketing/platform layer; any per-transaction or private-for-profit commerce feature must be funded from a separate, clearly-segregated non-LTAC source and pre-cleared with the LTAC committee and county/city attorney.
- 🔒 No consumer-health-data collection or inference and no location tracking near any health, clinic, salon, or wellness facility — WA My Health My Data Act compliance is a hard constraint, with documented consent and deletion paths.
- 🔒 Emergency and cancellation alerts must have a named authoritative source, an authorized-poster policy, mandatory geographic + temporal scoping with auto-expiry, and a plain disclaimer; no unsourced or non-expiring alert may ever publish.
- 🔒 No single point of failure for a town-relied-upon public asset: a second maintainer/administrator and a documented hand-off/runbook must exist before the app is promoted as an emergency-info channel.
- 🔒 A written, published listing-and-placement governance policy (who's listed, who approves, how featured placement is decided, how disputes and closures are handled) must exist before any promoted/featured placement ships — no pay-to-play that isn't disclosed.
- 🔒 The visitor-facing app must offer Spanish at minimum, not just a Spanish-friendly owner side.
- 🔒 No end-user or member data is sold, shared with ad networks, or repurposed for third-party marketing; a plain-language privacy policy, retention schedule, and user/member export-and-delete are shipped from day one.
- 🔒 Card details for deposits/holds are never stored by the app — a PCI-compliant processor holds them — and no alcohol-related action proceeds without a verifiable 21+ gate.
- 🔒 Practical civic-info layers (restrooms, drinking water, ATM/cash, gas/propane, EV charging, accessible parking) are core content the Chamber keeps fresh, not member-dependent — they must never go stale because a business closed.
- 🔒 The app must degrade safely and truthfully with no signal (mid-Sound) and under ferry-burst load: cached data is clearly labeled as cached/last-known, and nothing cached is presented as live.

## Consolidated feature epics

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


### Bulletproof hours & 'open now' single source of truth `P0` · `Cost: Low` · 🔒 **non-negotiable** · _enhances existing app_

One owner-editable source of truth for hours, holiday closures, and today's status that also feeds Google Business Profile and the in-app kiosk, so a visitor never sees 'open' at a locked door. The app must show an 'open now, X-min walk from the ferry' state and hide or flag any datum it can't confirm is current.

- **Requested by:** Rosa Delgado, Carol Whitfield, Hank Boyd, Sam Okafor, Meg Sorensen, Dr. Aisha Bello, Danny Cho
- **Done when:** An owner can set regular hours, a holiday closure, and a same-day 'closed early / closed today / out of fuel' override that auto-expires at midnight Pacific.; The 'Open now' badge and walk-time-from-ferry render only from the verified hours record; edits propagate to the public app within ~60 seconds.; Any field the system cannot confirm current is hidden or shown with a plain 'unavailable / last verified [date]' rather than a guessed value.; A single hours edit syndicates outward to Google Business Profile and the in-app kiosk with no re-entry.
- **Notes:** Core exists: verified open-now badges, restaurant/lodging listings, admin/business portal editing, and a GBP sync plan (docs/SYNDICATION.md). Enhancements needed: an owner-facing same-day one-tap 'closed today/out of fuel' toggle that auto-lapses (the boarding-pass override already models the Pacific-day auto-expiry pattern), and finishing the live GBP write path. Squarely LTAC-fundable as tourism information.

### Ten-second, delegated, low-tech self-service portal `P0` · `Cost: Low` · 🔒 **non-negotiable** · _enhances existing app_

A mobile-first owner portal simple enough that a tech-averse or 70-year-old user edits hours, status, menu, or listing in under two minutes with big buttons and no manual — and can delegate that access to a daughter, trusted employee, or rotating volunteer without IT setup. Fits service businesses (broker, clinic) not just restaurants.

- **Requested by:** Rosa Delgado, Carol Whitfield, Hank Boyd, Sam Okafor, Meg Sorensen, Tom Iverson, Nadia Fischer, Linda Cho-Ramirez, Dr. Aisha Bello, Marcus Reed
- **Done when:** An owner can grant and revoke edit access to a second person (staff, family, volunteer) in minutes without contacting the Chamber.; Every core edit (hours, closure, status, menu item, description) is completable on a phone in under two minutes with large touch targets.; The portal offers a service-business profile shape (area served, contact) distinct from the restaurant/storefront shape.; Handoff to a brand-new volunteer requires no training doc to update the weekly market lineup or a market cancellation.
- **Notes:** Core exists: invite-based multi-role auth, business/nonprofit/admin portals editing listings/hours/events/volunteer shifts over JSON overlays, /portal/account self-service. Enhancements: sub-account delegation/role scoping per listing, a service-business profile template, and a ruthless mobile-simplicity pass. Foundational, cheap, unlocks nearly every other epic. LTAC-fundable as platform.

### Post-once, publish-everywhere events (incl. recurring) `P0` · `Cost: Medium` · 🔒 **non-negotiable** · _enhances existing app_

Enter an event one time and have it become the authoritative record that syndicates to the town calendar, Google Business Profile, and social channels, with recurring events (Trivia Tuesdays) as a single repeating entry. Kills the 'I type trivia night into four places' problem and stale, contradictory listings.

- **Requested by:** Danny Cho, Nadia Fischer, Linda Cho-Ramirez, Marcus Reed, Priya Nair
- **Done when:** A single event entry appears on the town calendar and map and pushes to the owner's GBP and social channels.; A recurring event is created as one repeating entry, not 52 manual copies, and can be edited or cancelled in one place.; The app's calendar is presented as the authoritative source; syndicated copies reflect edits within a defined sync window.; Service businesses (e.g. a broker's open house, a flu-clinic day) can post to the same calendar/map.
- **Notes:** Core exists: events calendar, portal event editing, public JSON/iCal feeds, embed widget, GBP/Meta sync plan. Enhancements: recurring-event modeling, live social push (Meta pilot ≤50 testers per SYNDICATION.md), and self-service posting for non-restaurant/nonprofit members. High reach, strong LTAC 'tourism promotion' fit.

### Ferry-timed foot-traffic capture & staffing heads-up `P0` · `Cost: Medium` · _enhances existing app_

Use the live WSF feed and existing busyness forecast to (a) give owners a ~10-minute heads-up before a busy boat unloads so they can staff up, and (b) surface to just-arrived walk-ons which nearby spots are open right now and worth the walk in their 12-minute window. Turns unpredictable bursts into measurable walk-ins.

- **Requested by:** Rosa Delgado, Danny Cho, Sam Okafor, Carol Whitfield, Meg Sorensen, Tom Iverson, Marcus Reed
- **Done when:** An opted-in owner receives a heads-up a configurable lead time before a boat forecast as busy is due to land.; A just-arrived visitor view lists open-now nearby spots with walk time from the dock and 'get back before your return ferry' framing.; The staffing heads-up and visitor nudge both draw from the existing live WSF data and busyness forecast, labeled as an estimate.; Owners can see the predicted rush lined up against the ferry schedule to plan bake/staffing.
- **Notes:** Core exists: live ferry status, calibrated busyness forecast (currently admin-gated OFF pending accuracy backtest — bias ~+22, over-predicts; validate before enabling), 'near me' discovery, ferry reminders. Enhancements: owner-facing staffing alerts and a post-ferry 'what's open now' visitor surface. The forecast accuracy caveat is real — do not ship staffing alerts on a model that over-predicts. LTAC-fundable as visitor information.

### Up-the-hill discovery & fair featured placement `P0` · `Cost: Medium` · 🔒 **non-negotiable** · _enhances existing app_

Make off-the-strip and up-the-hill businesses discoverable to walk-ons who assume 'everything is at the dock,' via open-now + walk-time discovery, fair rotating/featured placement, and active 'explore beyond the dock' nudges with quick loops. Drives physical visits, never an online cart.

- **Requested by:** Carol Whitfield, Rosa Delgado, Hank Boyd, Danny Cho, Marcus Reed
- **Done when:** Walk-on discovery surfaces up-the-hill businesses alongside dockside ones with walking time and open-now status.; Featured/promoted placement rotates fairly among members rather than auctioning to the highest bidder.; The app actively suggests 'you have time before your ferry — explore beyond the dock' with 1–2 quick walking loops.; Discovery drives directions/tap-to-call/visit, never an online checkout that ships a retailer's sales away.
- **Notes:** Core exists: map, wayfinding, 'near me', itineraries/hunts (the 'quick loops' primitive). Enhancements: an explicit up-the-hill discovery surface and a FAIR rotation model. Placement fairness is a live tension (see conflicts) — Chamber-curated rotation, not paid ad-bidding, both keeps it equitable for tiny members and keeps it clean for LTAC (public money promoting all members, not selling ad slots). The /eat copy already reframed to an 'up-the-hill band' vs 'near-ferry' band.

### Reservations, bookings & deposit/card-hold to stop no-shows `P1` · `Cost: High` · 🔒 **non-negotiable**

Let visitors reserve a tasting, table waitlist slot, or kayak tour, with an optional deposit or card hold to end peak-weekend no-shows, capacity caps to spread the post-ferry rush across time blocks, and calendar sync to the tool owners already use. Includes 21+ age-gating for anything alcohol-related.

- **Requested by:** Meg Sorensen, Rosa Delgado, Marcus Reed
- **Done when:** A visitor can book a tasting or tour slot and leave a deposit or card hold; the owner sees a confirmed, legible booking.; Every alcohol-related action (tasting booking, wine-club signup, purchase) requires a 21+ age confirmation.; Bookings, holds, and cancellations sync to the owner's existing Google Calendar with no second system to babysit.; Owners can cap slots per time block and show 'seats now vs. reserve for later' to throttle the 12-minute flood.; Booking uses a flat/near-zero member cost — no per-cover or per-booking commission.
- **Notes:** Net-new and highest-cost. The deposit/card-hold and any payment rail implicate LTAC exposure: a booking DEPOSIT that flows to a private for-profit is riskier than the informational booking form. SAFE PATH: fund the platform (booking UI, calendar sync, age-gate) with LTAC; keep per-transaction money off the public-funded layer, or route deposits via the member's own payment processor. Flat-fee only is non-negotiable (Meg will not support a tool that skims pours). Age-gating protects liquor licenses.

### Ferry-timed order-ahead & pre-order (flat-fee only) `P1` · `Cost: High` · 🔒 **non-negotiable**

Order-and-pay-ahead for coffee/bakery, food truck, and to-go, with the 'ready by' time tied to the real next ferry departure so drinks are hot and nobody misses the boat, and a gentle nudge to opted-in commuters minutes before their boat. Explicitly flat/low per-order fee — never a percentage of the sale.

- **Requested by:** Sam Okafor, Marcus Reed, Rosa Delgado
- **Done when:** A commuter can order and pay ahead; the merchant sees the order without babysitting a screen mid-rush.; The order's 'ready by' time is derived from the live WSF next-departure data the app already has.; Opted-in commuters get a pre-boat nudge to order ahead in the ~15-minute window before they walk to the terminal.; The fee model is flat or low per-order with zero percentage-of-sale commission.
- **Notes:** Net-new, high-cost, and the sharpest LTAC edge: an ordering module channels visitor spend to individual private for-profits (gift-of-public-funds / picking-winners exposure per the ltac-funding note). SAFE PATH: fund the PLATFORM/discovery/deep-link layer with LTAC, keep public money OFF per-transaction fees; a flat per-order fee should be cost-recovery to the payment processor, not Chamber margin. Sam's 25–30% marketplace cut is an instant no; flat-fee is the whole point. Pickup-timing reuses live ferry data (already built). Aligns with the late-2027 line-side delivery vision — preserve the seam.

### Real-time daily status: food-truck location, tap list, food-truck-today `P1` · `Cost: Medium` · 🔒 **non-negotiable**

Let mobile and fast-changing vendors broadcast TODAY's location, hours, and open/sold-out/cancelled status from a phone in seconds, shown on the map where the truck actually is — with auto-expiry so it never displays yesterday's pin. Includes a live tap list and a 'food truck here today' slot for the taproom.

- **Requested by:** Marcus Reed, Danny Cho
- **Done when:** A vendor sets today's location/hours/status in seconds; the map shows the real location, not a fixed home base.; Status auto-expires/resets so a stale location never displays as current (a wrong pin is worse than no pin).; A taproom can publish a live, easy-to-update tap list and a 'food truck today' slot the truck can also update.; One-tap 'cancelled/sold-out' immediately reflects everywhere the vendor is shown.
- **Notes:** Net-new for real-time location; reuses the map, portal, and the Pacific-day auto-expiry pattern already proven in the boarding-pass override. Low ongoing cost, high value for the seasonal/weather-dependent vendors who refuse upkeep burden. LTAC-fundable as visitor information. Ties into cross-promotion (truck status showing on the brewery's listing).

### Business-to-business cross-promotion & bundled itineraries `P1` · `Cost: Medium` · _enhances existing app_

Let members link their listing to complementary nearby businesses (brewery ↔ food, tasting ↔ dinner, inn ↔ show, truck ↔ host venue) and let the Chamber bundle 'Arts Night', 'stay + do', and pairing loops into single itineraries — so an evening reads as one coordinated downtown experience that keeps visitor spend in Kingston.

- **Requested by:** Danny Cho, Meg Sorensen, Priya Nair, Nadia Fischer, Sam Okafor, Marcus Reed
- **Done when:** A member can link their listing to complementary businesses, and the link can be reciprocal.; The Chamber can assemble a multi-business itinerary (e.g. tasting → dinner → show) surfaced as one 'evening in Kingston'.; A food truck's 'out tonight at [venue]' status appears on the host venue's listing and events.; Lodging can bundle rooms with tonight's events and nearby restaurants into a 'stay + do' suggestion.
- **Notes:** Core exists: itineraries/hunts engine and admin itinerary builder. Enhancements: member-controlled listing-to-listing links and reciprocal cross-promo. Strong LTAC fit (keeps spend in town, promotes all members equally) and directly addresses the 'we don't coordinate' pain shared across owners. Low incremental cost on top of the existing itinerary primitive.

### Guest concierge / offline guest-guide link for lodging & STR `P1` · `Cost: Medium` · 🔒 **non-negotiable**

A shareable guest-guide link (and printable QR poster) that lodging and short-term-rental hosts paste into check-in messages — covering ferry how-to, busyness, parking, wifi, checkout, last boat, tides, and curated eat/do picks — that works offline at low-signal cabins, deep-links the host's existing Airbnb/Vrbo listing, and exposes a few private host-editable fields. Deflects repeat guest questions with near-zero host upkeep.

- **Requested by:** Jordan Blake, Priya Nair
- **Done when:** A host gets one shareable link + printable QR poster to paste into Airbnb/Vrbo check-in messaging.; The guide keeps working offline once loaded, so a guest arriving with no signal still finds the ferry, town, and their unit.; The host deep-links an existing OTA listing and edits only a few private fields (wifi code, check-in steps, unit quirks) — no re-entering photos/rules.; Town content (ferry, hours, tides) stays fresh via the Chamber; the host maintains their handful of fields maybe twice a year and gets a drift alert if their own field goes stale.
- **Notes:** Requires the offline/PWA milestone (P0 on the existing ROADMAP-V2 but NOT yet shipped) — the offline requirement is the gating dependency and is genuinely load-bearing for the low-signal cabins. Reuses existing ferry how-to, busyness, map, and curated content. Airbnb = deep links only (no API — confirmed in data-sources). LTAC-fundable as visitor information + it strengthens the overnight-stay story lodging owners need.

### Resident / 'Living Here' mode & everyday-services directory `P0` · `Cost: Medium` · 🔒 **non-negotiable**

A genuine resident home in the app — distinct from the visitor experience — with a 'Living Here' relocation section (schools, utilities, medical, community), an honest commute-to-Seattle reality page, neighborhood guides, a visitor-to-resident bridge, resident-serving directory categories (medical, salon, gym, hardware, bank), a light community board, and resident perks. The antidote to a winter-dead, tourist-only app.

- **Requested by:** Linda Cho-Ramirez, Dr. Aisha Bello
- **Done when:** The app has a resident home distinct from the visitor experience, worth opening on an ordinary Tuesday.; A 'Living Here' section covers schools, utilities, medical/dental, worship, community groups, each with a last-verified date and accountable owner.; An honest ferry-commute reality page uses live WSF schedule, walk-on vs drive-on patterns, parking, and cancellation history — not sugar-coated.; The directory includes health, personal-care, fitness, and everyday-service categories as first-class, and brokers can post open houses/listings to the calendar/map.; A 'Loved your visit? Thinking about moving here?' bridge flips a delighted day-tripper to resident content.
- **Notes:** Largely net-new. This is the biggest scope-shaping decision: two owners make resident mode a non-negotiable, and it directly conflicts with the tourist-only default (see conflicts). LTAC CAUTION: resident/relocation content serves LOCALS and is generally NOT an allowable lodging-tax use (it's economic development / local convenience, the wrong framing per the ltac note). Fund resident mode from Chamber general/membership funds or another grant, and keep the LTAC-funded tourism layer accounted separately. The honest-commute page reuses the live WSF data and cancellation history already collected.

### Trusted town-wide alerts & fast cancellation notices `P0` · `Cost: Medium` · 🔒 **non-negotiable** · _enhances existing app_

A single trustworthy, sourced local alert channel for ferry outages, SR-104 closures, power outages, boil-water/emergency info, plus fast owner/manager-fired cancellation alerts (market weather-cancel, kayak-tour wind-cancel, closed-today) that reach people within minutes, notify everyone booked, and clear themselves after the day. Something owners can tell patients, guests, and staff to rely on instead of Facebook rumor.

- **Requested by:** Dr. Aisha Bello, Tom Iverson, Marcus Reed, Priya Nair, Hank Boyd
- **Done when:** A sourced alert feed covers ferry/road/power/emergency events with a visible source and timestamp; no login required to read it.; A market manager or vendor can fire a 'CANCELLED today / short hours' alert in a couple taps that reaches people within minutes and auto-clears after the day.; A one-tap tour/night cancellation instantly notifies everyone who booked — no manual individual texts.; Alerts are honest about stale/missing data and never invent a status.
- **Notes:** Partly enabled: ferry service alerts + boarding-pass banners already surface, and ferry reminders exist; web push is DEFERRED to the PWA milestone (the delivery mechanism for 'reaches people in minutes' is the gating dependency). Net-new: the broader town-wide alert channel and the fired-cancellation flow. The ferry/road/emergency alert channel is clean LTAC (visitor safety/information); resident-emergency use overlaps resident mode's funding caveat. Sourcing/accuracy is the hard part — must cite official sources or say 'unavailable'.

### Owner analytics, loyalty & LTAC / grant impact reporting `P0` · `Cost: Medium` · 🔒 **non-negotiable** · _enhances existing app_

Two linked needs: (1) plain-English, privacy-first per-listing analytics owners will actually read — views, direction taps, tap-to-call, waitlist/RSVP, ideally correlated to ferry-arrival times and local-vs-visitor split — plus simple digital loyalty/punch cards and resident perks; and (2) defensible, exportable overnight-stay / 50-mile-visitor and attendance/volunteer-hour data the Chamber drops into LTAC and arts-grant reports.

- **Requested by:** Priya Nair, Danny Cho, Nadia Fischer, Carol Whitfield, Rosa Delgado, Meg Sorensen, Sam Okafor, Marcus Reed, Jordan Blake, Linda Cho-Ramirez
- **Done when:** Each owner sees a simple monthly summary of views, direction taps, tap-to-call, and waitlist/RSVP for their listing, readable in a couple minutes.; Engagement can be correlated against ferry-arrival times and give a rough local-vs-visitor split, privacy-first and exportable.; The Chamber can one-click export attendance, ticketing, volunteer-hours, and overnight/50-mile signals for any date range in a grant-reviewer-acceptable form.; Overnight-impact and 50-mile signals are anchored to the statutory tourist definition (paid overnight lodging OR 50+ miles one-way) and privacy-first.; A simple digital loyalty punch card and resident perk are available without paper cards.
- **Notes:** Core exists: privacy-first analytics (pageviews, coarse IP-geo, outbound clicks, opt-in block-rounded GPS), Bainbridge competitor teardown validated the privacy posture. Enhancements: per-owner dashboards, ferry-time correlation, local-vs-visitor split, grant-export tooling, overnight/50-mile signal capture, and loyalty. The overnight/50-mile data is CRITICAL — it's what keeps the LTAC funding (and therefore the whole app) defensible. Keep privacy strict for the health-adjacent clinic (no location tracking near clinics; no login for alerts/board).

## Priority × Cost matrix

| Priority ↓ / Cost → | Low cost | Medium cost | High cost |
|---|---|---|---|
| **🔴 P0** | Bulletproof hours & 'open now' single source of truth 🔒<br>Ten-second, delegated, low-tech self-service portal 🔒 | Post-once, publish-everywhere events (incl. recurring) 🔒<br>Ferry-timed foot-traffic capture & staffing heads-up<br>Up-the-hill discovery & fair featured placement 🔒<br>Resident / 'Living Here' mode & everyday-services directory 🔒<br>Trusted town-wide alerts & fast cancellation notices 🔒<br>Owner analytics, loyalty & LTAC / grant impact reporting 🔒 | — |
| **🟠 P1** | — | Real-time daily status: food-truck location, tap list, food-truck-today 🔒<br>Business-to-business cross-promotion & bundled itineraries<br>Guest concierge / offline guest-guide link for lodging & STR 🔒 | Reservations, bookings & deposit/card-hold to stop no-shows 🔒<br>Ferry-timed order-ahead & pre-order (flat-fee only) 🔒 |
| **🟢 P2** | — | — | — |


_Full table + phasing in [04-PRIORITY-EXPENSE-MATRIX.md](04-PRIORITY-EXPENSE-MATRIX.md)._

## Suggested phased rollout

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

## Cross-cutting themes

Nearly every owner, independently, converged on the same handful of demands. These are not feature requests — they are the character of the product, and they should be treated as global constraints on every epic.

- **Accuracy is the product.** Seven owners made "never show a wrong hour/tide/ferry time" a non-negotiable. The recurring rule is *correct-or-don't-show-it*: hide or flag anything unverified, stamp it with a last-verified date, and be honest about stale/missing data. The reputation of every member rides on it. The existing app already leans this way (verified open-now badges, timestamped ferry data, the Bainbridge-validated "never persist raw geolocation" posture) — hold that line everywhere.
- **Mobile-first, dead-simple, low-tech self-service.** The Kingston member is tiny, owner-operated, time-poor, and mixed-skill. Edits must be seconds-to-two-minutes on a phone with big buttons and no manual. If a 70-year-old volunteer or a Spanish-speaking cook can't do the core task alone, it won't get used. Every prior "system" collapsed on adoption; simplicity is the difference between live and stale.
- **No per-transaction commissions; free/near-free to the member.** Eight owners reject percentage-of-sale cuts outright. Where any fee exists it must be flat/low, and ideally cost-recovery only. Seasonal owners also reject any bill that lands when they're closed.
- **Don't be a second silo — sync outward.** The app must feed the tools owners already run (GBP, Google Calendar, Airbnb/Vrbo, Untappd, socials) rather than replace them. Post-once/publish-everywhere and no double data entry recur across restaurants, brewery, winery, lodging, and STR.
- **Ferry-timing is the connective tissue.** The 12-minute walk-on burst and the SR-104 queue shape nearly every ask: staffing heads-ups, order-ahead timed to real departures, return-boat reminders, busyness that converts day-trippers to overnight guests, and market/tour timing. The live WSF integration and busyness forecast already built are the platform's crown jewels — lean on them.
- **Offline capability.** Low-signal cabins and dead-connection arrivals make offline a hard requirement for the guest guide and a strong nice-to-have everywhere. This is the P0 PWA milestone already on the roadmap but not yet shipped — it gates the guest guide and web-push alerts.
- **Privacy-first, owner-owned data.** Opt-in only, no hoarding, no location tracking near clinics, analytics the owner controls and can export. Already the app's posture; the health-adjacent clinic makes it explicit and strict.
- **Serve residents, not just tourists — and survive winter.** Two owners insist on a resident "Living Here" mode, resident-serving directory categories, and a trusted alert channel, so the app has a reason to be open on a quiet Tuesday in February. This reframes the app from a seasonal tourist toy to a year-round town utility.
- **Seasonality.** Peak Jun 14–Sep 19, July 4 the single busiest day, winter quiet. Features must handle burst load in season and give owners a reason to keep the app alive off-season.

## Tensions & recommended resolutions

Real tensions exist between owners' asks. Each needs a deliberate ruling, not a fudge.

**1. Featured/promoted placement fairness vs. tiny-member equity.** Carol (up-the-hill retail) wants featured placement so off-strip shops get discovered; every tiny member fears a pay-to-play auction they can't afford, and Rosa/Hank/Tom demand free. *Resolution:* Chamber-curated **fair rotation** by proximity/open-now/category relevance — never ad-bidding. Featured slots rotate among all open, in-context members. This keeps it equitable AND keeps LTAC clean (public money promotes all members, not sells ad inventory to the highest bidder).

**2. "Must be free to me" vs. real-cost commerce features (ordering, ticketing, deposits, direct-booking).** Order-ahead, low-fee ticketing, and deposit/card-holds have real payment-processing and build costs, yet flat/near-zero-to-member is non-negotiable. *Resolution:* Split the stack. LTAC/Chamber funds the **platform layer** (the UI, the ferry-timed logic, calendar/GBP sync, age-gate). Any unavoidable per-transaction cost is **processor cost-recovery routed through the member's own processor**, never Chamber margin and never a percentage cut. Present paid tiers on merit (per the LTAC-funding note) but keep public money off private-transaction fees.

**3. LTAC restriction vs. resident/relocation and private-commerce features.** Two owners demand resident mode; three commerce owners want ordering/booking. But lodging-tax money is restricted to tourism *promotion*, and both resident content (local convenience/economic development) and per-restaurant transaction fees (gift-of-public-funds exposure) sit outside or at the risky edge of allowable use. *Resolution:* **Fund by layer and account separately.** LTAC pays the tourism-information platform (discovery, events, ferry info, overnight/50-mile data). Resident mode is funded from Chamber general/membership or a different grant. Commerce features keep public money strictly on the platform/discovery/deep-link layer, never on per-transaction fees. Get city/county-attorney + LTAC pre-clearance before shipping any commerce module.

**4. Resident-mode vs. tourist-focus for the app's identity.** Priya, Danny, and the visitor-facing owners want the app pointed at ferry riders; Linda and Aisha say a tourist-only app goes cold in winter and ignores 90% of some members' business. *Resolution:* **Dual-mode, shared spine.** A visitor home and a resident home over the same listings/hours/events/map/alerts data, with a "Thinking about moving here?" bridge between them. Residents get more reasons to keep it installed, which also improves the visitor data. Not either/or.

**5. Order-ahead/upsell vs. "drive people INTO my shop, never ship sales away."** Sam/Marcus want in-app pre-order-and-pay; Carol insists retail must stay foot-traffic-only with no online cart. *Resolution:* These don't actually collide — **order-ahead is opt-in per member and only for pickup-at-the-counter** (food/coffee/truck), tied to the ferry so it still pulls people to the physical door. Retail like Carol's simply doesn't enable it; discovery/directions remain the mechanism for shops. No member is ever forced into a sell-online model.

**6. Direct-booking prominence (lodging) vs. neutral platform.** Priya insists her 'Book direct' link outrank OTAs. *Resolution:* Honor it — lead every lodging listing with the owner's direct link; OTA links, if shown at all, sit below. This costs the app nothing and aligns with the "free/no-commission-to-member" ethos.

**7. Push-notification desire vs. privacy/no-login/opt-in.** Alerts, staffing heads-ups, and commuter nudges all want to reach people proactively, while the clinic demands no tracking and no login for alerts. *Resolution:* All proactive messaging is **opt-in**, alerts are **readable with no login**, and no location is persisted near clinics. Web push waits for the PWA milestone; until then use calendar reminders + in-app banners (the current ferry-reminder pattern).

## Gaps & recommendations (completeness review)

The 13 epics and 21 non-negotiables cover the **owner-facing** product well. The gaps cluster in four areas: **stakeholders no owner speaks for**, **the practical town-info layer**, **the legal/governance/funding scaffolding under the features**, and **the non-functional promises that are asserted but not specified.**

### 1. Missing voices skew the requirements toward paid owners
Every persona monetizes something, so the highest-frequency ferry-rider needs have **no advocate**: restrooms, water, ATM/cash (only one 24-hr ATM in town, and the tollbooth is cash-friendly), gas/propane/ice, EV charging, dog-relief, accessible parking. Also unrepresented and material: **the Port Gamble S'Klallam Tribe** (a sovereign government and major lodging/casino tourism driver), **WSF/WSDOT and the Port of Kingston** (whose data and rules the app republishes), **emergency services** (who must validate the alert channel), **the LTAC/county funder**, and **accessibility, senior, non-English, and car-free visitors**. Recommendation: add a "civic/practical info" content track the Chamber owns directly, and open stakeholder conversations with the Tribe, WSF, the Port, and NKF&R before build.

### 2. Highest-value missing feature: the return trip
Arrival capture is covered; the **mirror — "time to head back to the dock," next departures to Edmonds, and a leave-by nudge — is not.** Every walk-on burst reverses in hours, a missed boat is the top visitor pain, and the ferry data + prediction + ICS reminder plumbing already exists. This is the strongest P0 add and mostly assembly.

### 3. The scaffolding under the features is missing
Several non-negotiables imply machinery nobody specified:
- **Accuracy** needs a *mechanism* — visible "last verified," auto-staleness, and a crowd "report a problem" path — or it's unenforceable for seasonally-dark owners.
- **Alerts** need a source-of-truth, authorized-poster policy, scoping/auto-expiry, and a disclaimer; web-push is currently *deferred*, so the "reaches people in minutes" promise is unbacked.
- **Featured placement + B2B bundling** need a written governance/fairness ruleset, or the Chamber invites favoritism claims — sharpened because public money builds the surface.
- **Bookings/deposits/order-ahead** need a PCI processor, a liability position, and a **separate, non-LTAC funding source**: these channel spend to private for-profits, the exact "gift of public funds" exposure already flagged in the project's LTAC analysis.
- **Onboarding** — how a tech-averse seasonal owner gets from zero to their first edit (claim-from-the-166-Qwick-listings, assisted/concierge setup) — is the single biggest driver of whether the app is alive or empty, and it's unspecified.

### 4. Non-functional promises need real specs
WCAG 2.2 AA (app **and** kiosk), a concrete offline/PWA cache-and-labeling contract for the mid-Sound dead zone, visitor-side Spanish, **WA MHMDA** compliance for the clinic/wellness listings, content moderation, uptime/on-call ownership for July 4, multi-year TCO, and — most acutely — the **single-maintainer bus factor**: a Chamber-owned public asset told to residents as an emergency channel cannot depend on one volunteer.

### Top conflicts to resolve before scoping
1. **"Free to me" vs paid transaction features** — decide who absorbs processor fees.
2. **LTAC scope** — segregate platform (fundable) from commerce and the resident "Living Here" directory (not tourism, not LTAC-fundable) with distinct funding stories.
3. **Over-scoping** — 5 P0 epics plus kiosk, offline, multilingual, and payments for a 2,500-person town on one maintainer risks the "near-zero upkeep" promise it makes. Sequence ruthlessly; ship the information layer first.

**Stakeholders we should still consult:** Gas station / convenience / fuel retail (the Kingston fuel stop + convenience — 'where's gas/propane/ice/ATM before the boat' is a top ferry-rider query; not represented despite Hank covering only MARINE fuel)., Pharmacy / drugstore (no pharmacy persona; residents in 'Living Here' mode and visitors needing a prescription have no voice — the resident directory lists 'medical' but nobody speaks to Rx/urgent needs)., Bank / ATM operator (memory confirms only ONE 24-hr ATM in town, BofA drive-up at Kingston Center — a top 'need cash before the cash-only tollbooth' query; no persona owns 'is the ATM up / where's cash')., Port Gamble S'Klallam Tribe & tribal enterprises (casino, Point Casino/Hotel, tribal-owned lodging/dining, cultural tourism) — a MAJOR nearby overnight-lodging and tourism driver and a sovereign-government stakeholder; completely absent., Washington State Ferries / WSDOT itself (the single largest traffic driver on the whole route is not a consulted stakeholder — data licensing, terminal-signage co-marketing, official-status expectations, liability if the app misstates a sailing)., Port of Kingston (marina/parking authority, landlord of the waterfront, overnight-parking gatekeeper 'call the Port first') — a public stakeholder whose rules the app republishes; no seat at the table., City/County / Kitsap County + LTAC committee (the FUNDER and the body that legally approves what public money builds — not a persona but its constraints must shape scope; also county roads/parking-enforcement authority)., Emergency services / Kingston fire (NKF&R), Sheriff, Poulsbo hospital referral (the alert channel promises 'trusted emergency info' but no emergency/public-safety stakeholder validates sourcing, escalation, or liability)., Grocery / pantry-run retail (Grocery Outlet + Kingston Center anchor tenants — huge foot-traffic magnet and a 'what's open, do I have time before the boat' query; no grocery voice)., Accessibility / disabled-visitor advocate & senior residents (ADA/WCAG needs, wheelchair-accessible venues/restrooms/parking, ferry-accessibility, large-text — Kingston skews older; no persona speaks for low-vision, mobility, or cognitively-impaired users beyond a generic 'big text' note)., Non-English-speaking visitor/worker & Spanish-dominant kitchen/service staff (Rosa's restaurant is named as Spanish-friendly OWNER-side, but no VISITOR-side multilingual persona, and no persona for Spanish-first employees who'd do the delegated editing)., Pet / dog-owner services (dog-friendly patios/beaches/trails, off-leash areas, vet/boarding) — a common ferry-daytripper and boater filter with zero representation., Outdoor / trail / beach / public-lands steward (Kingston beaches, Kola Kole Park, trails, tide-flat access, kayak launch — Marcus touches kayak charter but no one owns public natural-asset info, tide safety, or Leave-No-Trace)., Faith / civic / service org & schools (churches, Rotary/Lions, library, school events fill the community calendar and are frequent 'is this cancelled' alert consumers; no non-Firehouse civic voice)., Transit rider without a car (Kitsap Transit bus + fast-ferry-only foot passenger — the 'I'm car-free, how do I get from the dock to up-the-hill' persona; Marcus/Sam touch it but no dedicated car-free-visitor voice)., Boater/transient-moorage visitor as a GUEST (Hank is the fuel-dock OPERATOR; no persona is the visiting boater who needs guest moorage, pump-out, provisioning, weather/tides, and dinghy-to-town wayfinding)., Property/vacation-rental manager & HOA / neighbor-impact voice (Jordan is a 2-cabin side-gig host; a professional multi-unit STR manager and the neighborhood-nuisance/regulation angle — STR caps, quiet hours — are absent)..

**Requirements no member raised but that matter:**

| Area | Requirement | Suggested priority | Why |
|---|---|---|---|
| Ferry / core traffic | Return-trip / 'time to head back to the dock' companion: from the walk-on's landing time, surface the NEXT departures back to Edmonds, an 'X-min walk to the dock, leave by HH:MM' nudge, and (for drivers) live drive-up space + boarding-pass staging — the mirror of arrival capture. The competitor already ships return-ferry alerts. | P0 | Every walk-on burst reverses in ~2-3 hours; a missed boat is the #1 visitor pain and the strongest reason to open the app twice. Ferry data + prediction + ICS reminders already exist in the codebase, so this is assembly, not new infra. |
| Accessibility | Per-listing accessibility attributes (step-free entry, accessible restroom, accessible parking, service-animal welcome, hearing-loop, high-chair/stroller) plus an accessibility filter on discovery/map. | P1 | No persona raised it and it isn't in any epic, yet Kingston's population skews older and ferry accessibility is a real constraint; also strengthens the ADA/WCAG posture and is a low-cost owner-editable field. |
| Multilingual / i18n | Visitor-facing multilingual UI (at minimum Spanish) and per-listing translated blurbs, decoupled from the Spanish-friendly OWNER side already promised. | P1 | Non-negotiables cover Spanish OWNER-side only; visitor-side i18n for a public tourism platform serving a diverse Seattle-metro daytrip audience is a distinct, unlisted requirement with statutory-tourist (50-mile) reach implications. |
| Restrooms / practical wayfinding | Public restrooms, drinking water, EV charging, ATM/cash, gas/propane/ice, dog-relief/off-leash, and free-vs-paid parking as first-class map layers with 'open now' where applicable. | P0 | These are the highest-frequency ferry-rider micro-queries and none of the 13 owner personas represents them because no owner monetizes a restroom — a classic voice-of-customer blind spot for a town-info platform. |
| Content freshness / trust | A 'last verified' timestamp visible on every hour/price/phone/tide/ferry datum, plus a staleness policy that auto-flags or hides data older than N days and a lightweight visitor 'report a problem / this is wrong' path. | P0 | The accuracy non-negotiable exists but the MECHANISM (visible provenance + auto-staleness + crowd correction) is unspecified; without it 'never show a wrong hour' is unenforceable for seasonal owners who go dark for months. |
| Emergency / alerts sourcing | Defined alert taxonomy, authoritative SOURCE per alert type (WSF/WSDOT for ferry-road, NKF&R/Sheriff for safety, PUD for power, NWS for weather), who is authorized to post, an approval/verification step, and mandatory geographic/temporal scoping with auto-expiry. | P0 | The 'trusted alert channel' non-negotiable is high-liability and currently under-specified: an unsourced or unexpiring emergency alert is worse than none, and this is exactly where a Chamber app can get sued or lose all credibility. |
| Governance / listing lifecycle | A defined process for who gets listed, who approves new business/nonprofit listings and featured placement, how disputes/complaints/defamation-in-reviews are handled, how closed businesses are retired, and a non-member/non-Chamber-business inclusion policy. | P0 | 'Fair featured placement' and self-service portals presuppose a governance layer nobody specified; without it the Chamber faces favoritism claims, ghost listings, and 'why is my competitor featured' fights. |
| Reservations / bookings | Cancellation/refund policy display, deposit-refund handling, PCI-compliant card-hold via a processor (not stored by the app), 21+ age-gate audit trail, and a documented liability/indemnity position for booking failures. | P1 | The deposit/card-hold + 21+ non-negotiables imply payment-card handling and legal exposure the epic doesn't flesh out; a Chamber-owned app taking card holds needs an explicit processor + liability model. |
| STR / lodging compliance | Short-term-rental permit/registration and lodging-tax-collection status surfaced or required for STR/lodging listings, aligned to any Kitsap County STR rules. | P2 | Jordan (2-cabin host) is listed without any compliance angle; an LTAC-funded app that promotes non-compliant STRs is a political and legal liability for the Chamber. |
| Analytics / privacy (health-adjacent) | Explicit MHMDA (WA My Health My Data Act) compliance for the clinic/salon/fitness resident-services and wellness listings: no geolocation collection near health facilities, no consumer-health-data inference, and a documented data-deletion/consent path. | P0 | Dr. Bello's clinic is in-scope and WA's MHMDA is one of the strictest consumer-health-privacy laws in the US; the privacy non-negotiable gestures at 'no tracking near clinics' but doesn't name the statute or the actual compliance controls. |
| Cross-promotion / B2B | Conflict/consent rules for bundled itineraries and B2B cross-promotion: opt-in by both businesses, no pay-to-play bundle placement that undermines the 'fair placement' promise, and category-exclusivity handling. | P2 | Bundling two businesses implicitly endorses both to each other's customers; without consent + fairness rules this collides with the featured-placement fairness non-negotiable. |
| Offline / PWA | Defined offline behavior for the specific 'dead-signal on the ferry crossing' scenario: which data (ferry schedule, map tiles, guest guide, restaurant hours) is cached, how stale-while-offline is labeled, and how the app degrades — not just 'PWA/offline is P0'. | P0 | The whole audience literally loses signal mid-Sound; 'offline-capable' is asserted but the concrete cache-set and stale-labeling contract (which must not violate the accuracy non-negotiable) is unspecified. |
| Onboarding / adoption | A member onboarding + claim-your-listing flow (import from the 166 Qwick listings), assisted setup for tech-averse owners, printed QR/quick-start collateral, and a 'concierge onboarding' fallback where Chamber staff set it up for the owner. | P0 | The delegated/10-second self-service non-negotiable assumes the owner is already in; nobody specified how a low-tech, seasonal owner gets FROM zero TO their first edit — the single biggest driver of whether this app is empty or alive. |
| Kiosk | In-app kiosk mode requirements: attract-loop, idle-reset, offline-resilient, portrait 1080x1920, deep-link-to-phone via QR, and content parity with the web app (no divergent kiosk copy). | P1 | A kiosk replacing Qwick is a committed decision in the project memory but appears in NONE of the 13 epics; it has distinct UX/hardware/offline requirements that need to be captured before build. |
| Parking payment | Per-zone 'Pay for parking' handoff (SMS deep-link to T2 code 25023 for Port lots; PayByPhone/ParkMobile deep-links for Diamond D515) with visible fallback codes and admin-editable vendor/codes. | P1 | Parking is in the 'wayfinding' epic only as zones, not payment; the free deep-link win is documented in project memory and directly serves the drive-on ferry queue but is absent from the consolidated requirements. |
| Search / discovery | A single town-wide search/answer surface ('is X open', 'where's the nearest ATM/restroom', 'what's happening today') spanning listings, events, alerts, and practical info. | P1 | Discovery epics are category-browse oriented; the actual ferry-rider behavior is a hurried keyword query, and no persona articulated a unified search need. |
| Notifications / comms | A clear notification model: what can send a push/alert, opt-in granularity (ferry vs weather-cancel vs events), rate-limiting/quiet-hours, and how weather-cancel 'reaches people within minutes' technically works (web-push is deferred in the codebase). | P0 | The one-tap cancellation non-negotiable promises minutes-latency reach, but web push is explicitly DEFERRED in the project; the delivery mechanism is an unresolved gap between promise and implementation. |

**Non-functional requirements to lock in:**
- Accessibility conformance is asserted only as 'big high-contrast text' — no target standard (WCAG 2.2 AA), no screen-reader/keyboard/focus/contrast-ratio commitment, no accessible map alternative, and no accessibility of the physical kiosk (reach ranges, touch-target size, audio).
- Offline/PWA is named P0 but the concrete contract is missing: service-worker caching strategy, the exact offline data-set, how stale-while-offline is LABELED so it never violates the accuracy rule, install prompts, and update/versioning behavior.
- Performance under degraded connectivity (the mid-Sound dead zone, ferry-burst traffic spikes when a boat lands) — no latency/payload budgets, no map-tile/image weight limits, no behavior spec for flaky 1-bar cellular.
- Multilingual/i18n on the VISITOR side (Spanish minimum) is entirely unaddressed as a non-functional platform capability; only owner-side Spanish is mentioned.
- Privacy/data-ownership specifics beyond the good high-level stance: no named legal frameworks (WA MHMDA for the clinic/wellness data, plus general privacy-policy/consent-record obligations), no data-retention schedule, no data-portability/export-and-delete for members or end users, no DPA with any processor.
- Content moderation: no policy for user-generated content (reviews, event submissions, photos, 'report a problem'), spam/abuse handling, or takedown of defamatory/inaccurate submissions.
- Onboarding/training for low-tech owners as a NON-functional program (docs, video, in-person clinics, seasonal re-onboarding, Spanish-language help) — treated as implied but not resourced.
- Governance / who-approves: no defined roles, RBAC model beyond 'admin', listing-approval SLA, dispute process, or editorial standards; 'fair featured placement' has no written ruleset.
- Cost sustainability / funding continuity: hosting is ~$7/mo today, but no multi-year TCO (domain, processor fees, kiosk hardware/power, SMS/push costs, staff time) and no plan for what happens if LTAC funding lapses or the single maintainer leaves.
- Uptime / reliability / support: no availability target, no incident/on-call plan, no status page, no 'who fixes it at 7am on July 4 when ferry data breaks' runbook ownership (the busiest day of the year).
- Security: no threat model, no auth-hardening statement beyond scrypt/HMAC in code, no dependency/patch policy, no PCI scope decision for card-holds, no rate-limit/abuse posture for public feeds, no secrets-rotation policy.
- Bus factor / maintainability: the entire platform is built and maintained by one person (Mat) as a personal project; no succession, no second maintainer, no documented hand-off despite being a Chamber-owned public asset.
- Analytics ethics / LTAC-defensibility: the grant metric must be the STATUTORY tourist (overnight paid lodging OR 50+ miles), but the non-functional method to DERIVE that defensibly without over-collecting (and without the wrong 'more data = more visitors' framing flagged in memory) is unspecified.
- Data provenance / source-of-truth conflict resolution: when GBP, the in-app source, and the kiosk disagree, no written precedence rule or reconciliation/sync-failure handling — only the aspiration of 'one source of truth'.
- Backup/DR beyond the daily snapshot: no tested restore drill cadence, no RPO/RTO, no plan for the Render-vs-Vercel split-brain the memory documents.
- Legal/liability & terms: no Terms of Service, no disclaimer for ferry/tide/hours accuracy, no liability position for bookings/payments/emergency alerts, no trademark/photo-rights policy for member-uploaded and syndicated content.

## Success metrics

- Listing accuracy: near-zero verified reports of a 'shown open at a locked door' or wrong-hour incident per season, with >90% of active members' hours edited/confirmed within the trailing 30 days.
- Self-service adoption & retention: a majority of members log in and make at least one self-service edit per quarter, and the share still actively maintaining their listing does not collapse after the summer peak (the 'abandoned by August' failure mode).
- Ferry-to-foot-traffic conversion: measurable lift in post-boat 'directions' and tap-to-call taps to member listings in the 12-minute windows after busy sailings, correlated to WSF arrival times.
- Overnight conversion (LTAC): documented count of day-trippers nudged toward and converting to overnight stays, plus direct-booking clicks captured for lodging members, trending up in shoulder/off season.
- Defensible tourism ROI for LTAC reporting: a privacy-first, exportable dataset of overnight-stay and 50-mile-visitor signals anchored to the statutory tourist definition, delivered each grant cycle in a form that survives auditor/JLARC scrutiny.
- Event & alert reliability: post-once events reach the town calendar + GBP + socials from a single entry, and weather-cancel/tour-cancel alerts reach opted-in users within minutes and auto-clear after the day.
- Nonprofit operating relief: one-click grant/impact exports (attendance, ticketing, volunteer hours) replace manual reconstruction, and volunteer shifts fill via self-service signup instead of a babysat spreadsheet.
- Year-round resident engagement: residents keep the app installed and open it in the quiet winter months (measured via off-season active users and resident-mode/alert engagement), proving it's a town utility, not a seasonal tourist toy.

## Closing

Build it in phases. Ship the quick wins first — the ten-second hours-and-status edit, the return-boat reminder, the always-correct open-now and ferry data, the offline guest guide, the resident alerts channel — and let the expensive, LTAC-sensitive commerce features (ordering, ticketing, deposits) come last, once the platform has earned trust and we've proven the funding stays defensible. Fund the platform, not the skim.

We know our asks pull in different directions — the clinic wants no tracking, the food truck wants to broadcast its location; the seasonal shops want to go quiet, the year-round ones want a January reason to open. Weigh them fairly and tell us plainly what's in each phase and why. We'd rather have a small thing that's true and used than a big thing that's stale and abandoned.

The tables, matrix, non-negotiables register, and research that follow put detail under every point above. Read them as one request from thirteen owners who are ready to roll up our sleeves — verifying hours, testing on our own phones, and giving you honest feedback. Let's start.

— The Kingston Business Coalition
