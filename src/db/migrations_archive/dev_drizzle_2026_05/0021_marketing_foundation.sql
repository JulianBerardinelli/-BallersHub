-- Marketing email foundation: subscriptions, suppression list, campaigns, sends, raw events.
-- Source-of-truth lives here; Resend is only used as the SMTP/API. All sends filter
-- through `marketing_unsubscribes` + a per-recipient frequency cap before delivery.

-- 1) Subscriptions (granular consent + engagement metrics)
CREATE TABLE IF NOT EXISTS "marketing_subscriptions" (
  "email" text PRIMARY KEY,
  "user_id" uuid,
  "source" text NOT NULL,
  "consent_product" boolean NOT NULL DEFAULT true,
  "consent_offers" boolean NOT NULL DEFAULT false,
  "consent_pro_features" boolean NOT NULL DEFAULT false,
  "last_sent_at" timestamp with time zone,
  "last_opened_at" timestamp with time zone,
  "last_clicked_at" timestamp with time zone,
  "total_sends" integer NOT NULL DEFAULT 0,
  "total_opens" integer NOT NULL DEFAULT 0,
  "total_clicks" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "marketing_subscriptions_source_idx" ON "marketing_subscriptions" ("source");
CREATE INDEX IF NOT EXISTS "marketing_subscriptions_user_idx" ON "marketing_subscriptions" ("user_id");

-- 2) Unsubscribes — global suppression list. ALWAYS filtered out of every send.
CREATE TABLE IF NOT EXISTS "marketing_unsubscribes" (
  "email" text PRIMARY KEY,
  "unsubscribed_at" timestamp with time zone NOT NULL DEFAULT now(),
  "reason" text NOT NULL DEFAULT 'user_request',
  "campaign_id" uuid
);

-- 3) Campaigns — admin-created marketing pushes (broadcasts, drips, digests).
CREATE TABLE IF NOT EXISTS "marketing_campaigns" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "slug" text NOT NULL,
  "name" text NOT NULL,
  "subject" text NOT NULL,
  "preheader" text,
  "template_key" text NOT NULL,
  "audience_filter" jsonb NOT NULL,
  "status" text NOT NULL DEFAULT 'draft',
  "scheduled_at" timestamp with time zone,
  "started_at" timestamp with time zone,
  "finished_at" timestamp with time zone,
  "total_recipients" integer NOT NULL DEFAULT 0,
  "total_sent" integer NOT NULL DEFAULT 0,
  "total_delivered" integer NOT NULL DEFAULT 0,
  "total_opened" integer NOT NULL DEFAULT 0,
  "total_clicked" integer NOT NULL DEFAULT 0,
  "total_bounced" integer NOT NULL DEFAULT 0,
  "total_complained" integer NOT NULL DEFAULT 0,
  "created_by" uuid NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "marketing_campaigns_slug_unique" ON "marketing_campaigns" ("slug");
CREATE INDEX IF NOT EXISTS "marketing_campaigns_status_idx" ON "marketing_campaigns" ("status");

-- 4) Sends — every individual delivery attempt (idempotent + per-recipient analytics).
CREATE TABLE IF NOT EXISTS "marketing_sends" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "campaign_id" uuid REFERENCES "marketing_campaigns"("id") ON DELETE CASCADE,
  "email" text NOT NULL,
  "resend_message_id" text,
  "status" text NOT NULL DEFAULT 'queued',
  "error" text,
  "sent_at" timestamp with time zone,
  "last_event_at" timestamp with time zone
);

CREATE UNIQUE INDEX IF NOT EXISTS "marketing_sends_campaign_email_unique"
  ON "marketing_sends" ("campaign_id", "email");
CREATE INDEX IF NOT EXISTS "marketing_sends_message_id_idx" ON "marketing_sends" ("resend_message_id");
CREATE INDEX IF NOT EXISTS "marketing_sends_email_idx" ON "marketing_sends" ("email");
CREATE INDEX IF NOT EXISTS "marketing_sends_status_idx" ON "marketing_sends" ("status");

-- 5) Email events — raw Resend webhook payloads (audit trail + retries).
CREATE TABLE IF NOT EXISTS "marketing_email_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "resend_message_id" text,
  "event_type" text NOT NULL,
  "payload" jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "marketing_email_events_message_id_idx"
  ON "marketing_email_events" ("resend_message_id");
CREATE INDEX IF NOT EXISTS "marketing_email_events_type_idx" ON "marketing_email_events" ("event_type");
