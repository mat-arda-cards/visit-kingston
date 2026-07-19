CREATE TABLE "worklist_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"subject_store" text NOT NULL,
	"subject_id" text NOT NULL,
	"subject_label" text NOT NULL,
	"state" text DEFAULT 'open' NOT NULL,
	"assignee_user_id" text,
	"due_at" timestamp with time zone,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"resolution" text,
	"resolution_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"resolved_at" timestamp with time zone,
	"resolved_by" text,
	CONSTRAINT "worklist_item_type_check" CHECK ("worklist_item"."type" IN ('moderation', 'sync_conflict', 'staleness', 'report_inaccurate', 'privacy_request')),
	CONSTRAINT "worklist_item_state_check" CHECK ("worklist_item"."state" IN ('open', 'in_progress', 'resolved', 'dismissed'))
);
--> statement-breakpoint
ALTER TABLE "record" ADD COLUMN "last_verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "record" ADD COLUMN "verify_interval_days" integer;--> statement-breakpoint
CREATE UNIQUE INDEX "worklist_item_active_subject_uniq" ON "worklist_item" USING btree ("type","subject_store","subject_id") WHERE "worklist_item"."state" IN ('open', 'in_progress');--> statement-breakpoint
CREATE INDEX "worklist_item_state_type_idx" ON "worklist_item" USING btree ("state","type");