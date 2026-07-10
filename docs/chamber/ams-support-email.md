# AMS API support email — ready to send

**For the Chamber office — please read this preamble, then send the draft below.**

- **Send it FROM a Chamber account** (e.g. info@kingstonchamber.com). GrowthZone issues API keys per developer and only with the **account holder's** express permission — the Chamber is the account holder, so this inquiry carries weight only coming from you. Mat cannot send it.
- **To:** websupport@growthzone.com
- **Cc:** engagement@growthzone.com
- **Phone fallback** if no reply in ~a week: 800-825-9171 (ask for WebSupport, then the Engagement team for API-access quotes).
- **When the written reply arrives, forward it to Mat** so the answers can be recorded in docs/adr/ADR-0001-ams-ground-truth.md and the app's AMS integration work can proceed. Written answers matter — a phone summary can't close the gate.

---

**Subject:** API access inquiry — Greater Kingston Chamber of Commerce (ChamberMaster/MemberZone tenant, business.kingstonchamber.com)

Hello,

The Greater Kingston Chamber of Commerce (Kingston, WA) is building a chamber-owned community tourism app and would like machine access to our own tenant's data — member directory, events, and related modules — via your API. Our public modules are live at business.kingstonchamber.com, and we'd appreciate written answers to the following questions so we can plan the integration and budget correctly:

1. Which product/edition/package is our account on (ChamberMaster vs MemberZone branding, module version — our public modules live at business.kingstonchamber.com), and does that edition include API access?

2. If API access is not included: what does enablement cost for an account of our size, and which editions include it?

3. Is an issued API key read-only or read-write? Can write scopes (members `PUT`, events `POST`/`PUT`, Marketplace `POST`) be granted to a chamber-built app, and is there an approval workflow for API-written content?

4. What are the rate limits / throttling / burst rules for `api.micronetonline.com`?

5. What do the `events/feeds` and `RecentActivity` endpoints do (both appear in the v1 documentation without descriptions)? Can `RecentActivity` be used as a change feed, given no webhooks exist?

6. Is there any webhook or change-notification option for ChamberMaster/MemberZone customers, and does an all-events iCal or RSS feed exist for v4 public modules (per-event iCal works today; we found no calendar-wide feed)?

7. Do the "Marketplace" API objects correspond to Hot Deals / Member-to-Member Deals, and what does enabling the hot-deals module on our tenant involve?

8. If we later migrate to GrowthZone AMS: which API modules are contractually supported for external use (vs. Curated-API-only), what webhook action types are available, and does OAuth client issuance cost extra?

Written answers are preferred so we can share them accurately with our developer. Thank you!

Greater Kingston Chamber of Commerce
Kingston, WA
business.kingstonchamber.com
