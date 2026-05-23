ALTER TABLE "career_item_proposals" ADD COLUMN "secondary_division_id" uuid;--> statement-breakpoint
ALTER TABLE "career_item_proposals" ADD CONSTRAINT "career_item_proposals_secondary_division_id_divisions_id_fk" FOREIGN KEY ("secondary_division_id") REFERENCES "public"."divisions"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
