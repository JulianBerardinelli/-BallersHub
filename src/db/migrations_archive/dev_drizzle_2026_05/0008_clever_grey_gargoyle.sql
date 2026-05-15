CREATE TYPE "public"."division_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "divisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"country_code" char(2) NOT NULL,
	"name" text NOT NULL,
	"slug" text,
	"level" integer,
	"crest_url" text DEFAULT '/images/default-division.svg' NOT NULL,
	"status" "division_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "divisions_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "career_items" ADD COLUMN "division_id" uuid;--> statement-breakpoint
ALTER TABLE "career_item_proposals" ADD COLUMN "division_id" uuid;--> statement-breakpoint
ALTER TABLE "career_revision_items" ADD COLUMN "division_id" uuid;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "division_id" uuid;--> statement-breakpoint
ALTER TABLE "divisions" ADD CONSTRAINT "divisions_country_code_countries_code_fk" FOREIGN KEY ("country_code") REFERENCES "public"."countries"("code") ON DELETE cascade ON UPDATE no action;