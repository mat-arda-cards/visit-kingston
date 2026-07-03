# Update once, everywhere: the verified syndication plan

Research verified 2026-07-02 against primary developer docs (adversarially
fact-checked; see the corrections notes in the session research). This is the
honest state of "a business updates hours in our portal and it propagates."

## Working today (shipped)

- **The site itself** — portal edits go live on explorekingston pages within
  a minute (store overlay + ISR).
- **Their own websites** — every business/org has live feeds:
  `/api/feeds/business/<id>` (JSON incl. `openNow`),
  `/api/feeds/events?owner=<id>` (+`&format=ics` for calendar subscribe), and
  a paste-in embed script (`/embed/kingston-events.js`). CORS-open.
- **Google Search signal** — every restaurant card emits schema.org
  `LocalBusiness` + `openingHoursSpecification` JSON-LD. Still fully
  supported by Google as an hours signal; zero approvals. (It complements —
  does not override — Google Business Profile data.)
- **Manual round in 5 minutes** — `/portal/syndicate` gives each business
  copy-paste hours + deep links to the GBP/Apple/Yelp/Bing edit screens and
  prewritten social copy per event.

## Wireable next (in priority order)

### 1. Google Business Profile — YES, free, two gates
Hours/description: `PATCH` via **Business Information API v1** (`updateMask=
regularHours,...`, `validateOnly` dry-run). Posts/events: the **legacy v4
`localPosts`** endpoint — never migrated but actively maintained (recurring
posts shipped Apr 2026). Gates: (a) the *Application for Basic API Access*
form (Chamber needs its own verified GBP, 60+ days old, application from an
owner/manager email; days-to-weeks; APIs are invisible until approved);
(b) auth model — **use the Chamber-as-Manager model**: each business adds the
Chamber's Google account as a Manager of their profile (Google's own FAQ
recommends this for partners), so ONE Chamber OAuth covers every listing and
we skip per-owner OAuth verification entirely. Gotchas: 10 edits/min/profile
hard cap (batch each save into one patch), edits can land as pending
moderation (`hasPendingEdits` — build a read-back loop), new managers face a
~7-day cooldown.

### 2. Meta (Facebook Pages + Instagram) — YES, with a pilot path
**No app review needed for a pilot**: a Business-type app gets Standard
Access for all permissions automatically, valid for accounts with a role on
the app — up to **50 tester businesses** on an unlinked app. Path: create the
Meta app, add pilot businesses as Testers, each connects their Page
(`pages_manage_posts`) / IG professional account (`instagram_content_publish`
or the Instagram-Login flavor `instagram_business_content_publish` — the
latter avoids the "IG must be linked to a Page" trap common here). Scale
phase: Chamber Business Verification + Advanced Access review per permission
(screencasts; multi-week; pilot API usage is a review prerequisite, so pilot
first is the right order). Facts to plan around: **no Facebook Events API**
(feed posts announcing events only), IG is JPEG-only + 100 API posts/day,
long-lived Page tokens don't expire but die on password change — build
posting-failure alerts.

### 3. Apple Business Connect — application required
Now merged into "Apple Business" (Mar 2026). A real free write API for
hours/details exists, but access is a **partner/third-party application**,
not self-serve. Chamber registers an Apple Business account and applies as a
third-party listing manager. Worth submitting early; timeline unknown.

### 4. Bing Places — agency path exists
Register the Chamber as a Bing Places **agency** managing client listings;
also note Bing can import/sync from a connected GBP, so a solid Google
pipeline covers much of Bing for free.

### Yelp — NO. Do not promise it.
No public write API for anyone (Fusion is read-only and now paid after a
30-day trial; listing management is enterprise-partner-only, Yext-class).
The deep link to biz.yelp.com on the syndicate page is the permanent answer
unless Yelp changes policy.

### TikTok — defer
Content Posting API before audit = posts forced private (SELF_ONLY) on
private accounts, max 5 posting users/day — a hard veto for v1. Copy-paste
composer only. Revisit only if the Chamber wants to run the ~1.5-month app
review + audit gauntlet.

## Email (portal invites / magic links)
**Resend** — permanent free tier 3,000/month (100/day cap: transactional
only, never newsletters), sends from `mail.explorekingstonwa.com` after
SPF+DKIM DNS records (Chamber action item alongside the CNAME for the app).

## Suggested order of operations
1. Now: portals + feeds + JSON-LD + syndicate checklists (done).
2. Chamber submits the **GBP API access form** and the **Apple Business**
   application (both free; both take calendar time).
3. Build the GBP adapter behind a feature flag; pilot with 2-3 businesses
   using the Manager model; add the pending-edit read-back loop.
4. Meta pilot app with a handful of tester businesses; measure appetite
   before committing to Advanced Access review.
5. Wire Resend when the portal moves off localhost.
