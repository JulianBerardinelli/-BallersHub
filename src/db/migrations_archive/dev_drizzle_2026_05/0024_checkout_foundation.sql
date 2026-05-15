-- 0024_checkout_foundation.sql
-- Checkout foundation: billing addresses, checkout sessions, payment events,
-- plus extends `subscriptions` with the columns needed by Stripe + Mercado Pago.
-- Non-destructive: existing data is preserved.

-- ---------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE "checkout_currency" AS ENUM ('USD', 'ARS', 'EUR');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "checkout_processor" AS ENUM ('stripe', 'mercado_pago');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "checkout_session_status" AS ENUM (
    'pending',
    'redirected',
    'completed',
    'expired',
    'failed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "subscription_status_v2" AS ENUM (
    'incomplete',
    'trialing',
    'active',
    'past_due',
    'canceled',
    'paused'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "tax_id_type" AS ENUM (
    'dni',
    'cuit',
    'cuil',
    'nie',
    'nif',
    'vat',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------
-- billing_addresses
-- ---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "billing_addresses" (
  "id"             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"        uuid NOT NULL,
  "full_name"      text NOT NULL,
  "tax_id"         text,
  "tax_id_type"    "tax_id_type",
  "country_code"   text NOT NULL,                   -- ISO-3166 alpha-2 (AR, ES, US, …)
  "state"          text,
  "city"           text NOT NULL,
  "postal_code"    text NOT NULL,
  "street_line_1"  text NOT NULL,
  "street_line_2"  text,
  "phone"          text,
  "is_default"     boolean NOT NULL DEFAULT false,
  "created_at"     timestamptz NOT NULL DEFAULT now(),
  "updated_at"     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "billing_addresses_user_id_idx"
  ON "billing_addresses" ("user_id");

CREATE INDEX IF NOT EXISTS "billing_addresses_user_default_idx"
  ON "billing_addresses" ("user_id") WHERE "is_default" = true;

-- ---------------------------------------------------------------
-- subscriptions — extend the existing table
-- ---------------------------------------------------------------

ALTER TABLE "subscriptions"
  ADD COLUMN IF NOT EXISTS "plan_id"                 text,
  ADD COLUMN IF NOT EXISTS "currency"                "checkout_currency",
  ADD COLUMN IF NOT EXISTS "processor"               "checkout_processor",
  ADD COLUMN IF NOT EXISTS "processor_subscription_id" text,
  ADD COLUMN IF NOT EXISTS "processor_customer_id"   text,
  ADD COLUMN IF NOT EXISTS "trial_ends_at"           timestamptz,
  ADD COLUMN IF NOT EXISTS "current_period_starts_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "cancel_at_period_end"    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "billing_address_id"      uuid REFERENCES "billing_addresses"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "status_v2"               "subscription_status_v2";

CREATE INDEX IF NOT EXISTS "subscriptions_processor_sub_idx"
  ON "subscriptions" ("processor", "processor_subscription_id");

CREATE INDEX IF NOT EXISTS "subscriptions_user_status_idx"
  ON "subscriptions" ("user_id", "status_v2");

-- ---------------------------------------------------------------
-- checkout_sessions
-- ---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "checkout_sessions" (
  "id"                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"                  uuid,
  "plan_id"                  text NOT NULL,
  "currency"                 "checkout_currency" NOT NULL,
  "processor"                "checkout_processor" NOT NULL,
  "status"                   "checkout_session_status" NOT NULL DEFAULT 'pending',
  "billing_address_id"       uuid REFERENCES "billing_addresses"("id") ON DELETE SET NULL,
  "processor_session_id"     text,
  "processor_session_url"    text,
  "client_secret"            text,                         -- reservado para Stripe embedded
  "amount_minor"             integer NOT NULL,             -- monto total en centavos
  "trial_days"               integer NOT NULL DEFAULT 0,
  "metadata"                 jsonb NOT NULL DEFAULT '{}'::jsonb,
  "expires_at"               timestamptz,
  "completed_at"             timestamptz,
  "created_at"               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "checkout_sessions_user_idx"
  ON "checkout_sessions" ("user_id");

CREATE UNIQUE INDEX IF NOT EXISTS "checkout_sessions_processor_session_idx"
  ON "checkout_sessions" ("processor", "processor_session_id")
  WHERE "processor_session_id" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "checkout_sessions_status_idx"
  ON "checkout_sessions" ("status");

-- ---------------------------------------------------------------
-- payment_events  (audit trail for every webhook hit)
-- ---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "payment_events" (
  "id"                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "processor"            "checkout_processor" NOT NULL,
  "processor_event_id"   text NOT NULL,
  "event_type"           text NOT NULL,
  "checkout_session_id"  uuid REFERENCES "checkout_sessions"("id") ON DELETE SET NULL,
  "subscription_id"      uuid REFERENCES "subscriptions"("id") ON DELETE SET NULL,
  "payload"              jsonb NOT NULL,
  "processed"            boolean NOT NULL DEFAULT false,
  "processed_at"         timestamptz,
  "error_message"        text,
  "received_at"          timestamptz NOT NULL DEFAULT now()
);

-- Idempotency: a webhook event from a given processor must only be processed once.
CREATE UNIQUE INDEX IF NOT EXISTS "payment_events_processor_event_idx"
  ON "payment_events" ("processor", "processor_event_id");

CREATE INDEX IF NOT EXISTS "payment_events_unprocessed_idx"
  ON "payment_events" ("received_at") WHERE "processed" = false;

CREATE INDEX IF NOT EXISTS "payment_events_subscription_idx"
  ON "payment_events" ("subscription_id");

-- ---------------------------------------------------------------
-- updated_at trigger for billing_addresses
-- (subscriptions already had updated_at; we leave its trigger unchanged.)
-- ---------------------------------------------------------------

CREATE OR REPLACE FUNCTION "set_updated_at"() RETURNS trigger AS $$
BEGIN
  NEW."updated_at" := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "billing_addresses_set_updated_at" ON "billing_addresses";
CREATE TRIGGER "billing_addresses_set_updated_at"
  BEFORE UPDATE ON "billing_addresses"
  FOR EACH ROW EXECUTE FUNCTION "set_updated_at"();
