ALTER TABLE "coach_honours" ADD COLUMN "video_url" text;--> statement-breakpoint
ALTER TABLE "coach_honours" ADD COLUMN "position" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "coach_honours" ADD COLUMN "status" "review_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "coach_honours" ADD COLUMN "reviewed_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "coach_honours" ADD COLUMN "reviewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "coach_honours" ADD COLUMN "rejection_reason" text;