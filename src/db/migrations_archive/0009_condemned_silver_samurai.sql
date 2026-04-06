CREATE TABLE "manager_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"full_name" text NOT NULL,
	"contact_email" text NOT NULL,
	"contact_phone" text,
	"agency_name" text NOT NULL,
	"agency_website_url" text,
	"verified_link" text,
	"agent_license_url" text,
	"agent_license_type" text,
	"id_doc_url" text,
	"selfie_url" text,
	"notes" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"reviewed_by_user_id" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agency_profiles" DROP CONSTRAINT "agency_profiles_user_id_user_profiles_id_fk";
--> statement-breakpoint
ALTER TABLE "agency_profiles" ADD COLUMN "verified_link" text;--> statement-breakpoint
ALTER TABLE "agency_profiles" ADD COLUMN "agent_license_url" text;--> statement-breakpoint
ALTER TABLE "agency_profiles" ADD COLUMN "agent_license_type" text;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "agency_id" uuid;--> statement-breakpoint
ALTER TABLE "manager_applications" ADD CONSTRAINT "manager_applications_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_agency_id_agency_profiles_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agency_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_profiles" DROP COLUMN "user_id";