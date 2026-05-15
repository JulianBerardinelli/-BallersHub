ALTER TABLE "profile_theme_settings" ALTER COLUMN "primary_color" SET DEFAULT '#10b981';--> statement-breakpoint
ALTER TABLE "profile_theme_settings" ALTER COLUMN "accent_color" SET DEFAULT '#34d399';--> statement-breakpoint
ALTER TABLE "profile_theme_settings" ADD COLUMN "secondary_color" text DEFAULT '#2A2A2A';--> statement-breakpoint
ALTER TABLE "profile_theme_settings" ADD COLUMN "background_color" text DEFAULT '#050505';--> statement-breakpoint
ALTER TABLE "profile_theme_settings" DROP COLUMN "typography";