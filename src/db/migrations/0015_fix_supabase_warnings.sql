-- 1. Fix: RLS Policy Always True for stats_revision_items
-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Enable delete for admin/users" ON public.stats_revision_items;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.stats_revision_items;
DROP POLICY IF EXISTS "Enable update for admin/users" ON public.stats_revision_items;

-- Create secure policies matching the business logic (owner of the career revision request or admin)
CREATE POLICY "stats_revision_manage_own" ON public.stats_revision_items FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.career_revision_requests r
        WHERE r.id = stats_revision_items.request_id AND (r.submitted_by_user_id = auth.uid() OR public.is_admin(auth.uid()))
    )
) WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.career_revision_requests r
        WHERE r.id = stats_revision_items.request_id AND (r.submitted_by_user_id = auth.uid() OR public.is_admin(auth.uid()))
    )
);

CREATE POLICY "stats_revision_read_own" ON public.stats_revision_items FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.career_revision_requests r
        WHERE r.id = stats_revision_items.request_id AND (r.submitted_by_user_id = auth.uid() OR public.is_admin(auth.uid()) OR r.reviewed_by_user_id = auth.uid())
    )
);

-- 2. Fix: Public Bucket Allows Listing
-- Drop the broad SELECT policies that allow listing the buckets
DROP POLICY IF EXISTS "Public Access to Agency Logos" ON storage.objects;
DROP POLICY IF EXISTS "player-media public read" ON storage.objects;
DROP POLICY IF EXISTS "teams_public_read" ON storage.objects;

-- 3. Fix: Function Search Path Mutable (20 functions)
-- Dynamically add SET search_path = public to all flagged functions
DO $$ 
DECLARE
    func RECORD;
BEGIN
    FOR func IN 
        SELECT p.oid::regprocedure AS signature
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' 
        AND p.proname IN (
            'slugify', 'trg_player_honours_updated', 'trg_profile_theme_settings_updated',
            'trg_profile_sections_visibility_updated', 'trg_player_links_updated',
            'handle_new_user', 'pa_defaults_tg', 'country_guess_codes',
            'trg_set_country_code_from_text', 'pa_approve_tg', 'country_guess_code',
            'set_updated_at', 'max_media_allowed', 'active_invitations_count',
            'can_add_media', 'get_limits_for_player', 'plan_allows_reviews',
            'plan_allows_invites', 'max_active_invitations', 'can_create_invitation'
        )
    LOOP
        EXECUTE 'ALTER FUNCTION public.' || func.signature || ' SET search_path = public';
    END LOOP;
END $$;

-- 4. Fix: Extension in Public
-- Ensure extensions schema exists and move unaccent
CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION unaccent SET SCHEMA extensions;