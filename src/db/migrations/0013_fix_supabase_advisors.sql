-- 1. Vistas con "Security Definer" y Exposición de auth.users
ALTER VIEW public.player_dashboard_state SET (security_invoker = true);
ALTER VIEW public.career_revision_inbox SET (security_invoker = true);
ALTER VIEW public.player_dashboard_publishing_state SET (security_invoker = true);

-- 2. Activar Row Level Security (RLS)
ALTER TABLE public.player_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manager_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manager_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_invites ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de Lectura Pública (Catalogos y Perfiles)
-- Cualquiera puede leer países, divisiones, agencias y perfiles de manager
CREATE POLICY public_read_countries ON public.countries FOR SELECT USING (true);
CREATE POLICY public_read_divisions ON public.divisions FOR SELECT USING (true);
CREATE POLICY public_read_agencies ON public.agency_profiles FOR SELECT USING (true);
CREATE POLICY public_read_managers ON public.manager_profiles FOR SELECT USING (true);

-- 4. Políticas de Artículos de Jugadores
-- Lectura pública, escritura solo por el dueño (jugador) o admin
CREATE POLICY public_read_articles ON public.player_articles FOR SELECT USING (true);
CREATE POLICY player_manage_articles ON public.player_articles FOR ALL USING (
    exists (select 1 from public.player_profiles p where p.id = player_id and p.user_id = auth.uid())
    or public.is_admin(auth.uid())
) WITH CHECK (
    exists (select 1 from public.player_profiles p where p.id = player_id and p.user_id = auth.uid())
    or public.is_admin(auth.uid())
);

-- 5. Políticas para Perfiles Propios
CREATE POLICY manager_manage_own ON public.manager_profiles FOR ALL USING (
    user_id = auth.uid() or public.is_admin(auth.uid())
) WITH CHECK (user_id = auth.uid() or public.is_admin(auth.uid()));

CREATE POLICY app_manage_own ON public.manager_applications FOR ALL USING (
    user_id = auth.uid() or public.is_admin(auth.uid())
) WITH CHECK (user_id = auth.uid() or public.is_admin(auth.uid()));

-- 6. Políticas de Invitaciones (Tienen TOKENS sensibles)
-- Solo pueden ver/gestionar los que enviaron la invitación y los admins
CREATE POLICY manager_manage_agency_invites ON public.agency_invites FOR ALL USING (
    invited_by_user_id = auth.uid() or public.is_admin(auth.uid())
) WITH CHECK (invited_by_user_id = auth.uid() or public.is_admin(auth.uid()));

CREATE POLICY manager_manage_player_invites ON public.player_invites FOR ALL USING (
    invited_by_user_id = auth.uid() or public.is_admin(auth.uid())
) WITH CHECK (invited_by_user_id = auth.uid() or public.is_admin(auth.uid()));

-- 7. Políticas de Escritura solo para Admins (Catálogos y Agencias global)
CREATE POLICY admin_manage_countries ON public.countries FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY admin_manage_divisions ON public.divisions FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY admin_manage_agencies ON public.agency_profiles FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));