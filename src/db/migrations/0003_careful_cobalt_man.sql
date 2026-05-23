ALTER TABLE "career_items" ADD COLUMN "secondary_division_id" uuid;--> statement-breakpoint
ALTER TABLE "career_revision_items" ADD COLUMN "secondary_division_id" uuid;--> statement-breakpoint
ALTER TABLE "career_items" ADD CONSTRAINT "career_items_secondary_division_id_divisions_id_fk" FOREIGN KEY ("secondary_division_id") REFERENCES "public"."divisions"("id") ON DELETE SET NULL ON UPDATE NO ACTION;--> statement-breakpoint
ALTER TABLE "career_revision_items" ADD CONSTRAINT "career_revision_items_secondary_division_id_divisions_id_fk" FOREIGN KEY ("secondary_division_id") REFERENCES "public"."divisions"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
