CREATE TABLE "player_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"player_email" text NOT NULL,
	"invited_by_user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"contract_end_date" date,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "player_invites_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "agency_invites" ADD COLUMN "token" text DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "agency_invites" ADD COLUMN "role" text DEFAULT 'manager' NOT NULL;--> statement-breakpoint
ALTER TABLE "player_invites" ADD CONSTRAINT "player_invites_agency_id_agency_profiles_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agency_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_invites" ADD CONSTRAINT "player_invites_invited_by_user_id_user_profiles_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_invites" ADD CONSTRAINT "agency_invites_token_unique" UNIQUE("token");