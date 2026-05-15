-- Per-country narrative + verified team relationships per agency.
-- Mirrors the player career proposal flow: managers submit a batch of teams,
-- an admin approves the submission, and on approval the rows materialize as
-- agency_team_relations (with a teams row created for any proposed-new team).

CREATE TABLE IF NOT EXISTS "agency_country_profiles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "agency_id" uuid NOT NULL REFERENCES "agency_profiles"("id") ON DELETE CASCADE,
  "country_code" char(2) NOT NULL,
  "description" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "agency_country_profiles_unique" UNIQUE ("agency_id", "country_code")
);

CREATE INDEX IF NOT EXISTS "agency_country_profiles_agency_idx"
  ON "agency_country_profiles" ("agency_id");

CREATE TABLE IF NOT EXISTS "agency_team_relations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "agency_id" uuid NOT NULL REFERENCES "agency_profiles"("id") ON DELETE CASCADE,
  "team_id" uuid NOT NULL REFERENCES "teams"("id") ON DELETE CASCADE,
  "relation_kind" text NOT NULL DEFAULT 'past',
  "description" text,
  "country_code" char(2),
  "approved_by_user_id" uuid,
  "approved_at" timestamp with time zone NOT NULL DEFAULT now(),
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "agency_team_relations_unique" UNIQUE ("agency_id", "team_id")
);

CREATE INDEX IF NOT EXISTS "agency_team_relations_agency_idx"
  ON "agency_team_relations" ("agency_id");
CREATE INDEX IF NOT EXISTS "agency_team_relations_country_idx"
  ON "agency_team_relations" ("agency_id", "country_code");

CREATE TABLE IF NOT EXISTS "agency_team_relation_submissions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "agency_id" uuid NOT NULL REFERENCES "agency_profiles"("id") ON DELETE CASCADE,
  "submitted_by_user_id" uuid NOT NULL,
  "status" text NOT NULL DEFAULT 'pending',
  "note" text,
  "resolution_note" text,
  "submitted_at" timestamp with time zone NOT NULL DEFAULT now(),
  "reviewed_at" timestamp with time zone,
  "reviewed_by_user_id" uuid
);

CREATE INDEX IF NOT EXISTS "agency_team_submissions_status_idx"
  ON "agency_team_relation_submissions" ("status");
CREATE INDEX IF NOT EXISTS "agency_team_submissions_agency_idx"
  ON "agency_team_relation_submissions" ("agency_id");

CREATE TABLE IF NOT EXISTS "agency_team_relation_proposals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "submission_id" uuid NOT NULL REFERENCES "agency_team_relation_submissions"("id") ON DELETE CASCADE,
  "team_id" uuid REFERENCES "teams"("id") ON DELETE SET NULL,
  "proposed_team_name" text,
  "proposed_team_country" text,
  "proposed_team_country_code" char(2),
  "proposed_team_division" text,
  "proposed_team_transfermarkt_url" text,
  "relation_kind" text NOT NULL DEFAULT 'past',
  "description" text,
  "status" text NOT NULL DEFAULT 'pending',
  "materialized_team_id" uuid REFERENCES "teams"("id") ON DELETE SET NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "agency_team_proposals_submission_idx"
  ON "agency_team_relation_proposals" ("submission_id");

-- RLS — public select for portfolio, manager/admin write via server actions.
ALTER TABLE "agency_country_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agency_team_relations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agency_team_relation_submissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agency_team_relation_proposals" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agency_country_profiles_select" ON "agency_country_profiles";
CREATE POLICY "agency_country_profiles_select"
  ON "agency_country_profiles" FOR SELECT USING (true);

DROP POLICY IF EXISTS "agency_team_relations_select" ON "agency_team_relations";
CREATE POLICY "agency_team_relations_select"
  ON "agency_team_relations" FOR SELECT USING (true);
