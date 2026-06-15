CREATE TYPE "public"."gender" AS ENUM('male', 'female', 'unspecified');--> statement-breakpoint
ALTER TABLE "player_applications" ADD COLUMN "gender" "gender" DEFAULT 'male' NOT NULL;--> statement-breakpoint
ALTER TABLE "player_profiles" ADD COLUMN "gender" "gender" DEFAULT 'male' NOT NULL;