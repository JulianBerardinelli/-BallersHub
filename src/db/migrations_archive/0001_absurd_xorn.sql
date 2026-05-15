ALTER TABLE "career_item_proposals" ALTER COLUMN "proposed_team_country_code" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "career_revision_proposed_teams" ALTER COLUMN "country_code" SET DATA TYPE char(2);--> statement-breakpoint
ALTER TABLE "career_items" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;