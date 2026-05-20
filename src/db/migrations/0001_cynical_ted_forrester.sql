CREATE TYPE "public"."blog_cluster" AS ENUM('career_guidance', 'agency_ops', 'industry_ar');--> statement-breakpoint
CREATE TYPE "public"."blog_status" AS ENUM('draft', 'pending_review', 'published', 'rejected');--> statement-breakpoint
CREATE TABLE "blog_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"content_html" text NOT NULL,
	"hero_image_url" text,
	"cluster" "blog_cluster" NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"author_user_id" uuid NOT NULL,
	"status" "blog_status" DEFAULT 'draft' NOT NULL,
	"rejection_reason" text,
	"reviewed_by_user_id" uuid,
	"reviewed_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"reading_time_min" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "is_blogger" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "blog_posts_slug_idx" ON "blog_posts" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "blog_posts_status_published_at_idx" ON "blog_posts" USING btree ("status","published_at");--> statement-breakpoint
CREATE INDEX "blog_posts_author_user_id_idx" ON "blog_posts" USING btree ("author_user_id");--> statement-breakpoint
CREATE INDEX "blog_posts_cluster_idx" ON "blog_posts" USING btree ("cluster","published_at");