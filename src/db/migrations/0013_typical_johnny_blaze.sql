ALTER TABLE "blog_posts" ADD COLUMN "locale" text DEFAULT 'es' NOT NULL;--> statement-breakpoint
ALTER TABLE "blog_posts" ADD COLUMN "translation_of_id" uuid;--> statement-breakpoint
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_translation_of_id_blog_posts_id_fk" FOREIGN KEY ("translation_of_id") REFERENCES "public"."blog_posts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "blog_posts_locale_status_published_at_idx" ON "blog_posts" USING btree ("locale","status","published_at");--> statement-breakpoint
CREATE UNIQUE INDEX "blog_posts_translation_of_locale_idx" ON "blog_posts" USING btree ("translation_of_id","locale");--> statement-breakpoint
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_locale_check" CHECK (locale IN ('es','en','it','pt'));