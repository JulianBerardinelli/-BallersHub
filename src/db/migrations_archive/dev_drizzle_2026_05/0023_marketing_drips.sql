-- Phase 4: drip campaign engine.
-- One row in `marketing_drip_configs` = one step. Multi-step drips
-- ("Day 3 / 7 / 14 of onboarding") are modeled as 3 sibling configs.
-- Enrollments are scheduled rows that the cron route processes.

CREATE TABLE IF NOT EXISTS "marketing_drip_configs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "slug" text NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "template_key" text NOT NULL,
  "default_subject" text NOT NULL,
  "default_template_props" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "delay_seconds" integer NOT NULL DEFAULT 0,
  "trigger_event" text NOT NULL DEFAULT 'manual',
  "exit_condition" text,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "marketing_drip_configs_slug_unique"
  ON "marketing_drip_configs" ("slug");
CREATE INDEX IF NOT EXISTS "marketing_drip_configs_trigger_idx"
  ON "marketing_drip_configs" ("trigger_event");

CREATE TABLE IF NOT EXISTS "marketing_drip_enrollments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "drip_id" uuid NOT NULL REFERENCES "marketing_drip_configs"("id") ON DELETE CASCADE,
  "email" text NOT NULL,
  "user_id" uuid,
  "enrolled_at" timestamp with time zone NOT NULL DEFAULT now(),
  "scheduled_for" timestamp with time zone NOT NULL,
  "status" text NOT NULL DEFAULT 'pending',
  "send_id" uuid REFERENCES "marketing_sends"("id") ON DELETE SET NULL,
  "error" text,
  "context" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "marketing_drip_enrollments_due_idx"
  ON "marketing_drip_enrollments" ("status", "scheduled_for");
CREATE INDEX IF NOT EXISTS "marketing_drip_enrollments_drip_idx"
  ON "marketing_drip_enrollments" ("drip_id");
CREATE INDEX IF NOT EXISTS "marketing_drip_enrollments_email_idx"
  ON "marketing_drip_enrollments" ("email");
CREATE INDEX IF NOT EXISTS "marketing_drip_enrollments_user_idx"
  ON "marketing_drip_enrollments" ("user_id");
-- Prevent duplicate active enrollments per (drip, email) — but allow
-- multiple historical entries (sent / cancelled / exited) so we keep
-- the audit trail intact.
CREATE UNIQUE INDEX IF NOT EXISTS "marketing_drip_enrollments_active_unique"
  ON "marketing_drip_enrollments" ("drip_id", "email", "status");

-- Seed the default onboarding drips. These match the cadence we
-- recommended in the strategy doc: profile-completion nudges at days
-- 3 and 7 post-signup, both exit if the player completed their profile
-- in the meantime.
INSERT INTO "marketing_drip_configs"
  ("slug", "name", "description", "template_key", "default_subject",
   "default_template_props", "delay_seconds", "trigger_event", "exit_condition")
VALUES
  (
    'welcome_player_immediate',
    'Bienvenida — Jugador (inmediata)',
    'Email de bienvenida que se envía apenas un usuario completa el signup.',
    'welcome_player',
    'Bienvenido a BallersHub',
    '{}'::jsonb,
    0,
    'player_signup',
    NULL -- never skip: it's the welcome
  ),
  (
    'profile_completion_d3',
    'Profile completion · Día 3',
    'Primer recordatorio para que el jugador complete su perfil.',
    'profile_completion',
    'Te falta poco para publicar tu perfil',
    '{}'::jsonb,
    3 * 24 * 60 * 60, -- 3 days
    'player_signup',
    'has_completed_profile'
  ),
  (
    'profile_completion_d7',
    'Profile completion · Día 7',
    'Segundo recordatorio (más urgente) para completar el perfil.',
    'profile_completion',
    'Tu perfil aún no está publicado',
    '{}'::jsonb,
    7 * 24 * 60 * 60, -- 7 days
    'player_signup',
    'has_completed_profile'
  )
ON CONFLICT (slug) DO NOTHING;
