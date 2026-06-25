CREATE TYPE "public"."staff_role_type" AS ENUM('head_coach', 'assistant_head_coach', 'assistant_coach', 'fitness_coach', 'rehab_physio', 'goalkeeping_coach', 'set_piece_coach', 'tactical_analyst', 'data_analyst', 'scouting', 'sporting_director', 'academy_coordinator', 'methodology_director');--> statement-breakpoint
CREATE TABLE "coach_methodology_rubros" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coach_id" uuid NOT NULL,
	"title" text NOT NULL,
	"icon" text,
	"body" text,
	"position" integer DEFAULT 0 NOT NULL,
	"status" "review_status" DEFAULT 'pending' NOT NULL,
	"reviewed_by_user_id" uuid,
	"reviewed_at" timestamp with time zone,
	"rejection_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "coach_career_item_proposals" ADD COLUMN "roles" "staff_role_type"[];--> statement-breakpoint
ALTER TABLE "coach_career_items" ADD COLUMN "roles" "staff_role_type"[];--> statement-breakpoint
ALTER TABLE "coach_media" ADD COLUMN "rubro_id" uuid;--> statement-breakpoint
ALTER TABLE "coach_profiles" ADD COLUMN "primary_role" "staff_role_type";--> statement-breakpoint
ALTER TABLE "coach_profiles" ADD COLUMN "secondary_roles" "staff_role_type"[];--> statement-breakpoint
ALTER TABLE "coach_profiles" ADD COLUMN "role_title_custom" text;--> statement-breakpoint
ALTER TABLE "coach_methodology_rubros" ADD CONSTRAINT "coach_methodology_rubros_coach_id_coach_profiles_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."coach_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_media" ADD CONSTRAINT "coach_media_rubro_id_coach_methodology_rubros_id_fk" FOREIGN KEY ("rubro_id") REFERENCES "public"."coach_methodology_rubros"("id") ON DELETE cascade ON UPDATE no action;