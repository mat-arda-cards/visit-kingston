-- E09 audit read-path indexes. Hand-adjusted from the generated SQL (flagged
-- for CODEOWNERS review): the drop/IF NOT EXISTS guards exist because the
-- staging service already ran a superseded pre-review variant of this
-- migration (2-column audit_store_record_idx, from the branch's staging
-- rehearsal deploy) — this form converges every environment on the canonical
-- 3-column index. On production, which never ran either variant, the guards
-- are no-ops.
DROP INDEX IF EXISTS "audit_store_record_idx";--> statement-breakpoint
CREATE INDEX "audit_store_record_idx" ON "audit" USING btree ("store","record_id","id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_ts_idx" ON "audit" USING btree ("ts");
