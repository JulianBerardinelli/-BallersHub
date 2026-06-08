CREATE TABLE "agency_profile_translations" (
	"agency_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"description" text,
	"tagline" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agency_profile_translations_agency_id_locale_pk" PRIMARY KEY("agency_id","locale"),
	CONSTRAINT "agency_profile_translations_locale_check" CHECK (locale IN ('es','en','it','pt'))
);
--> statement-breakpoint
CREATE TABLE "ai_translation_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"block" text NOT NULL,
	"kind" text NOT NULL,
	"source_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_translation_events_locale_check" CHECK (locale IN ('es','en','it','pt')),
	CONSTRAINT "ai_translation_events_kind_check" CHECK (kind IN ('initial','regen'))
);
--> statement-breakpoint
CREATE TABLE "player_profile_translations" (
	"player_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"bio" text,
	"career_objectives" text,
	"top_characteristics" text[],
	"tactics_analysis" text,
	"physical_analysis" text,
	"mental_analysis" text,
	"technique_analysis" text,
	"analysis_author" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "player_profile_translations_player_id_locale_pk" PRIMARY KEY("player_id","locale"),
	CONSTRAINT "player_profile_translations_locale_check" CHECK (locale IN ('es','en','it','pt'))
);
--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "preferred_locale" text DEFAULT 'es' NOT NULL;--> statement-breakpoint
ALTER TABLE "agency_profile_translations" ADD CONSTRAINT "agency_profile_translations_agency_id_agency_profiles_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agency_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_translation_events" ADD CONSTRAINT "ai_translation_events_player_id_player_profiles_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_profile_translations" ADD CONSTRAINT "player_profile_translations_player_id_player_profiles_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_translation_events_quota_idx" ON "ai_translation_events" USING btree ("player_id","kind","created_at");--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_preferred_locale_check" CHECK (preferred_locale IN ('es','en','it','pt'));