-- Phase 5: engagement segmentation.
-- We track per-subscriber "consecutive deliveries without an open" so we
-- can auto-cool-down disengaged contacts before they hurt deliverability.
--
-- Tier rules (computed at write time, surfaced in the UI):
--   0 skipped         → active
--   1-2 skipped       → warm
--   3-5 skipped       → cold      (audience filter can opt them out)
--   6+ skipped        → dormant   (cron auto-suppresses with reason='dormant')

ALTER TABLE "marketing_subscriptions"
  ADD COLUMN IF NOT EXISTS "consecutive_skipped_sends" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "engagement_tier" text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS "last_engaged_at" timestamp with time zone;

-- Backfill an initial tier based on existing counters so we don't classify
-- everyone as 'active' on day one. Anyone with prior opens stays active;
-- anyone with sends but zero opens is bumped straight to cold.
UPDATE "marketing_subscriptions"
SET "engagement_tier" = CASE
  WHEN "total_opens" > 0 THEN 'active'
  WHEN "total_sends" >= 6 THEN 'dormant'
  WHEN "total_sends" >= 3 THEN 'cold'
  WHEN "total_sends" >= 1 THEN 'warm'
  ELSE 'active'
END,
"consecutive_skipped_sends" = CASE
  WHEN "total_opens" > 0 THEN 0
  ELSE LEAST("total_sends", 99)
END,
"last_engaged_at" = "last_opened_at"
WHERE "engagement_tier" = 'active' AND "total_sends" > 0;

CREATE INDEX IF NOT EXISTS "marketing_subscriptions_tier_idx"
  ON "marketing_subscriptions" ("engagement_tier");
CREATE INDEX IF NOT EXISTS "marketing_subscriptions_skip_idx"
  ON "marketing_subscriptions" ("consecutive_skipped_sends");
