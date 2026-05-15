-- Revert views to SECURITY DEFINER to fix Permission Denied (42501) on auth.users and other restricted queries
ALTER VIEW public.player_dashboard_state SET (security_invoker = false);
ALTER VIEW public.career_revision_inbox SET (security_invoker = false);
ALTER VIEW public.player_dashboard_publishing_state SET (security_invoker = false);