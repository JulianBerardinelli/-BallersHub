CREATE TYPE "public"."invite_status" AS ENUM('sent', 'accepted', 'expired', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."media_type" AS ENUM('photo', 'video', 'doc');--> statement-breakpoint
CREATE TYPE "public"."plan" AS ENUM('free', 'pro', 'pro_plus');--> statement-breakpoint
CREATE TYPE "public"."player_status" AS ENUM('draft', 'pending_review', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."reviewer_perm_status" AS ENUM('pending', 'granted', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('member', 'player', 'coach', 'manager', 'reviewer', 'admin');--> statement-breakpoint
CREATE TYPE "public"."team_kind" AS ENUM('club', 'national', 'academy', 'amateur');--> statement-breakpoint
CREATE TYPE "public"."team_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."visibility" AS ENUM('public', 'private');--> statement-breakpoint
CREATE TABLE "player_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"plan_requested" "plan" DEFAULT 'free' NOT NULL,
	"full_name" text,
	"nationality" text[],
	"positions" text[],
	"current_club" text,
	"transfermarkt_url" text,
	"external_profile_url" text,
	"id_doc_url" text,
	"selfie_url" text,
	"notes" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"reviewed_by_user_id" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"current_team_id" uuid,
	"proposed_team_name" text,
	"proposed_team_country" text,
	"free_agent" boolean DEFAULT false NOT NULL,
	"personal_info_approved" boolean DEFAULT false NOT NULL,
	"proposed_team_category" text,
	"proposed_team_transfermarkt_url" text,
	"proposed_team_country_code" char(2)
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"actor_ip" text,
	"action" text NOT NULL,
	"subject_table" text,
	"subject_id" uuid,
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "career_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"team_id" uuid,
	"club" text NOT NULL,
	"division" text,
	"start_date" date,
	"end_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "career_item_proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"club" text NOT NULL,
	"division" text,
	"start_year" integer,
	"end_year" integer,
	"team_id" uuid,
	"proposed_team_name" text,
	"proposed_team_country" text,
	"proposed_team_country_code" char(2),
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
CREATE TABLE "career_revision_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"original_item_id" uuid,
	"club" text NOT NULL,
	"division" text,
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
CREATE TABLE "career_revision_proposed_teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"name" text NOT NULL,
	"country_name" text,
	"country_code" text,
	"transfermarkt_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "career_revision_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
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
CREATE TABLE "countries" (
	"code" char(2) PRIMARY KEY NOT NULL,
	"name_en" text NOT NULL,
	"name_es" text
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "role" DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"full_name" text NOT NULL,
	"birth_date" date,
	"nationality" text[],
	"foot" text,
	"height_cm" integer,
	"weight_kg" integer,
	"positions" text[],
	"current_club" text,
	"contract_status" text,
	"current_team_id" uuid,
	"career_objectives" text,
	"plan_public" "plan" DEFAULT 'free' NOT NULL,
	"nationality_codes" char(2)[],
	"bio" text,
	"avatar_url" text DEFAULT '/images/player-default.jpg' NOT NULL,
	"visibility" "visibility" DEFAULT 'public' NOT NULL,
	"status" "player_status" DEFAULT 'draft' NOT NULL,
	"market_value_eur" numeric(12, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"type" "media_type" NOT NULL,
	"url" text NOT NULL,
	"title" text,
	"provider" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"country" text,
	"country_code" char(2),
	"kind" "team_kind" DEFAULT 'club' NOT NULL,
	"visibility" "visibility" DEFAULT 'public' NOT NULL,
	"status" "team_status" DEFAULT 'pending' NOT NULL,
	"alt_names" text[],
	"tags" text[],
	"crest_url" text DEFAULT '/images/team-default.svg' NOT NULL,
	"category" text,
	"transfermarkt_url" text,
	"requested_by_user_id" uuid,
	"requested_in_application_id" uuid,
	"requested_from_career_item_id" uuid,
	"featured" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "teams_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "stats_seasons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
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
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"invitee_email_hash" text NOT NULL,
	"invitee_name" text,
	"role_label" text,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone,
	"status" "invite_status" DEFAULT 'sent' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviewer_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"slug" text,
	"full_name" text,
	"role_label" text,
	"club" text,
	"bio" text,
	"contact_email" text,
	"contact_phone_enc" text,
	"visibility" "visibility" DEFAULT 'private' NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviewer_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"reviewer_id" uuid NOT NULL,
	"granted_by_user_id" uuid NOT NULL,
	"status" "reviewer_perm_status" DEFAULT 'granted' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"author_user_id" uuid,
	"author_reviewer_id" uuid,
	"author_name" text,
	"author_email_hash" text,
	"content" text NOT NULL,
	"rating" integer,
	"status" "review_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"plan" "plan" DEFAULT 'free' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"limits_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"current_period_end" timestamp with time zone,
	"canceled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_personal_details" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"document_type" text,
	"document_number" text,
	"document_country" text,
	"document_country_code" char(2),
	"languages" text[],
	"phone" text,
	"residence_city" text,
	"residence_country" text,
	"residence_country_code" char(2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile_change_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"user_id" uuid,
	"field" text NOT NULL,
	"old_value" jsonb,
	"new_value" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_honours" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
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
CREATE TABLE "player_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"label" text,
	"url" text NOT NULL,
	"kind" text NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile_sections_visibility" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"section" text NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"settings" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile_theme_settings" (
	"player_id" uuid PRIMARY KEY NOT NULL,
	"layout" text DEFAULT 'classic' NOT NULL,
	"primary_color" text,
	"accent_color" text,
	"typography" text,
	"cover_mode" text DEFAULT 'photo',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "player_applications" ADD CONSTRAINT "player_applications_current_team_id_teams_id_fk" FOREIGN KEY ("current_team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_items" ADD CONSTRAINT "career_items_player_id_player_profiles_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_items" ADD CONSTRAINT "career_items_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_item_proposals" ADD CONSTRAINT "career_item_proposals_application_id_player_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."player_applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_item_proposals" ADD CONSTRAINT "career_item_proposals_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_revision_items" ADD CONSTRAINT "career_revision_items_request_id_career_revision_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."career_revision_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_revision_items" ADD CONSTRAINT "career_revision_items_original_item_id_career_items_id_fk" FOREIGN KEY ("original_item_id") REFERENCES "public"."career_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_revision_items" ADD CONSTRAINT "career_revision_items_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_revision_items" ADD CONSTRAINT "career_revision_items_proposed_team_id_career_revision_proposed_teams_id_fk" FOREIGN KEY ("proposed_team_id") REFERENCES "public"."career_revision_proposed_teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_revision_proposed_teams" ADD CONSTRAINT "career_revision_proposed_teams_request_id_career_revision_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."career_revision_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_revision_requests" ADD CONSTRAINT "career_revision_requests_player_id_player_profiles_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_profiles" ADD CONSTRAINT "player_profiles_current_team_id_teams_id_fk" FOREIGN KEY ("current_team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_media" ADD CONSTRAINT "player_media_player_id_player_profiles_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_personal_details" ADD CONSTRAINT "player_personal_details_player_id_player_profiles_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_change_logs" ADD CONSTRAINT "profile_change_logs_player_id_player_profiles_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_honours" ADD CONSTRAINT "player_honours_player_id_player_profiles_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_honours" ADD CONSTRAINT "player_honours_career_item_id_career_items_id_fk" FOREIGN KEY ("career_item_id") REFERENCES "public"."career_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_links" ADD CONSTRAINT "player_links_player_id_player_profiles_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_sections_visibility" ADD CONSTRAINT "profile_sections_visibility_player_id_player_profiles_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_theme_settings" ADD CONSTRAINT "profile_theme_settings_player_id_player_profiles_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player_profiles"("id") ON DELETE cascade ON UPDATE no action;