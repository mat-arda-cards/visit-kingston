# Vision: Line-side & event food delivery (late-2027 concept)

**Status: LONG-RANGE VISION / not started. Target: late 2027 at the earliest.**
This doc exists so the concept shapes architecture decisions *today* — not to
authorize building anything now. It records the concept, the verified
feasibility research (two multi-agent research passes + adversarial
verification, 2026-07-03), the hard problems, a phased roadmap, and — most
importantly — the **cheap, reversible architectural seams to preserve now** so a
2027 pilot needs no rewrite.

> One-line verdict: **Build the ordering + ferry-timing *brain*, not a delivery
> fleet.** The moat is the app's "will-this-car-still-be-here" prediction; the
> app should stay a non-transactional marketing/intelligence layer and let
> *someone else* (the restaurant, or a separate delivery entity) fulfill and
> take payment. Verdict: **niche-viable, with a clear low-risk beachhead
> (events + order-ahead pickup) and a permission-gated moonshot (true car-side
> line delivery).**

> **⭐ Leading model as of 2026-07-03 — PICKUP-ONLY at two fixed hubs (simpler than
> car-side delivery, and it clears the worst gates).** Instead of delivering
> *into* cars, offer two designated pickup/consolidation hubs and have the
> customer (or a passenger) walk to one: **(a) near NAPA Auto Parts (~10801 NE
> SR-104)** for people up the highway in the SR-104 queue, and **(b) the gazebo**
> (downtown / near-dock / events). A runner **consolidates** orders from several
> restaurants to the hub; the customer picks up by order code. The hub's value is
> *consolidation* (one short walk instead of chasing three kitchens and losing
> your spot), not distance. This **dissolves the worst gates at once**: no
> highway-ROW vending (RCW 47.32 / AGO 1951), no minor-labor roadway bar (§2a),
> no delivery-to-a-moving-target, no risky go/no-go dispatch. Crucially it
> **collapses the precise-location requirement to a coarse "which hub?" choice** —
> the customer just picks the hub at checkout (optional smart default from the
> app's existing coarse side-of-water/GPS), so the current non-persisted coarse
> GPS suffices and the separate precise-location consent tier (seam #4) drops from
> *load-bearing* to *optional polish*. The go/no-go engine (seam #1) becomes a
> **timing ADVISOR** ("order now to make the 3:30, pick up at NAPA by 3:05"), not
> a dispatch gate — so a bad estimate just means "don't order," never a wasted
> order. The order payload (seam #2) simplifies to a **pickup-point reference +
> ready-by time**, not a car position. **Model pickup points as DATA** (`{label,
> lat/lng, active window, zone/sailings served}`) so the set can grow (event
> pavilion, second downtown spot). New things to verify on the ground: NAPA's OK
> for a recurring pickup hub + a safe same-side walk from the line (no SR-104
> crossing); and the solo-driver wrinkle (can't abandon a creeping-queue car — so
> target passengers / long-enough waits, a UX nudge not a design change).

---

## 1. The concept

A hyper-local, demand-triggered overlay in the Visit Kingston app that lets
people order food from local restaurants to **where they are physically stuck
or gathered** in Kingston:

1. **People waiting to catch the ferry — two modes, geofenced at Lindvog Rd:**
   - **Primary (as originally envisioned): car-side delivery in the SR-104
     highway line *west* of Lindvog** — a runner meets the specific car while
     it's queued on the public highway (outside the WSF-controlled holding
     lot).
   - **Trigger → fallback: when the car moves *beyond Lindvog*** (into the
     WSF-controlled holding area, **excluded by design**), the order
     **auto-switches to pickup at a fixed in-town landmark** (the Kiwanis /
     Mike Wallace Park gazebo near the Chamber office & J'aime Les Crêpes).
   - The gazebo fallback makes the go/no-go decision **low-risk**: a missed
     in-line intercept degrades gracefully to a pickup, never a
     food-arrives-after-the-boat failure.
2. **People at events / venues** — Mike Wallace Park events, Friends &
   Neighbors Brewing.

**Why this app specifically could do it — the moat.** A delivery to a ferry-line
car only works if you can confidently predict the car is *still there* (not yet
boarded) when the food arrives. The app is uniquely building that knowledge:
the ferry busyness forecast, live WSDOT `terminalsailingspace` drive-up counts,
boarding-pass staging logic, and its own growing per-sailing empirical
observation log. **No airport-gate, stadium-seat, or border-queue delivery
precedent has ever had a per-target "safe-to-deliver-until" signal** — that
capability is the one thing that makes line-side delivery even conceivable, and
it is a *byproduct of ferry intelligence the app already builds*. The edge is
real but **narrow: it is an information/coordination edge, not a logistics or
capital edge**, and it only pays off if the app stays out of payment, dispatch,
and employment.

---

## 2. Two findings that reshape the original model

### 2a. The SR-104 in-line delivery — the headline target — is the *hardest* mode, not the MVP

- **Likely unlawful without a discretionary WSDOT permit.** The SR-104 holding
  lane is state-highway right-of-way. **RCW 47.32.110/.120** make it unlawful to
  operate a device/structure to receive/vend/**deliver a commodity** on the ROW
  without a WSDOT permit, and **AGO 1951 No. 86 applied this exact statute to
  selling food to ferry-line waiters.** (Interpretive nuance: the statute
  targets a "device/structure," so whether a *walking courier* is squarely
  covered is a genuine gap — but the 47.32.120 "business inviting patrons onto
  the ROW" nuisance theory plausibly reaches the model, and pedestrian safety in
  the idling lane is the very problem the new SR-104 ATMS was built to reduce, so
  a permit is unlikely.) **Do not assume it is legal by default.**
- **Barred for minor runners regardless.** WA **WAC 296-125-030** prohibits
  anyone under 18 from being an "outside helper on a public road/highway" or
  "selling items to passing motorists on a public roadway." A high-schooler
  handing food to cars stopped in the SR-104 queue is exactly that prohibited
  fact-pattern. So even if the mode were permitted, it is **adults-only**.
- **Worst possible delivery *environment*:** a moving queue on a state highway
  with a hard deadline and no controlled geometry — the opposite of the only
  proven deliver-to-parked-vehicle model (Sonic's small numbered lot).

**Consequence:** treat SR-104 in-line delivery as a **permission-gated
moonshot** (Phase 4), *not* the MVP. The realistic addressable vehicle target is
the **bounded, addressable Port of Kingston numbered spaces / Diamond D515 lot**
(which maps to the app's existing parking-zone polygons — the "Sonic stall"
analog), and even there, prefer a **staged pickup point over true car-side
delivery**. The **gazebo pickup + event delivery** is the viable beachhead.

### 2b. The app / Chamber must not own the runners or take payment — but a *separate entity* can

Every well-funded analog that put a **paid human runner** between a restaurant
and a spread-out target **retrenched, was discontinued, or survived only by
using existing venue staff** (AtYourGate → effectively defunct as a consumer
brand; VenueNext/Levi's deliver-to-every-seat → cut in 2017 on low usage; Uber
Eats/Yankees → uses concession staff). A ~2,700-resident, deeply seasonal town
cannot sustain an always-on runner, and a solo volunteer cannot run a W-2 or gig
fleet. Worse, the moment the **app** takes payment or controls a runner it
inherits a cascade of status changes:

- **Payment → WA marketplace facilitator** (sales tax on the *full* price incl.
  delivery/service fees, B&O on its own fees, monthly seller reporting) **+ PCI
  merchant-of-record**.
- **Dispatching/controlling runners → likely *employer*** under WA's
  employee-presumption (L&I workers' comp, payroll, misclassification audit
  risk) + commercial auto/GL exposure elevated by the near-highway scenario.
- **Breaks the LTAC funding path** — a restaurant-commerce/delivery-dispatch
  feature is a legally shaky lodging-tax use vs. tourism marketing (see
  `SYNDICATION.md` / LTAC notes).

**Reconciling this with the "high-schoolers on e-cargo bikes" vision:** the two
are compatible **only if the delivery operation is a separate legal entity** —
a private LLC or a co-op — that the app *refers business to* and *shares the
go/no-go signal with*. That entity is the merchant-of-record and employer; it
carries the insurance and does the WA minor-labor compliance. The **app stays
the Chamber-owned, non-transactional marketing/intelligence/directory layer**.
This lets the runner-fleet vision be pursued without contaminating the app's
tax, employer, and LTAC posture. (Minor-labor is *legally staffable* — bike/foot
delivery is expressly permitted even for 14–15-year-olds federally — but it is
**W-2 + workers'-comp + annual parent/school forms + a new 2026 pre-hire L&I
safety consultation**, tight school-week hours, and under-16s barred from Class
3 e-bikes; **16–17-year-olds + adult peak runners is the path of least
resistance**.)

---

## 3. Hard problems (make-or-break)

| # | Problem | Why it's hard | Mitigation |
|---|---|---|---|
| 1 | **The deadline-prediction problem is existential near a sailing boundary** | Ferry boarding is lumpy batch service — a whole vessel boards at once, and WSF routinely swaps a 144-car boat for a 124-car boat (~20 fewer = a whole batch), cancels, or overloads with little warning. A car *near a boundary* is a coin flip no sensor resolves. WSF is spending federal grant money on a Wait Time System because this is unsolved. | Never promise "guaranteed before you board." Make it **probabilistic + buffered**: only *offer* delivery to cars with a high-confidence buffer (≈≥2 full sailings of wait remaining); best-effort framing with a defined **early-board fallback** (gazebo pickup / restaurant refund). Build the **order-acceptance GATE before any dispatch feature.** Wire vessel-swap/cancellation alerts as a hard "suspend all line-side offers" trigger. |
| 2 | **Runner labor economics kill it if the app owns the runner** | Every analog retrenched/died on runner labor; hyperlocal viability wants ~5+ orders/hr, 15+/day — implausible for a seasonal 2,700-person town. | App **never** employs/dispatches runners. Fulfillment lives with the restaurant (own staff / its own DaaS courier from its own account) **or a separate delivery entity** (§2b). Pay-per-order DaaS ($7–9/drop, no fixed cost, customer pays) matches spiky seasonality; salaried logistics doesn't. |
| 3 | **Payment/runner control → tax + employer + liability cascade** | Marketplace-facilitator, PCI, employer status, LTAC risk (§2b). | **Deep-link-directory as a bright-line rule** (§5). Payment on Toast/Square/DoorDash/restaurant site; driver relationship with restaurant or DaaS. Satisfy the always-on WA CPA delivery duties (documented restaurant consent, accurate contact info, up-front fee disclosure) even as a directory. |
| 4 | **SR-104 line is likely illegal to deliver into & is the worst environment** | §2a (RCW 47.32 + AGO 1951 No. 86 + minor-labor bar + moving highway queue). | Not the MVP. Permission-gated moonshot. Prefer bounded Port/Diamond lot + staged pickup. |
| 5 | **In-terminal WSF lot has no small-vendor pathway** | Port-owned / WSF-leased / Diamond-operated, fenced, boards in lane order, WSP explosive-screening zone; WSF routes ALL commercial access through one Business Operations Manager; "tabletop promotions" access explicitly bans sales. | Don't design the MVP around in-lot delivery. Long-term only, via a negotiated WSF concession/access agreement; budget nothing on it. |
| 6 | **Third-party DaaS can't hit a bare GPS pin in the queue** | Uber Direct / DoorDash Drive / Roadie geocode the dropoff to a real street address and overwrite any lat/long >~1 km away; gig couriers refuse in-queue/curbside handoffs and won't hunt "the blue Subaru in lane 3." | Use DaaS only for **fixed venues/events with real addresses** (brewery, park pavilion), dispatched from the restaurant's own account. For the queue, the only viable fulfiller is a restaurant's own (or the separate entity's) on-foot/e-bike runner, coordinated by the app's location bucket + car description + go/no-go window. |

---

## 4. Regulatory gates (severity-ranked)

| Gate | Severity | Path |
|---|---|---|
| **SR-104 highway ROW delivery** (RCW 47.32.110/.120; AGO 1951 No. 86) | **blocker** | Discretionary WSDOT permit that safety policy cuts against; verify with WSDOT Business Operations before any budget. Moonshot, not MVP. |
| **WSF terminal-lot commercial access** (Port/WSF/Diamond property; WSP screening; single Business Operations Manager) | **blocker** | No advertised small-vendor pathway; needs a negotiated concession/access agreement. Long-term only, via the Chamber/Port relationship. |
| **WA marketplace-facilitator + PCI** (RCW 82.08.0531) | **major** | Triggered ONLY if the app collects payment. Avoid entirely — stay a deep-link directory. Single biggest architectural fork. |
| **WA worker-classification / employer status** (L&I employee-presumption) | **major** | Triggered ONLY if the app dispatches/controls runners. Keep the driver relationship with the restaurant / DaaS / separate entity. Never a runner on the app's books. |
| **WA Consumer Protection Act third-party-delivery duties** | manageable | Documented restaurant opt-in (easy — Chamber members), accurate contact info, clear up-front fee disclosure. Mandatory the instant the app does more than a neutral link. |
| **My Health My Data Act — precise geolocation** (RCW 19.373) | manageable | Precise real-time tracking is legal with affirmative, order-scoped, withdrawable consent that self-deletes on order completion and never persists raw coordinates; no geofence near a clinic/pharmacy. Ship as a **separate opt-in tier**, not by loosening the default coarse GPS. Private right of action. |
| **Food safety / temperature in transit** (WAC 246-215; Kitsap Public Health) | manageable | Courier of **sealed/packaged** food likely needs no food-worker card (restaurant's permit covers indirect delivery per WAC 246-215) — keep every handoff sealed. Long ferry waits stretch delivery times; TCS temp + liability are real. Confirm by phone: **Kitsap Public Health 360-728-2235.** |
| **WSDOT live-camera terms for automated CV** | manageable | No clear grant for automated commercial reuse; feeds are unretained low-cadence snapshots, degraded at night/rain (peak ferry conditions). Biometric law (RCW 19.375) is *not* a barrier for anonymized car-counting (photos/derived data exempt) — but **no faces, no plates**. If CV is load-bearing, get written WSDOT/Port permission or deploy your own camera on Chamber/Port property. |
| **Public-park handoff venue** (Port of Kingston; Mike Wallace Park gazebo) | manageable→major | The gazebo is **non-reservable, first-come public Port land** — you can't monopolize it or exclude the public, and a *recurring commercial* handoff point very likely needs a **commercial-use agreement with the Port.** Confirm before branding "meet at the gazebo": **Port of Kingston 360-297-3545** (bundle with the existing overnight-parking call). May end up a different agreed spot. |
| **LTAC / lodging-tax eligibility** | manageable | Fund only the **tourism-marketing / information-signal layer** (queue intelligence, ordering directory), never the commerce/dispatch/CV-hardware layer. Keeps legal, tax, and grant postures aligned. |

**Kitsap is an advantage:** Seattle's 15% delivery-fee cap and app-based-worker
pay/deactivation laws **do not reach** unincorporated Kingston, and there is no
statewide food-delivery pay floor (the TNC law excludes food).

---

## 5. Recommended fulfillment & ownership structure

- **The app is NOT the fulfiller.** It contributes exactly one structured
  payload per order — `{location bucket, car/party description, predicted
  board-time window, go/no-go flag}` — to a restaurant-facing view, plus the
  deep-link-out it already does.
- **Two fulfillment channels, matched to the target:**
  1. **Events / fixed venues** (Mike Wallace Park, Friends & Neighbors Brewing):
     the **restaurant** dispatches a white-label Uber Direct / DoorDash Drive /
     Roadie courier **from its own Toast/Square account** to the real venue
     address. No deadline problem, ordinary permits, zero fixed cost.
  2. **Ferry queue / Port lot:** the only workable fulfiller is a **restaurant's
     own staff/family runner (or a separate delivery entity's runner)** working
     the compact, stationary, walkable line on foot / e-bike (the stadium
     concessionaire model — matched by car color / space number, not street
     address), switched on only during the predictable high-density windows the
     app can forecast.
- **Ownership:** the app stays a **non-transactional coordination/marketing
  layer owned by the Chamber** — takes no payment, employs no runners, holds no
  inventory, carries no merchant/employer/marketplace-facilitator status. Any
  per-delivery economics live entirely inside the **restaurant's P&L** or a
  **separate delivery LLC/co-op** (§2b). App revenue ≈ zero or LTAC-grant-funded
  on the tourism-marketing side only. Fixed-cost base stays ≈ today's ~$7/mo +
  incremental prediction compute; survives days with zero orders.

---

## 6. Phased roadmap

| Phase | Timeframe | Goal | Build / prove |
|---|---|---|---|
| **0 — Keep the option open** | 2026, ongoing | Zero product commitments; preserve seams; grow the calibration data that *is* the moat | The cheap, reversible architecture-only moves in §7 (all dormant). Keep growing the `ferry_observation` log every sailing. Confirm two facts by phone: Kitsap Public Health (courier permits), WSDOT Business Ops (is any line-side permit even conceivable). |
| **1 — Prove the deadline engine (read-only)** | early–mid 2027 | Validate go/no-go prediction against reality with **no food, no runner, no money** | Ship the "safe-to-deliver-until" estimate as an **internal/advisory** signal (terminalsailingspace + observation log; CV/GPS as coarse cross-checks). Backtest + live-test accuracy, especially near sailing boundaries and across vessel swaps. Success bar: a defensible confidence interval for cars with ≥~2-sailing buffer. **If it can't hit the bar → pickup-only, permanently — and you've spent nothing on dispatch.** |
| **2 — Events & pickup MVP** | mid–late 2027 | Launch the low-risk beachhead where the deadline problem barely exists and only ordinary permits apply | Order-ahead-for-pickup + event delivery to **fixed addresses**, fulfilled by the restaurant (own staff or its own DaaS courier). App = directory + timing UX + structured-payload export. Documented restaurant consent, fee disclosure, payment on the restaurant's stack. Exercises nearly all the same machinery (GPS bucket, catalog, payload, prediction) with none of the hard gates. |
| **3 — Port-lot pilot (bounded, addressable)** | late 2027 at earliest | Car-side delivery only in the controlled, addressable Port / Diamond D515 lot, gated by the proven prediction | Restaurant's own (or separate entity's) runner serves the bounded lot (Sonic-stall analog = the app's polygons); app gates order acceptance on high-confidence buffer; early-board fallback baked in. Needs Diamond/Port permission. Prefer a staged pickup point over true car-side even here. Only if Phase 1 accuracy *and* Phase 2 operations both held. |
| **4 — SR-104 line & in-terminal lot (deferred moonshot)** | beyond 2027; permission-gated | The original headline targets — only if an explicit WSDOT permit + WSF/Port/Diamond agreements materialize | **Do not plan budget or architecture around this.** Assume it never clears; design everything upstream to stand on its own without it. |

---

## 7. Architecture decisions to make NOW (the point of this doc)

These are **cheap, reversible, "keep-the-option-open" seams** — not features to
build. Each also stays useful even if delivery never ships.

1. **Extract ferry-boarding prediction into a first-class internal "dwell /
   board-time" API that outputs a probability + confidence, not a point
   estimate** — public shape `{probability, confidence, safeToDeliverUntil,
   goNoGo}`. *Rationale:* the go/no-go deadline engine is the entire moat and the
   one capability no analog has; a clean probabilistic API means the 2027 pilot
   *consumes* it rather than reinventing it, and it stays useful for queue/busy
   UX regardless. Rank inputs correctly from day one: `terminalsailingspace`
   tollbooth-count first, `ferry_observation` log second, GPS/CV as coarse
   cross-checks only. **Seam:** a versioned prediction API, not board-time logic
   hardcoded in UI components.
2. **Build a restaurant-facing EXPORT seam** that *can* push a per-order payload
   `{location bucket, car/party description, predicted board-time window,
   go/no-go flag}` to a restaurant-side view — and build **NO payment capture,
   NO courier dispatch, NO runner-employment/tracking layer.** *Rationale:* keeps
   drivers, money, and tax off the app's books while still monetizing the moat;
   LTAC-safe marketplace-not-merchant posture. **Seam:** a one-directional
   "order-ready-for-line" exporter; explicitly no money-movement or dispatch code
   path that could accidentally grow into marketplace-facilitator/employer
   status.
3. **Keep the deep-link-directory boundary as a hard, documented invariant:** the
   app never collects payment and never controls a runner. *Rationale:* this
   single choice keeps the app out of WA marketplace-facilitator tax, PCI
   merchant-of-record, employer/L&I exposure, and the LTAC commerce-vs-marketing
   risk — all at once. Biggest fork, cheapest to lock now. **Seam:** payment
   always originates on the restaurant's Toast/Square/DoorDash/own-site flow; the
   app's ordering path is a consented outbound link + metadata, with no
   server-side charge capability.
4. **Add a SECOND, explicit, order-scoped precise-location consent tier that
   self-deletes on order completion** — separate from today's coarse,
   block-rounded, non-persisted analytics GPS. *Rationale:* line-side delivery
   needs a liveness/segment confirm today's coarse pings can't give, but
   loosening the default would forfeit the privacy advantage validated vs. the
   Bainbridge teardown and risk MHMDA (precise geolocation is sensitive; private
   right of action). **Seam:** a distinct consent-scoped channel with its own
   lifecycle (affirmative opt-in, one-tap withdrawal, purpose-specific text,
   auto-delete on order close, no raw-coordinate persistence, no geofence near
   health-care sites) — never a widening of the analytics GPS.
5. **Introduce an occupancy-signal ABSTRACTION over cameras** with a written
   pipeline rule: **anonymized vehicle counts only — no facial recognition, no
   license-plate reading**, aggregate counts stored, never identifiable frames.
   *Rationale:* CV is the weakest, legally-grayest input, so it must be swappable
   (public WSDOT snapshots today; a dedicated retained camera later if ever
   load-bearing) behind a stable "occupancy estimate" interface; the
   no-faces/no-plates rule is what keeps it clear of RCW 19.375. **Seam:** an
   `occupancy signal` interface any source (webcam CV, own camera, manual,
   ATMS-derived) can implement, with biometric/ALPR-free constraints enforced at
   the pipeline boundary.
6. **Wire vessel-substitution & sailing-cancellation alerts** (already in the
   consumed WSDOT feed) **as a first-class "suspend line-side offers" trigger,
   and treat the parking-zone polygons as the stable "address" primitive** for
   any vehicle target. *Rationale:* a surprise smaller vessel moves every
   boarding boundary earlier by a whole batch — the dominant residual risk — so
   the kill-switch must be architected in, not bolted on; and because DaaS APIs
   geocode a bare pin away, the app's 11 Port polygons (Sonic-stall analog) are
   the only durable way to name a car's position. **Seam:** an alert-driven
   feature-flag that can globally suspend line-side offers per route, plus
   polygon-section IDs (not raw lat/long) as the location key in the payload.

---

## 8. Open questions & pre-budget phone calls

- **SR-104 ATMS boarding-pass timestamps** — can the app get a data-sharing
  arrangement (WSDOT / ATMS vendor / Kitsap County)? That single feed would
  raise the whole go/no-go engine's confidence more than any camera — the
  **strongest untapped lever.**
- **Crowd-sourced probe-GPS queue sensing (Mat's idea, 2026-07-03) — the best
  HOME-GROWN signal, and a standalone tourism win.** App users in the line share
  precise location; the **gaps between consecutive in-queue probes × average
  stopped-car spacing (~6–8 m)** estimate the car count for the covered span
  **without needing to know the app's penetration rate** (penetration only
  affects the tail beyond the furthest probe + a leading gap, and that shrinks as
  adoption grows — a data flywheel). This is floating-car/probe estimation aimed
  at the one blind spot tollbooth counts and terminal cams miss: **the overflow
  line west of Lindvog.** Honest limits: (1) tail extrapolation (calibrate
  against the empirical log + tollbooth count); (2) classifying "in the queue"
  vs. driving-past / parked / resident (use speed/dwell-over-time, heading,
  lane geometry); (3) model the queue as a **path** (arc-length along a polyline,
  incl. the boarding-pass-active alternate staging via Barber Cutoff / Miller
  Bay) — and treat a large inter-probe gap as ambiguous (long line vs. a break).
  **Privacy design that keeps it clean: precise-in → AGGREGATE-out → raw
  discarded** — store only the queue *number* per time, never individual tracks
  (preserves the non-hoarding posture validated vs. the Bainbridge teardown +
  stays clean under MHMDA). **Architecture consequence:** this RE-ELEVATES seam #4
  (precise-location tier) from "optional polish" (its status under the
  pickup-only model) back to **first-class — but built aggregate-only**, and it
  implements seam #5 (occupancy abstraction) as a new *source*, blended
  confidence-weighted into seam #1 — the *same* confidence-weighting pattern the
  ferry forecast already uses for its empirical-bucket data, so it's a new input
  to existing machinery, not a new subsystem. **Standalone value:** a live "how
  long is the line right now / which sailing will you make" number — measured, not
  guessed — is a strong tourism feature and a direct upgrade to the existing
  ferry-prediction product **even if delivery never ships**, which de-risks the
  whole investment.
- **WSF/WSDOT Wait Time System** (being built with federal grant money) — will it
  ship a consumable feed to *ingest rather than reinvent*? Plan to consume it.
- **Phone, before any budget:** (a) Kitsap Public Health (360-728-2235) — does a
  courier of *sealed* restaurant food need any permit / food-worker cards? (b)
  WSDOT Business Operations / WSF Business Operations Manager — is any line-side
  or in-terminal-lot delivery permit even conceivable? (c) Port of Kingston
  (360-297-3545) — is a recurring commercial handoff point at the gazebo/park
  allowed, and can we agree a reliable spot?
- **Accuracy bar:** what confidence must the board-time prediction clear near a
  sailing boundary to justify offering car-side delivery at all — and what is the
  pre-agreed early-board fallback?
- **Diamond/Port permission** for a runner to serve the bounded D515 / numbered
  Port spaces (the realistic Sonic-like target), independent of the harder
  highway and in-terminal cases.
- **⚠ Economics still unproven.** One research dimension (business-model /
  unit-economics) returned placeholder data and was not recovered — a real
  economics pass (order-volume assumptions, restaurant willingness to run a
  runner, seasonal demand curve, **double-seasonality** where demand *and*
  bike-operability both crater in winter) is **still needed before committing to
  Phase 2.** Treat winter as go-dark / diversify; don't assume it subsidizes the
  fleet.

---

## 9. Provenance

Two multi-agent research workflows + two focused agents (2026-07-03), each with
adversarial verification of load-bearing claims against primary sources
(WA RCW, AGO opinions, WSDOT/WSF, L&I, DOR, Kitsap Public Health, MHMDA, and
industry precedents). Key primary sources: RCW 47.32.110/.120; AGO 1951 No. 86;
RCW 82.08.0531 (marketplace facilitator); RCW 19.373 (MHMDA); RCW 19.375
(biometric); WAC 296-125-030 (minor duties); WAC 246-215 (food code); WSDOT
`terminalsailingspace` API + SR-104 ATMS; L&I youth-employment & worker-
classification; Kitsap Public Health; Port of Kingston recreation/commercial.
Precedent teardowns: AtYourGate, Grab/Servy, VenueNext/Levi's, Uber Eats/Yankees,
Sonic carhop, Cascadian Courier Collective, Portland Pedal Power. Full source
list in the workflow transcripts.
