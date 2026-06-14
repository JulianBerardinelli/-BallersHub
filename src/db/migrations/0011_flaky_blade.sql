CREATE TABLE "agency_country_profile_translations" (
	"country_profile_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"description" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agency_country_profile_translations_country_profile_id_locale_pk" PRIMARY KEY("country_profile_id","locale"),
	CONSTRAINT "agency_country_profile_translations_locale_check" CHECK (locale IN ('es','en','it','pt'))
);
--> statement-breakpoint
CREATE TABLE "agency_media_translations" (
	"media_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"title" text,
	"alt_text" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agency_media_translations_media_id_locale_pk" PRIMARY KEY("media_id","locale"),
	CONSTRAINT "agency_media_translations_locale_check" CHECK (locale IN ('es','en','it','pt'))
);
--> statement-breakpoint
ALTER TABLE "agency_profile_translations" ADD COLUMN "services" jsonb;--> statement-breakpoint
ALTER TABLE "agency_country_profile_translations" ADD CONSTRAINT "agency_country_profile_translations_country_profile_id_agency_country_profiles_id_fk" FOREIGN KEY ("country_profile_id") REFERENCES "public"."agency_country_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_media_translations" ADD CONSTRAINT "agency_media_translations_media_id_agency_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."agency_media"("id") ON DELETE cascade ON UPDATE no action;