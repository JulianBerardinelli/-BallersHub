-- Custom RLS + trigger setup for blog_posts.
--
-- This file is NOT tracked by Drizzle (no entry in meta/_journal.json).
-- It must be applied manually via Supabase MCP apply_migration, in the
-- same step as 0001_cynical_ted_forrester.sql, against supabase-dev
-- first and only against prod after explicit owner authorization.
--
-- See docs/blog/README.md §3 for the policy design rationale.

-- ============================================================
-- Enable RLS
-- ============================================================
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- updated_at trigger (reuses existing public.set_updated_at function)
-- ============================================================
DROP TRIGGER IF EXISTS blog_posts_set_updated_at ON public.blog_posts;
CREATE TRIGGER blog_posts_set_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- Policies
-- ============================================================

-- 1. Public: anyone (anon + authenticated) sees only published posts.
DROP POLICY IF EXISTS blog_posts_public_select ON public.blog_posts;
CREATE POLICY blog_posts_public_select ON public.blog_posts
  FOR SELECT
  USING (status = 'published');

-- 2. Author: sees their own posts in any state (drafts, pending,
--    rejected, even published) — useful for /blog/drafts dashboard.
DROP POLICY IF EXISTS blog_posts_author_select ON public.blog_posts;
CREATE POLICY blog_posts_author_select ON public.blog_posts
  FOR SELECT
  USING (auth.uid() = author_user_id);

-- 3. Admin: full read access. Reuses the global is_admin() function
--    (security definer) — same pattern as user_profiles and player_profiles.
DROP POLICY IF EXISTS blog_posts_admin_select ON public.blog_posts;
CREATE POLICY blog_posts_admin_select ON public.blog_posts
  FOR SELECT
  USING (public.is_admin(auth.uid()));

-- 4. Insert: only users whitelisted as bloggers can create posts, and
--    the row must be authored by themselves (no spoofing).
DROP POLICY IF EXISTS blog_posts_blogger_insert ON public.blog_posts;
CREATE POLICY blog_posts_blogger_insert ON public.blog_posts
  FOR INSERT
  WITH CHECK (
    auth.uid() = author_user_id
    AND EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
        AND up.is_blogger = true
    )
  );

-- 5. Author update: only on their own posts, only while in draft or
--    rejected state. The WITH CHECK clause forces the resulting row to
--    remain authored by them AND status must be draft or pending_review
--    — preventing the author from self-publishing or self-rejecting.
DROP POLICY IF EXISTS blog_posts_author_update ON public.blog_posts;
CREATE POLICY blog_posts_author_update ON public.blog_posts
  FOR UPDATE
  USING (
    auth.uid() = author_user_id
    AND status IN ('draft', 'rejected')
  )
  WITH CHECK (
    auth.uid() = author_user_id
    AND status IN ('draft', 'pending_review')
  );

-- 6. Admin update: full power. Used to approve (status → published),
--    reject (status → rejected + rejection_reason), unpublish
--    (status → draft), or fix content.
DROP POLICY IF EXISTS blog_posts_admin_update ON public.blog_posts;
CREATE POLICY blog_posts_admin_update ON public.blog_posts
  FOR UPDATE
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 7. Delete: admin only. Authors do NOT delete; they can leave a post
--    in draft state instead. This preserves audit trail.
DROP POLICY IF EXISTS blog_posts_admin_delete ON public.blog_posts;
CREATE POLICY blog_posts_admin_delete ON public.blog_posts
  FOR DELETE
  USING (public.is_admin(auth.uid()));

-- ============================================================
-- Grants (server-side roles)
-- ============================================================
-- Most reads go through the Supabase JS client (anon + authenticated
-- roles, governed by RLS above). The Drizzle layer connects as the
-- postgres role which bypasses RLS — make sure server-side actions
-- still validate ownership in application code.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_posts TO authenticated;
GRANT SELECT ON public.blog_posts TO anon;
