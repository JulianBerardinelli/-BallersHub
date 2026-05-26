CREATE TABLE "blog_authors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"display_name" text NOT NULL,
	"headline" text,
	"bio" text,
	"avatar_url" text,
	"website_url" text,
	"twitter_url" text,
	"linkedin_url" text,
	"instagram_url" text,
	"youtube_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "blog_authors_slug_idx" ON "blog_authors" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "blog_authors_user_id_idx" ON "blog_authors" USING btree ("user_id");