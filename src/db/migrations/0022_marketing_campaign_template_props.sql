-- Phase 3 admin UI: store the template-specific props (headline, body, CTA, etc.)
-- alongside the campaign so the dispatcher can re-render at send time.
ALTER TABLE "marketing_campaigns"
  ADD COLUMN IF NOT EXISTS "template_props" jsonb NOT NULL DEFAULT '{}'::jsonb;
