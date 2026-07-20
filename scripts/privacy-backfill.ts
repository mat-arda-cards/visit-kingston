// E11 privacy backfill CLI: one-time cleanup of historical rows that predate
// the area-only privacy floor.
//
//   npm run privacy:backfill                  (dry-run: counts only, default)
//   npm run privacy:backfill -- --apply       (execute; staging first, always)
//
// Reports and (with --apply) fixes:
//   (a) analytics events carrying lat/lng keys  -> keys stripped in place
//   (b) stored outbound taps to food/health-assistance destinations -> deleted
//   (c) survey rows carrying homeZip/homeState  -> fields stripped in place
//
// Order matters: (b) deletes run before (a)'s UPDATE — targeted deletes go
// through ctids, which shift on update (see src/lib/db/privacy-backfill.ts).
// Prod runs are human-gated (E11 plan §4-e): staging --apply, verify zeros,
// then production on an explicit go.
//
// RESTORE PAIRING (operational invariant — also in docs/OPERATIONS.md):
// backup bundles exported BEFORE this backfill ran still contain the purged
// PII. After restoring any pre-backfill bundle, immediately re-run
// `npm run privacy:backfill -- --apply` — otherwise the restore silently
// resurrects coordinates, sensitive outbound events, and survey zip/state
// fields the public privacy page says are gone.
//
// Runs under tsx with NODE_OPTIONS=--conditions=react-server so the data
// layer's `server-only` guard resolves to its empty react-server build.

import {
  countBackfillTargets,
  deleteSensitiveOutboundEvents,
  stripLatLngKeys,
  stripSurveyPiiFields,
} from "../src/lib/db/privacy-backfill";
import { isSensitiveOutbound } from "../src/lib/privacy/policy";

const apply = process.argv.includes("--apply");

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL must be set (the backfill target).");
  process.exit(1);
}

const host = (() => {
  try {
    return new URL(process.env.DATABASE_URL!).host;
  } catch {
    return "(unparseable DATABASE_URL)";
  }
})();

async function main() {
  console.log(`privacy-backfill ${apply ? "--apply" : "--dry-run"} against ${host}`);

  const before = await countBackfillTargets(isSensitiveOutbound);
  console.log(`  (a) analytics events with lat/lng keys:        ${before.latLngEvents}`);
  console.log(`  (b) stored sensitive-destination outbound:      ${before.sensitiveOutboundEvents}`);
  console.log(`  (c) survey rows with homeZip/homeState:         ${before.surveyPiiRows}`);

  if (!apply) {
    console.log("dry-run: nothing changed. Re-run with --apply to execute.");
    return;
  }

  // (b) first — ctids shift once the (a) UPDATE rewrites rows.
  const deleted = await deleteSensitiveOutboundEvents(isSensitiveOutbound);
  const stripped = await stripLatLngKeys();
  const surveyStripped = await stripSurveyPiiFields();
  console.log(`applied: deleted ${deleted} sensitive outbound event(s), stripped lat/lng from ${stripped} event(s), stripped homeZip/homeState from ${surveyStripped} survey row(s)`);

  const after = await countBackfillTargets(isSensitiveOutbound);
  const clean =
    after.latLngEvents === 0 &&
    after.sensitiveOutboundEvents === 0 &&
    after.surveyPiiRows === 0;
  console.log(
    clean
      ? "verify: all three counts are now 0."
      : `verify FAILED: residual counts a=${after.latLngEvents} b=${after.sensitiveOutboundEvents} c=${after.surveyPiiRows}`,
  );
  if (!clean) process.exit(1);
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error("privacy-backfill failed:", err);
    process.exit(1);
  },
);
