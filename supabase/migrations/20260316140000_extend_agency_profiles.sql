ALTER TABLE "agency_profiles" ADD COLUMN "licenses" jsonb;--> statement-breakpoint
ALTER TABLE "agency_profiles" ADD COLUMN "operative_countries" text[];--> statement-breakpoint
ALTER TABLE "agency_profiles" ADD COLUMN "headquarters" text;--> statement-breakpoint
ALTER TABLE "agency_profiles" ADD COLUMN "foundation_year" integer;--> statement-breakpoint
ALTER TABLE "agency_profiles" ADD COLUMN "instagram_url" text;--> statement-breakpoint
ALTER TABLE "agency_profiles" ADD COLUMN "twitter_url" text;--> statement-breakpoint
ALTER TABLE "agency_profiles" ADD COLUMN "linkedin_url" text;--> statement-breakpoint
ALTER TABLE "agency_profiles" ADD COLUMN "services" text[];