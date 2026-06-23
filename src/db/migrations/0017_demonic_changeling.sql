CREATE TYPE "public"."national_team_age_category" AS ENUM('sub15', 'sub16', 'sub17', 'sub18', 'sub19', 'sub20', 'sub21', 'sub23', 'olympic', 'senior', 'other');--> statement-breakpoint
CREATE TYPE "public"."national_team_participation" AS ENUM('called_up', 'played', 'sparring', 'training_camp');--> statement-breakpoint
CREATE TABLE "national_team_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"url" text NOT NULL,
	"alt_text" text,
	"position" integer DEFAULT 0 NOT NULL,
	"is_approved" boolean DEFAULT false NOT NULL,
	"is_flagged" boolean DEFAULT false NOT NULL,
	"reviewed_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "national_team_stints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"team_id" uuid,
	"proposed_team_name" text,
	"country_code" char(2),
	"age_category" "national_team_age_category" NOT NULL,
	"participation" "national_team_participation" DEFAULT 'called_up' NOT NULL,
	"highlights" text[],
	"start_year" integer,
	"end_year" integer,
	"description" text,
	"caps" integer,
	"goals" integer,
	"assists" integer,
	"minutes" integer,
	"reference_url" text,
	"order_index" integer DEFAULT 0 NOT NULL,
	"status" "player_status" DEFAULT 'pending_review' NOT NULL,
	"submitted_by_user_id" uuid,
	"reviewed_by_user_id" uuid,
	"reviewed_at" timestamp with time zone,
	"resolution_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "national_team_media" ADD CONSTRAINT "national_team_media_player_id_player_profiles_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "national_team_stints" ADD CONSTRAINT "national_team_stints_player_id_player_profiles_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "national_team_stints" ADD CONSTRAINT "national_team_stints_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "national_team_media_player_idx" ON "national_team_media" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "national_team_stints_player_idx" ON "national_team_stints" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "national_team_stints_status_idx" ON "national_team_stints" USING btree ("status");