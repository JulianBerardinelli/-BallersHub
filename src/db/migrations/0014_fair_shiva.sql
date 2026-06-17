CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"payload" jsonb,
	"subject_table" text,
	"subject_id" uuid,
	"actor_user_id" uuid,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "notifications_recipient_read_at_idx" ON "notifications" USING btree ("recipient_user_id","read_at");--> statement-breakpoint
CREATE INDEX "notifications_recipient_created_at_idx" ON "notifications" USING btree ("recipient_user_id","created_at");