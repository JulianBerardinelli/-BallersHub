CREATE TYPE "public"."checkout_currency" AS ENUM('USD', 'ARS', 'EUR');--> statement-breakpoint
CREATE TYPE "public"."checkout_processor" AS ENUM('stripe', 'mercado_pago');--> statement-breakpoint
CREATE TYPE "public"."checkout_session_status" AS ENUM('pending', 'redirected', 'completed', 'expired', 'failed');--> statement-breakpoint
CREATE TYPE "public"."division_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."invite_status" AS ENUM('sent', 'accepted', 'expired', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."media_type" AS ENUM('photo', 'video', 'doc');--> statement-breakpoint
CREATE TYPE "public"."plan" AS ENUM('free', 'pro', 'pro_plus');--> statement-breakpoint
CREATE TYPE "public"."player_status" AS ENUM('draft', 'pending_review', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."reviewer_perm_status" AS ENUM('pending', 'granted', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('member', 'player', 'coach', 'manager', 'reviewer', 'admin', 'moderator', 'analyst');--> statement-breakpoint
CREATE TYPE "public"."subscription_status_v2" AS ENUM('incomplete', 'trialing', 'active', 'past_due', 'canceled', 'paused');--> statement-breakpoint
CREATE TYPE "public"."tax_id_type" AS ENUM('dni', 'cuit', 'cuil', 'nie', 'nif', 'vat', 'other');--> statement-breakpoint
CREATE TYPE "public"."team_kind" AS ENUM('club', 'national', 'academy', 'amateur');--> statement-breakpoint
CREATE TYPE "public"."team_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."visibility" AS ENUM('public', 'private');--> statement-breakpoint
CREATE TABLE "agency_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"logo_url" text,
	"description" text,
	"contact_email" text,
	"contact_phone" text,
	"website_url" text,
	"verified_link" text,
	"operative_countries" text[],
	"headquarters" text,
	"foundation_year" integer,
	"instagram_url" text,
	"twitter_url" text,
	"linkedin_url" text,
	"services" jsonb,
	"tagline" text,
	"is_approved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agency_profiles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "agency_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"email" text NOT NULL,
	"invited_by_user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"role" text DEFAULT 'manager' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agency_invites_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "agency_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"url" text NOT NULL,
	"title" text,
	"alt_text" text,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agency_sections_visibility" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"section" text NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"settings" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agency_theme_settings" (
	"agency_id" uuid PRIMARY KEY NOT NULL,
	"layout" text DEFAULT 'classic' NOT NULL,
	"primary_color" text DEFAULT '#10b981',
	"secondary_color" text DEFAULT '#2A2A2A',
	"accent_color" text DEFAULT '#34d399',
	"background_color" text DEFAULT '#050505',
	"typography" text,
	"hero_headline" text,
	"hero_tagline" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agency_country_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"country_code" char(2) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agency_team_relation_proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" uuid NOT NULL,
	"team_id" uuid,
	"proposed_team_name" text,
	"proposed_team_country" text,
	"proposed_team_country_code" char(2),
	"proposed_team_division" text,
	"proposed_team_transfermarkt_url" text,
	"relation_kind" text DEFAULT 'past' NOT NULL,
	"description" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"materialized_team_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agency_team_relation_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"submitted_by_user_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"note" text,
	"resolution_note" text,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	"reviewed_by_user_id" uuid
);
--> statement-breakpoint
CREATE TABLE "agency_team_relations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"relation_kind" text DEFAULT 'past' NOT NULL,
	"description" text,
	"country_code" char(2),
	"approved_by_user_id" uuid,
	"approved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"plan_requested" "plan" DEFAULT 'free' NOT NULL,
	"full_name" text,
	"birth_date" date,
	"height_cm" integer,
	"weight_kg" integer,
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
CREATE TABLE "billing_addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"full_name" text NOT NULL,
	"tax_id" text,
	"tax_id_type" "tax_id_type",
	"country_code" text NOT NULL,
	"state" text,
	"city" text NOT NULL,
	"postal_code" text NOT NULL,
	"street_line_1" text NOT NULL,
	"street_line_2" text,
	"phone" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "career_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"team_id" uuid,
	"club" text NOT NULL,
	"division" text,
	"division_id" uuid,
	"start_date" date,
	"end_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "career_item_proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"club" text NOT NULL,
	"division" text,
	"division_id" uuid,
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
CREATE TABLE "career_revision_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"original_item_id" uuid,
	"club" text NOT NULL,
	"division" text,
	"division_id" uuid,
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
	"country_code" char(2),
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
CREATE TABLE "stats_revision_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"original_stat_id" uuid,
	"season" text NOT NULL,
	"matches" integer DEFAULT 0,
	"starts" integer DEFAULT 0,
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
CREATE TABLE "checkout_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"plan_id" text NOT NULL,
	"currency" "checkout_currency" NOT NULL,
	"processor" "checkout_processor" NOT NULL,
	"status" "checkout_session_status" DEFAULT 'pending' NOT NULL,
	"billing_address_id" uuid,
	"processor_session_id" text,
	"processor_session_url" text,
	"client_secret" text,
	"amount_minor" integer NOT NULL,
	"trial_days" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"expires_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "countries" (
	"code" char(2) PRIMARY KEY NOT NULL,
	"name_en" text NOT NULL,
	"name_es" text
);
--> statement-breakpoint
CREATE TABLE "divisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"country_code" char(2) NOT NULL,
	"name" text NOT NULL,
	"slug" text,
	"level" integer,
	"is_youth" boolean DEFAULT false NOT NULL,
	"reference_url" text,
	"crest_url" text DEFAULT '/images/default-division.svg' NOT NULL,
	"status" "division_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "divisions_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "role" DEFAULT 'member' NOT NULL,
	"agency_id" uuid,
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
	"agency_id" uuid,
	"career_objectives" text,
	"top_characteristics" text[],
	"tactics_analysis" text,
	"physical_analysis" text,
	"mental_analysis" text,
	"technique_analysis" text,
	"analysis_author" text,
	"plan_public" "plan" DEFAULT 'free' NOT NULL,
	"nationality_codes" char(2)[],
	"transfermarkt_url" text,
	"besoccer_url" text,
	"bio" text,
	"hero_url" text,
	"model_url_1" text,
	"model_url_2" text,
	"avatar_url" text DEFAULT '/images/player-default.jpg' NOT NULL,
	"visibility" "visibility" DEFAULT 'public' NOT NULL,
	"status" "player_status" DEFAULT 'draft' NOT NULL,
	"market_value_eur" numeric(12, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"image_url" text,
	"publisher" text,
	"published_at" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"type" "media_type" NOT NULL,
	"url" text NOT NULL,
	"title" text,
	"alt_text" text,
	"tags" text[],
	"provider" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"is_approved" boolean DEFAULT true NOT NULL,
	"is_flagged" boolean DEFAULT false NOT NULL,
	"reviewed_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "manager_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"full_name" text NOT NULL,
	"contact_email" text NOT NULL,
	"contact_phone" text,
	"agency_name" text NOT NULL,
	"agency_website_url" text,
	"verified_link" text,
	"agent_license_url" text,
	"agent_license_type" text,
	"id_doc_url" text,
	"selfie_url" text,
	"notes" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"reviewed_by_user_id" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"player_email" text NOT NULL,
	"invited_by_user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"contract_end_date" date,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "player_invites_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "manager_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"full_name" text NOT NULL,
	"avatar_url" text,
	"bio" text,
	"contact_email" text,
	"contact_phone" text,
	"licenses" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
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
	"division_id" uuid,
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
	"starts" integer DEFAULT 0,
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
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"plan_id" text,
	"currency" "checkout_currency",
	"processor" "checkout_processor",
	"processor_subscription_id" text,
	"processor_customer_id" text,
	"trial_ends_at" timestamp with time zone,
	"current_period_starts_at" timestamp with time zone,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"billing_address_id" uuid,
	"status_v2" "subscription_status_v2"
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
	"education" text,
	"phone" text,
	"residence_city" text,
	"residence_country" text,
	"residence_country_code" char(2),
	"whatsapp" text,
	"show_contact_section" boolean DEFAULT false NOT NULL,
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
CREATE TABLE "portfolio_contact_clicks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"platform" text NOT NULL,
	"viewer_email" text,
	"viewer_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolio_leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid,
	"email" text NOT NULL,
	"source" text DEFAULT 'contact_unlock' NOT NULL,
	"referrer" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketing_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"subject" text NOT NULL,
	"preheader" text,
	"template_key" text NOT NULL,
	"audience_filter" jsonb NOT NULL,
	"template_props" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"scheduled_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"total_recipients" integer DEFAULT 0 NOT NULL,
	"total_sent" integer DEFAULT 0 NOT NULL,
	"total_delivered" integer DEFAULT 0 NOT NULL,
	"total_opened" integer DEFAULT 0 NOT NULL,
	"total_clicked" integer DEFAULT 0 NOT NULL,
	"total_bounced" integer DEFAULT 0 NOT NULL,
	"total_complained" integer DEFAULT 0 NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketing_email_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resend_message_id" text,
	"event_type" text NOT NULL,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketing_sends" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid,
	"email" text NOT NULL,
	"resend_message_id" text,
	"status" text DEFAULT 'queued' NOT NULL,
	"error" text,
	"sent_at" timestamp with time zone,
	"last_event_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "marketing_subscriptions" (
	"email" text PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"source" text NOT NULL,
	"consent_product" boolean DEFAULT true NOT NULL,
	"consent_offers" boolean DEFAULT false NOT NULL,
	"consent_pro_features" boolean DEFAULT false NOT NULL,
	"last_sent_at" timestamp with time zone,
	"last_opened_at" timestamp with time zone,
	"last_clicked_at" timestamp with time zone,
	"total_sends" integer DEFAULT 0 NOT NULL,
	"total_opens" integer DEFAULT 0 NOT NULL,
	"total_clicks" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketing_unsubscribes" (
	"email" text PRIMARY KEY NOT NULL,
	"unsubscribed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reason" text DEFAULT 'user_request' NOT NULL,
	"campaign_id" uuid
);
--> statement-breakpoint
CREATE TABLE "marketing_drip_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"template_key" text NOT NULL,
	"default_subject" text NOT NULL,
	"default_template_props" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"delay_seconds" integer DEFAULT 0 NOT NULL,
	"trigger_event" text DEFAULT 'manual' NOT NULL,
	"exit_condition" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketing_drip_enrollments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"drip_id" uuid NOT NULL,
	"email" text NOT NULL,
	"user_id" uuid,
	"enrolled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"scheduled_for" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"send_id" uuid,
	"error" text,
	"context" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"processor" "checkout_processor" NOT NULL,
	"processor_event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"checkout_session_id" uuid,
	"subscription_id" uuid,
	"payload" jsonb NOT NULL,
	"processed" boolean DEFAULT false NOT NULL,
	"processed_at" timestamp with time zone,
	"error_message" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_tutorial_progress" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"audience" text NOT NULL,
	"plan_at_start" text NOT NULL,
	"dismissed_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agency_invites" ADD CONSTRAINT "agency_invites_agency_id_agency_profiles_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agency_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_invites" ADD CONSTRAINT "agency_invites_invited_by_user_id_user_profiles_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_media" ADD CONSTRAINT "agency_media_agency_id_agency_profiles_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agency_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_sections_visibility" ADD CONSTRAINT "agency_sections_visibility_agency_id_agency_profiles_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agency_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_theme_settings" ADD CONSTRAINT "agency_theme_settings_agency_id_agency_profiles_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agency_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_country_profiles" ADD CONSTRAINT "agency_country_profiles_agency_id_agency_profiles_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agency_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_team_relation_proposals" ADD CONSTRAINT "agency_team_relation_proposals_submission_id_agency_team_relation_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."agency_team_relation_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_team_relation_proposals" ADD CONSTRAINT "agency_team_relation_proposals_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_team_relation_proposals" ADD CONSTRAINT "agency_team_relation_proposals_materialized_team_id_teams_id_fk" FOREIGN KEY ("materialized_team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_team_relation_submissions" ADD CONSTRAINT "agency_team_relation_submissions_agency_id_agency_profiles_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agency_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_team_relations" ADD CONSTRAINT "agency_team_relations_agency_id_agency_profiles_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agency_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_team_relations" ADD CONSTRAINT "agency_team_relations_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
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
ALTER TABLE "stats_revision_items" ADD CONSTRAINT "stats_revision_items_request_id_career_revision_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."career_revision_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkout_sessions" ADD CONSTRAINT "checkout_sessions_billing_address_id_billing_addresses_id_fk" FOREIGN KEY ("billing_address_id") REFERENCES "public"."billing_addresses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_agency_id_agency_profiles_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agency_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_profiles" ADD CONSTRAINT "player_profiles_current_team_id_teams_id_fk" FOREIGN KEY ("current_team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_profiles" ADD CONSTRAINT "player_profiles_agency_id_agency_profiles_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agency_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_articles" ADD CONSTRAINT "player_articles_player_id_player_profiles_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_media" ADD CONSTRAINT "player_media_player_id_player_profiles_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_invites" ADD CONSTRAINT "player_invites_agency_id_agency_profiles_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agency_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_invites" ADD CONSTRAINT "player_invites_invited_by_user_id_user_profiles_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_personal_details" ADD CONSTRAINT "player_personal_details_player_id_player_profiles_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_change_logs" ADD CONSTRAINT "profile_change_logs_player_id_player_profiles_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_honours" ADD CONSTRAINT "player_honours_player_id_player_profiles_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_honours" ADD CONSTRAINT "player_honours_career_item_id_career_items_id_fk" FOREIGN KEY ("career_item_id") REFERENCES "public"."career_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_links" ADD CONSTRAINT "player_links_player_id_player_profiles_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_sections_visibility" ADD CONSTRAINT "profile_sections_visibility_player_id_player_profiles_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_theme_settings" ADD CONSTRAINT "profile_theme_settings_player_id_player_profiles_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_contact_clicks" ADD CONSTRAINT "portfolio_contact_clicks_player_id_player_profiles_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_leads" ADD CONSTRAINT "portfolio_leads_player_id_player_profiles_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_sends" ADD CONSTRAINT "marketing_sends_campaign_id_marketing_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."marketing_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_drip_enrollments" ADD CONSTRAINT "marketing_drip_enrollments_drip_id_marketing_drip_configs_id_fk" FOREIGN KEY ("drip_id") REFERENCES "public"."marketing_drip_configs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_drip_enrollments" ADD CONSTRAINT "marketing_drip_enrollments_send_id_marketing_sends_id_fk" FOREIGN KEY ("send_id") REFERENCES "public"."marketing_sends"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_checkout_session_id_checkout_sessions_id_fk" FOREIGN KEY ("checkout_session_id") REFERENCES "public"."checkout_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "billing_addresses_user_id_idx" ON "billing_addresses" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "checkout_sessions_user_idx" ON "checkout_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "checkout_sessions_processor_session_idx" ON "checkout_sessions" USING btree ("processor","processor_session_id");--> statement-breakpoint
CREATE INDEX "checkout_sessions_status_idx" ON "checkout_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "portfolio_contact_clicks_player_idx" ON "portfolio_contact_clicks" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "portfolio_leads_email_idx" ON "portfolio_leads" USING btree ("email");--> statement-breakpoint
CREATE INDEX "portfolio_leads_player_idx" ON "portfolio_leads" USING btree ("player_id");--> statement-breakpoint
CREATE UNIQUE INDEX "marketing_campaigns_slug_unique" ON "marketing_campaigns" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "marketing_campaigns_status_idx" ON "marketing_campaigns" USING btree ("status");--> statement-breakpoint
CREATE INDEX "marketing_email_events_message_id_idx" ON "marketing_email_events" USING btree ("resend_message_id");--> statement-breakpoint
CREATE INDEX "marketing_email_events_type_idx" ON "marketing_email_events" USING btree ("event_type");--> statement-breakpoint
CREATE UNIQUE INDEX "marketing_sends_campaign_email_unique" ON "marketing_sends" USING btree ("campaign_id","email");--> statement-breakpoint
CREATE INDEX "marketing_sends_message_id_idx" ON "marketing_sends" USING btree ("resend_message_id");--> statement-breakpoint
CREATE INDEX "marketing_sends_email_idx" ON "marketing_sends" USING btree ("email");--> statement-breakpoint
CREATE INDEX "marketing_sends_status_idx" ON "marketing_sends" USING btree ("status");--> statement-breakpoint
CREATE INDEX "marketing_subscriptions_source_idx" ON "marketing_subscriptions" USING btree ("source");--> statement-breakpoint
CREATE INDEX "marketing_subscriptions_user_idx" ON "marketing_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "marketing_drip_configs_slug_unique" ON "marketing_drip_configs" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "marketing_drip_configs_trigger_idx" ON "marketing_drip_configs" USING btree ("trigger_event");--> statement-breakpoint
CREATE INDEX "marketing_drip_enrollments_due_idx" ON "marketing_drip_enrollments" USING btree ("status","scheduled_for");--> statement-breakpoint
CREATE INDEX "marketing_drip_enrollments_drip_idx" ON "marketing_drip_enrollments" USING btree ("drip_id");--> statement-breakpoint
CREATE INDEX "marketing_drip_enrollments_email_idx" ON "marketing_drip_enrollments" USING btree ("email");--> statement-breakpoint
CREATE INDEX "marketing_drip_enrollments_user_idx" ON "marketing_drip_enrollments" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "marketing_drip_enrollments_active_unique" ON "marketing_drip_enrollments" USING btree ("drip_id","email","status");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_events_processor_event_idx" ON "payment_events" USING btree ("processor","processor_event_id");--> statement-breakpoint
CREATE INDEX "payment_events_subscription_idx" ON "payment_events" USING btree ("subscription_id");