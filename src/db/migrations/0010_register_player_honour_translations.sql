CREATE TABLE "player_honour_translations" (
	"honour_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"title" text,
	"competition" text,
	"description" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "player_honour_translations_honour_id_locale_pk" PRIMARY KEY("honour_id","locale"),
	CONSTRAINT "player_honour_translations_locale_check" CHECK (locale IN ('es','en','it','pt'))
);
--> statement-breakpoint
ALTER TABLE "player_honour_translations" ADD CONSTRAINT "player_honour_translations_honour_id_player_honours_id_fk" FOREIGN KEY ("honour_id") REFERENCES "public"."player_honours"("id") ON DELETE cascade ON UPDATE no action;