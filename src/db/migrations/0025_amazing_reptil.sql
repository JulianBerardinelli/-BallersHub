CREATE TYPE "public"."staff_experience_kind" AS ENUM('club', 'job', 'project');--> statement-breakpoint
ALTER TABLE "coach_career_item_proposals" ADD COLUMN "experience_kind" "staff_experience_kind" DEFAULT 'club' NOT NULL;--> statement-breakpoint
ALTER TABLE "coach_career_items" ADD COLUMN "experience_kind" "staff_experience_kind" DEFAULT 'club' NOT NULL;