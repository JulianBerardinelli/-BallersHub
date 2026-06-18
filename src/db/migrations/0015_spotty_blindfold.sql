CREATE TABLE "coach_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"plan_requested" "plan" DEFAULT 'free' NOT NULL,
	"full_name" text,
	"birth_date" date,
	"nationality" text[],
	"role_title" text,
	"current_club" text,
	"transfermarkt_url" text,
	"external_profile_url" text,
	"id_doc_url" text,
	"selfie_url" text,
	"notes" text,
	"licenses_draft" jsonb DEFAULT '[]',
	"status" text DEFAULT 'pending' NOT NULL,
	"reviewed_by_user_id" uuid,
	"reviewed_at" timestamp with time zone,
	"rejection_reason" text,
	"current_team_id" uuid,
	"proposed_team_name" text,
	"proposed_team_country" text,
	"proposed_team_country_code" char(2),
	"proposed_team_category" text,
	"proposed_team_transfermarkt_url" text,
	"free_agent" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coach_career_item_proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"club" text NOT NULL,
	"role_title" text,
	"division" text,
	"division_id" uuid,
	"secondary_division_id" uuid,
	"start_year" integer,
	"end_year" integer,
	"team_id" uuid,
	"proposed_team_name" text,
	"proposed_team_country" text,
	"proposed_team_country_code" text,
	"proposed_team_transfermarkt_url" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"reviewed_by_user_id" uuid,
	"reviewed_at" timestamp with time zone,
	"materialized_at" timestamp with time zone,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coach_career_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coach_id" uuid NOT NULL,
	"team_id" uuid,
	"club" text NOT NULL,
	"role_title" text,
	"division" text,
	"division_id" uuid,
	"secondary_division" text,
	"secondary_division_id" uuid,
	"start_date" date,
	"end_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coach_career_revision_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"original_item_id" uuid,
	"club" text NOT NULL,
	"role_title" text,
	"division" text,
	"division_id" uuid,
	"secondary_division" text,
	"secondary_division_id" uuid,
	"start_year" integer,
	"end_year" integer,
	"team_id" uuid,
	"proposed_team_id" uuid,
	"order_index" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coach_career_revision_proposed_teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"name" text NOT NULL,
	"country_name" text,
	"country_code" char(2),
	"transfermarkt_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coach_career_revision_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coach_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"submitted_by_user_id" uuid NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_by_user_id" uuid,
	"reviewed_at" timestamp with time zone,
	"resolution_note" text,
	"change_summary" text,
	"current_snapshot" jsonb DEFAULT '[]' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coach_stats_revision_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"original_stat_id" uuid,
	"season" text NOT NULL,
	"matches" integer DEFAULT 0 NOT NULL,
	"wins" integer DEFAULT 0 NOT NULL,
	"draws" integer DEFAULT 0 NOT NULL,
	"losses" integer DEFAULT 0 NOT NULL,
	"goals_for" integer DEFAULT 0 NOT NULL,
	"goals_against" integer DEFAULT 0 NOT NULL,
	"competition" text,
	"team" text,
	"career_item_id" uuid,
	"order_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coach_change_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coach_id" uuid NOT NULL,
	"user_id" uuid,
	"field" text NOT NULL,
	"old_value" jsonb,
	"new_value" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coach_contact_clicks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coach_id" uuid NOT NULL,
	"platform" text NOT NULL,
	"viewer_email" text,
	"viewer_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coach_portfolio_leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coach_id" uuid,
	"email" text NOT NULL,
	"source" text DEFAULT 'contact_unlock' NOT NULL,
	"referrer" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coach_licenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coach_id" uuid NOT NULL,
	"title" text NOT NULL,
	"issuer" text,
	"awarded_year" integer,
	"expires_year" integer,
	"doc_url" text,
	"status" "review_status" DEFAULT 'pending' NOT NULL,
	"reviewed_by_user_id" uuid,
	"reviewed_at" timestamp with time zone,
	"rejection_reason" text,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coach_articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coach_id" uuid NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"image_url" text,
	"publisher" text,
	"published_at" date,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coach_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coach_id" uuid NOT NULL,
	"type" "media_type" NOT NULL,
	"url" text NOT NULL,
	"title" text,
	"alt_text" text,
	"tags" text[],
	"provider" text,
	"season_year" integer,
	"position" integer DEFAULT 0 NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"status" "review_status" DEFAULT 'pending' NOT NULL,
	"reviewed_by_user_id" uuid,
	"reviewed_at" timestamp with time zone,
	"rejection_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coach_honours" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coach_id" uuid NOT NULL,
	"title" text NOT NULL,
	"competition" text,
	"season" text,
	"awarded_on" date,
	"description" text,
	"career_item_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coach_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coach_id" uuid NOT NULL,
	"label" text,
	"url" text NOT NULL,
	"kind" text NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coach_personal_details" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coach_id" uuid NOT NULL,
	"document_type" text,
	"document_number" text,
	"document_country" text,
	"document_country_code" char(2),
	"languages" text[],
	"education" text,
	"phone" text,
	"residence_city" text,
	"residence_country" text,
	"residence_country_code" char(2),
	"whatsapp" text,
	"show_contact_section" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "coach_personal_details_coach_id_unique" UNIQUE("coach_id")
);
--> statement-breakpoint
CREATE TABLE "coach_sections_visibility" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coach_id" uuid NOT NULL,
	"section" text NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"settings" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coach_theme_settings" (
	"coach_id" uuid PRIMARY KEY NOT NULL,
	"layout" text DEFAULT 'classic' NOT NULL,
	"primary_color" text DEFAULT '#10b981',
	"secondary_color" text DEFAULT '#2A2A2A',
	"accent_color" text DEFAULT '#34d399',
	"background_color" text DEFAULT '#050505',
	"typography" text,
	"cover_mode" text DEFAULT 'photo',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coach_stats_seasons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coach_id" uuid NOT NULL,
	"season" text NOT NULL,
	"matches" integer DEFAULT 0 NOT NULL,
	"wins" integer DEFAULT 0 NOT NULL,
	"draws" integer DEFAULT 0 NOT NULL,
	"losses" integer DEFAULT 0 NOT NULL,
	"goals_for" integer DEFAULT 0 NOT NULL,
	"goals_against" integer DEFAULT 0 NOT NULL,
	"competition" text,
	"team" text,
	"career_item_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coach_ai_translation_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coach_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"block" text NOT NULL,
	"kind" text NOT NULL,
	"source_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "coach_ai_translation_events_locale_check" CHECK (locale IN ('es','en','it','pt')),
	CONSTRAINT "coach_ai_translation_events_kind_check" CHECK (kind IN ('initial','regen'))
);
--> statement-breakpoint
CREATE TABLE "coach_honour_translations" (
	"honour_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"title" text,
	"competition" text,
	"description" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "coach_honour_translations_honour_id_locale_pk" PRIMARY KEY("honour_id","locale"),
	CONSTRAINT "coach_honour_translations_locale_check" CHECK (locale IN ('es','en','it','pt'))
);
--> statement-breakpoint
CREATE TABLE "coach_profile_translations" (
	"coach_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"bio" text,
	"career_objectives" text,
	"playing_style" text,
	"methodology_analysis" text,
	"analysis_author" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "coach_profile_translations_coach_id_locale_pk" PRIMARY KEY("coach_id","locale"),
	CONSTRAINT "coach_profile_translations_locale_check" CHECK (locale IN ('es','en','it','pt'))
);
--> statement-breakpoint
CREATE TABLE "coach_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"full_name" text NOT NULL,
	"birth_date" date,
	"nationality" text[],
	"nationality_codes" char(2)[],
	"role_title" text,
	"coaching_since" integer,
	"current_club" text,
	"current_team_id" uuid,
	"agency_id" uuid,
	"bio" text,
	"career_objectives" text,
	"playing_style" text,
	"preferred_formations" text[],
	"methodology_analysis" text,
	"analysis_author" text,
	"plan_public" "plan" DEFAULT 'free' NOT NULL,
	"transfermarkt_url" text,
	"hero_url" text,
	"model_url_1" text,
	"model_url_2" text,
	"avatar_url" text DEFAULT '/images/coach-default.jpg' NOT NULL,
	"theme_primary_color" text,
	"theme_accent_color" text,
	"theme_background_color" text,
	"visibility" "visibility" DEFAULT 'public' NOT NULL,
	"status" "player_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "coach_profiles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "coach_applications" ADD CONSTRAINT "coach_applications_current_team_id_teams_id_fk" FOREIGN KEY ("current_team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_career_item_proposals" ADD CONSTRAINT "coach_career_item_proposals_application_id_coach_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."coach_applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_career_item_proposals" ADD CONSTRAINT "coach_career_item_proposals_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_career_item_proposals" ADD CONSTRAINT "coach_career_item_proposals_secondary_division_id_divisions_id_fk" FOREIGN KEY ("secondary_division_id") REFERENCES "public"."divisions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_career_item_proposals" ADD CONSTRAINT "coach_career_item_proposals_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_career_items" ADD CONSTRAINT "coach_career_items_coach_id_coach_profiles_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."coach_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_career_items" ADD CONSTRAINT "coach_career_items_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_career_items" ADD CONSTRAINT "coach_career_items_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_career_items" ADD CONSTRAINT "coach_career_items_secondary_division_id_divisions_id_fk" FOREIGN KEY ("secondary_division_id") REFERENCES "public"."divisions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_career_revision_items" ADD CONSTRAINT "coach_career_revision_items_request_id_coach_career_revision_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."coach_career_revision_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_career_revision_items" ADD CONSTRAINT "coach_career_revision_items_original_item_id_coach_career_items_id_fk" FOREIGN KEY ("original_item_id") REFERENCES "public"."coach_career_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_career_revision_items" ADD CONSTRAINT "coach_career_revision_items_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_career_revision_items" ADD CONSTRAINT "coach_career_revision_items_secondary_division_id_divisions_id_fk" FOREIGN KEY ("secondary_division_id") REFERENCES "public"."divisions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_career_revision_items" ADD CONSTRAINT "coach_career_revision_items_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_career_revision_items" ADD CONSTRAINT "coach_career_revision_items_proposed_team_id_coach_career_revision_proposed_teams_id_fk" FOREIGN KEY ("proposed_team_id") REFERENCES "public"."coach_career_revision_proposed_teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_career_revision_proposed_teams" ADD CONSTRAINT "coach_career_revision_proposed_teams_request_id_coach_career_revision_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."coach_career_revision_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_career_revision_requests" ADD CONSTRAINT "coach_career_revision_requests_coach_id_coach_profiles_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."coach_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_stats_revision_items" ADD CONSTRAINT "coach_stats_revision_items_request_id_coach_career_revision_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."coach_career_revision_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_change_logs" ADD CONSTRAINT "coach_change_logs_coach_id_coach_profiles_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."coach_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_contact_clicks" ADD CONSTRAINT "coach_contact_clicks_coach_id_coach_profiles_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."coach_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_portfolio_leads" ADD CONSTRAINT "coach_portfolio_leads_coach_id_coach_profiles_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."coach_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_licenses" ADD CONSTRAINT "coach_licenses_coach_id_coach_profiles_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."coach_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_articles" ADD CONSTRAINT "coach_articles_coach_id_coach_profiles_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."coach_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_media" ADD CONSTRAINT "coach_media_coach_id_coach_profiles_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."coach_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_honours" ADD CONSTRAINT "coach_honours_coach_id_coach_profiles_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."coach_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_honours" ADD CONSTRAINT "coach_honours_career_item_id_coach_career_items_id_fk" FOREIGN KEY ("career_item_id") REFERENCES "public"."coach_career_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_links" ADD CONSTRAINT "coach_links_coach_id_coach_profiles_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."coach_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_personal_details" ADD CONSTRAINT "coach_personal_details_coach_id_coach_profiles_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."coach_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_sections_visibility" ADD CONSTRAINT "coach_sections_visibility_coach_id_coach_profiles_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."coach_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_theme_settings" ADD CONSTRAINT "coach_theme_settings_coach_id_coach_profiles_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."coach_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_stats_seasons" ADD CONSTRAINT "coach_stats_seasons_coach_id_coach_profiles_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."coach_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_stats_seasons" ADD CONSTRAINT "coach_stats_seasons_career_item_id_coach_career_items_id_fk" FOREIGN KEY ("career_item_id") REFERENCES "public"."coach_career_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_ai_translation_events" ADD CONSTRAINT "coach_ai_translation_events_coach_id_coach_profiles_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."coach_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_honour_translations" ADD CONSTRAINT "coach_honour_translations_honour_id_coach_honours_id_fk" FOREIGN KEY ("honour_id") REFERENCES "public"."coach_honours"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_profile_translations" ADD CONSTRAINT "coach_profile_translations_coach_id_coach_profiles_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."coach_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_profiles" ADD CONSTRAINT "coach_profiles_current_team_id_teams_id_fk" FOREIGN KEY ("current_team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_profiles" ADD CONSTRAINT "coach_profiles_agency_id_agency_profiles_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agency_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "coach_contact_clicks_coach_idx" ON "coach_contact_clicks" USING btree ("coach_id");--> statement-breakpoint
CREATE INDEX "coach_portfolio_leads_email_idx" ON "coach_portfolio_leads" USING btree ("email");--> statement-breakpoint
CREATE INDEX "coach_portfolio_leads_coach_idx" ON "coach_portfolio_leads" USING btree ("coach_id");--> statement-breakpoint
CREATE UNIQUE INDEX "coach_sections_visibility_coach_id_section_key" ON "coach_sections_visibility" USING btree ("coach_id","section");--> statement-breakpoint
CREATE INDEX "coach_ai_translation_events_quota_idx" ON "coach_ai_translation_events" USING btree ("coach_id","kind","created_at");