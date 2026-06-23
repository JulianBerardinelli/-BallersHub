ALTER TABLE "blog_posts" DROP CONSTRAINT "blog_posts_locale_check";--> statement-breakpoint
ALTER TABLE "coach_ai_translation_events" DROP CONSTRAINT "coach_ai_translation_events_locale_check";--> statement-breakpoint
ALTER TABLE "coach_honour_translations" DROP CONSTRAINT "coach_honour_translations_locale_check";--> statement-breakpoint
ALTER TABLE "coach_profile_translations" DROP CONSTRAINT "coach_profile_translations_locale_check";--> statement-breakpoint
ALTER TABLE "user_profiles" DROP CONSTRAINT "user_profiles_preferred_locale_check";--> statement-breakpoint
ALTER TABLE "agency_country_profile_translations" DROP CONSTRAINT "agency_country_profile_translations_locale_check";--> statement-breakpoint
ALTER TABLE "agency_media_translations" DROP CONSTRAINT "agency_media_translations_locale_check";--> statement-breakpoint
ALTER TABLE "agency_profile_translations" DROP CONSTRAINT "agency_profile_translations_locale_check";--> statement-breakpoint
ALTER TABLE "ai_translation_events" DROP CONSTRAINT "ai_translation_events_locale_check";--> statement-breakpoint
ALTER TABLE "player_honour_translations" DROP CONSTRAINT "player_honour_translations_locale_check";--> statement-breakpoint
ALTER TABLE "player_profile_translations" DROP CONSTRAINT "player_profile_translations_locale_check";--> statement-breakpoint
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_locale_check" CHECK (locale IN ('es','en','it','pt','de','fr','fi'));--> statement-breakpoint
ALTER TABLE "coach_ai_translation_events" ADD CONSTRAINT "coach_ai_translation_events_locale_check" CHECK (locale IN ('es','en','it','pt','de','fr','fi'));--> statement-breakpoint
ALTER TABLE "coach_honour_translations" ADD CONSTRAINT "coach_honour_translations_locale_check" CHECK (locale IN ('es','en','it','pt','de','fr','fi'));--> statement-breakpoint
ALTER TABLE "coach_profile_translations" ADD CONSTRAINT "coach_profile_translations_locale_check" CHECK (locale IN ('es','en','it','pt','de','fr','fi'));--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_preferred_locale_check" CHECK (preferred_locale IN ('es','en','it','pt','de','fr','fi'));--> statement-breakpoint
ALTER TABLE "agency_country_profile_translations" ADD CONSTRAINT "agency_country_profile_translations_locale_check" CHECK (locale IN ('es','en','it','pt','de','fr','fi'));--> statement-breakpoint
ALTER TABLE "agency_media_translations" ADD CONSTRAINT "agency_media_translations_locale_check" CHECK (locale IN ('es','en','it','pt','de','fr','fi'));--> statement-breakpoint
ALTER TABLE "agency_profile_translations" ADD CONSTRAINT "agency_profile_translations_locale_check" CHECK (locale IN ('es','en','it','pt','de','fr','fi'));--> statement-breakpoint
ALTER TABLE "ai_translation_events" ADD CONSTRAINT "ai_translation_events_locale_check" CHECK (locale IN ('es','en','it','pt','de','fr','fi'));--> statement-breakpoint
ALTER TABLE "player_honour_translations" ADD CONSTRAINT "player_honour_translations_locale_check" CHECK (locale IN ('es','en','it','pt','de','fr','fi'));--> statement-breakpoint
ALTER TABLE "player_profile_translations" ADD CONSTRAINT "player_profile_translations_locale_check" CHECK (locale IN ('es','en','it','pt','de','fr','fi'));