CREATE TABLE "coach_methodology_rubro_translations" (
	"rubro_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"title" text,
	"body" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "coach_methodology_rubro_translations_rubro_id_locale_pk" PRIMARY KEY("rubro_id","locale"),
	CONSTRAINT "coach_methodology_rubro_translations_locale_check" CHECK (locale IN ('es','en','it','pt','de','fr','fi'))
);
--> statement-breakpoint
ALTER TABLE "coach_methodology_rubro_translations" ADD CONSTRAINT "coach_methodology_rubro_translations_rubro_id_coach_methodology_rubros_id_fk" FOREIGN KEY ("rubro_id") REFERENCES "public"."coach_methodology_rubros"("id") ON DELETE cascade ON UPDATE no action;