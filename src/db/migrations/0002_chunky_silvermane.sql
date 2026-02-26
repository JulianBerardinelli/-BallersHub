CREATE TABLE "stats_revision_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"original_stat_id" uuid,
	"season" text NOT NULL,
	"matches" integer DEFAULT 0,
	"goals" integer DEFAULT 0,
	"assists" integer DEFAULT 0,
	"minutes" integer DEFAULT 0,
	"yellow_cards" integer DEFAULT 0,
	"red_cards" integer DEFAULT 0,
	"competition" text,
	"team" text,
	"career_item_id" uuid,
	"order_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "stats_revision_items" ADD CONSTRAINT "stats_revision_items_request_id_career_revision_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."career_revision_requests"("id") ON DELETE cascade ON UPDATE no action;