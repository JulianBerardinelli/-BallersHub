-- Tutorial Assistant — persistent state per user.
-- Idempotent. Safe to run multiple times.
--
-- We don't persist `completed_steps` here — completions are computed in
-- runtime from the actual profile state (avatar_url, careerItems count,
-- etc). This table only tracks user-driven UX events: dismissed_at when
-- the user closes the dock, completed_at on the first 100% snapshot,
-- last_seen_at as a heartbeat.
--
-- `audience` and `plan_at_start` are kept as the snapshot at first
-- bootstrap so we can detect plan transitions and re-trigger if needed.

CREATE TABLE IF NOT EXISTS public.user_tutorial_progress (
  user_id        UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  audience       TEXT NOT NULL CHECK (audience IN ('player', 'agency')),
  plan_at_start  TEXT NOT NULL CHECK (plan_at_start IN ('free', 'pro')),
  dismissed_at   TIMESTAMPTZ,
  completed_at   TIMESTAMPTZ,
  last_seen_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-update `updated_at` on any row mutation.
CREATE OR REPLACE FUNCTION public.touch_user_tutorial_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_tutorial_progress_updated_at
  ON public.user_tutorial_progress;
CREATE TRIGGER trg_user_tutorial_progress_updated_at
  BEFORE UPDATE ON public.user_tutorial_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_user_tutorial_progress_updated_at();

-- RLS: each user sees only their own progress row. Service role bypasses.
ALTER TABLE public.user_tutorial_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_tutorial_progress_self_read"
  ON public.user_tutorial_progress;
CREATE POLICY "user_tutorial_progress_self_read"
  ON public.user_tutorial_progress
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_tutorial_progress_self_upsert"
  ON public.user_tutorial_progress;
CREATE POLICY "user_tutorial_progress_self_upsert"
  ON public.user_tutorial_progress
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_tutorial_progress_self_update"
  ON public.user_tutorial_progress;
CREATE POLICY "user_tutorial_progress_self_update"
  ON public.user_tutorial_progress
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE ON public.user_tutorial_progress TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_tutorial_progress TO service_role;
