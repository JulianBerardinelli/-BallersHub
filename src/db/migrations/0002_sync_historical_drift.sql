-- ===============================================================
-- 0002_sync_historical_drift.sql
--
-- Syncs prod (erdvpcfjynkhcrqktozd) with dev (avhctddkbcneugtqqxxk)
-- state as of 2026-05-20.
--
-- Closes the historical drift left after the 2026-05-15 launch
-- migration that bundled SQL by hand and skipped these subsequent
-- changes (which dev received but prod never did):
--
--   • 9 PL/pgSQL functions (career approval + team management flow)
--   • 4 UNIQUE constraints (upsert idempotency safety)
--   • 1 RLS policy on stats_revision_items
--   • 2 storage buckets (teams + divisions) + 8 storage RLS policies
--
-- ALL operations idempotent:
--   - Functions use CREATE OR REPLACE
--   - Constraints wrapped in DO blocks with pg_constraint existence check
--   - Policies use DROP IF EXISTS + CREATE
--   - Buckets use INSERT ... ON CONFLICT DO NOTHING
--
-- SQL extracted from `pg_dump --schema-only --schema=public` of dev +
-- MCP queries for storage.* schema (excluded from --schema=public dump).
--
-- Apply via MCP apply_migration against prod ONLY after owner OK.
-- Safe to re-apply if interrupted.
-- ===============================================================

-- ===============================================================
-- SECTION 1 — 9 PL/pgSQL functions
-- ===============================================================

CREATE OR REPLACE FUNCTION public.approve_player_application(p_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public, extensions'
    AS $$
declare
  app record;
  existing_profile record;
  slug_base text;
  slug_candidate text;
  n int := 1;
  exists_slug boolean;
  new_player_id uuid;
begin
  if not public.is_admin(auth.uid()) then raise exception 'forbidden'; end if;
  select * into app from public.player_applications where id = p_id;
  if not found then raise exception 'application % not found', p_id; end if;

  -- Idempotency: if this user already has a player_profile, return it.
  select id, slug into existing_profile from public.player_profiles where user_id = app.user_id;
  if found then
    -- Ensure application is marked approved (in case it wasn't yet)
    update public.player_applications
    set status = 'approved',
        reviewed_by_user_id = coalesce(reviewed_by_user_id, auth.uid()),
        reviewed_at = coalesce(reviewed_at, now()),
        updated_at = now()
    where id = p_id AND status <> 'approved';
    return jsonb_build_object('player_id', existing_profile.id, 'slug', existing_profile.slug, 'idempotent', true);
  end if;

  -- Build unique slug
  slug_base := coalesce(app.full_name, 'player');
  slug_base := lower(regexp_replace(slug_base, '[^a-z0-9]+', '-', 'g'));
  slug_base := trim(both '-' from slug_base);
  if slug_base = '' then slug_base := 'player'; end if;
  slug_candidate := left(slug_base, 60);
  loop
    select exists(select 1 from public.player_profiles where slug = slug_candidate) into exists_slug;
    exit when not exists_slug;
    n := n + 1;
    slug_candidate := left(slug_base, 60 - length(n::text) - 1) || '-' || n::text;
    if n > 999 then raise exception 'no available slug'; end if;
  end loop;

  insert into public.player_profiles
    (user_id, slug, full_name, nationality, positions, current_club, bio, visibility, status, updated_at)
  values
    (app.user_id, slug_candidate, coalesce(app.full_name, 'Player'),
     app.nationality, app.positions, app.current_club, null, 'public', 'approved', now())
  returning id into new_player_id;

  update public.player_applications
  set status = 'approved',
      reviewed_by_user_id = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
  where id = p_id;

  return jsonb_build_object('player_id', new_player_id, 'slug', slug_candidate, 'idempotent', false);
end;
$$;

-- NOTE: The remaining 8 functions are extracted verbatim from the dev
-- pg_dump and listed below. Each prefixed with CREATE OR REPLACE for
-- idempotency.
--
-- For reasons of file size and review clarity, the full SQL of the
-- other 8 functions is appended below in the same format as the one
-- above. They came directly from the dev dump and were not edited
-- except for the CREATE → CREATE OR REPLACE prefix substitution.
CREATE OR REPLACE FUNCTION public.approve_team(p_team_id uuid, p_slug text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public, extensions'
    AS $$
declare
  t record;
  s text;
begin
  if not public.is_admin(auth.uid()) then raise exception 'forbidden'; end if;
  select * into t from public.teams where id = p_team_id;
  if not found then raise exception 'team % not found', p_team_id; end if;
  s := coalesce(p_slug, public.slugify(t.name));
  if exists (select 1 from public.teams where slug = s and id <> p_team_id and status = 'approved') then
    raise exception 'slug % already taken', s;
  end if;
  update public.teams set status = 'approved', slug = s, updated_at = now() where id = p_team_id;
  if t.requested_in_application_id is not null then
    update public.player_applications
      set current_team_id = p_team_id,
          current_club = (select name from public.teams where id = p_team_id),
          proposed_team_name = null, proposed_team_country = null,
          proposed_team_category = null, proposed_team_transfermarkt_url = null,
          updated_at = now()
    where id = t.requested_in_application_id;
  end if;
  update public.player_profiles
    set current_team_id = p_team_id,
        current_club = (select name from public.teams where id = p_team_id),
        updated_at = now()
  where current_team_id = p_team_id
     or (current_team_id is null and lower(current_club) = lower((select name from public.teams where id = p_team_id)));
  return p_team_id;
end;
$$;
CREATE OR REPLACE FUNCTION public.search_teams(p_q text, p_limit integer DEFAULT 10) RETURNS TABLE(id uuid, name text, slug text, country text, country_code text, crest_url text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public, extensions'
    AS $$
  select t.id, t.name, t.slug, t.country, t.country_code, t.crest_url
  from public.teams t
  where t.status = 'approved'
    and (
      t.name ilike '%'||p_q||'%' or
      exists (select 1 from unnest(coalesce(t.alt_names, '{}')) a where a ilike '%'||p_q||'%')
    )
  order by t.name asc
  limit p_limit
$$;
CREATE OR REPLACE FUNCTION public.request_team_from_application(p_application_id uuid, p_name text, p_country text DEFAULT NULL::text, p_category text DEFAULT NULL::text, p_tm_url text DEFAULT NULL::text, p_country_code text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public, extensions'
    AS $$
declare
  app record;
  existing_id uuid;
  new_id uuid;
  s text;
begin
  if auth.uid() is null then raise exception 'unauthenticated'; end if;
  select * into app from public.player_applications where id = p_application_id;
  if not found then raise exception 'application % not found', p_application_id; end if;
  if app.user_id <> auth.uid() and not public.is_admin(auth.uid()) then raise exception 'forbidden'; end if;
  s := public.slugify(p_name);
  select t.id into existing_id
  from public.teams t
  where (t.slug = s or (lower(t.name)=lower(p_name) and coalesce(t.country,'')=coalesce(p_country,'')))
    and t.status = 'approved'
  limit 1;
  if existing_id is not null then
    update public.player_applications
      set current_team_id = existing_id,
          current_club    = (select name from public.teams where id = existing_id),
          proposed_team_name   = null, proposed_team_country= null,
          proposed_team_category = null, proposed_team_transfermarkt_url = null,
          updated_at = now()
    where id = p_application_id;
    return existing_id;
  end if;
  select t.id into existing_id
  from public.teams t
  where lower(t.name)=lower(p_name) and coalesce(t.country,'')=coalesce(p_country,'')
  limit 1;
  if existing_id is not null then
    update public.teams
       set status = 'pending',
           requested_in_application_id = p_application_id,
           requested_by_user_id = auth.uid(),
           country_code = coalesce(nullif(p_country_code, ''), country_code),
           updated_at = now()
     where id = existing_id;
    update public.player_applications
       set current_team_id = null, proposed_team_name = p_name,
           proposed_team_country = p_country, proposed_team_category = p_category,
           proposed_team_transfermarkt_url = p_tm_url, updated_at = now()
     where id = p_application_id;
    return existing_id;
  end if;
  insert into public.teams (
    slug, name, country, country_code, kind, status,
    requested_by_user_id, requested_in_application_id
  )
  values (
    s, p_name, p_country, nullif(upper(p_country_code), ''),
    'club', 'pending', auth.uid(), p_application_id
  )
  returning id into new_id;
  update public.player_applications
     set current_team_id = null, proposed_team_name = p_name,
         proposed_team_country = p_country, proposed_team_category = p_category,
         proposed_team_transfermarkt_url = p_tm_url, updated_at = now()
   where id = p_application_id;
  return new_id;
end;
$$;
CREATE OR REPLACE FUNCTION public.request_team_from_career_proposal(p_proposal_id uuid, p_name text DEFAULT NULL::text, p_country text DEFAULT NULL::text, p_category text DEFAULT NULL::text, p_tm_url text DEFAULT NULL::text, p_country_code text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public, extensions'
    AS $$
declare
  pr record;
  new_team_id uuid;
begin
  if not public.is_admin(auth.uid()) then raise exception 'forbidden'; end if;
  select * into pr from public.career_item_proposals where id = p_proposal_id;
  if not found then raise exception 'proposal % not found', p_proposal_id; end if;
  insert into public.teams (
    name, country, category, transfermarkt_url, country_code,
    status, visibility, kind,
    requested_by_user_id, requested_in_application_id, requested_from_career_item_id
  )
  values (
    coalesce(p_name, pr.proposed_team_name, pr.club),
    coalesce(p_country, pr.proposed_team_country),
    p_category,
    coalesce(p_tm_url, pr.proposed_team_transfermarkt_url),
    coalesce(p_country_code, pr.proposed_team_country_code),
    'pending', 'public', 'club',
    pr.created_by_user_id, pr.application_id, pr.id
  )
  returning id into new_team_id;
  update public.career_item_proposals set team_id = new_team_id where id = pr.id;
  return new_team_id;
end;
$$;
CREATE OR REPLACE FUNCTION public.create_team_from_career_proposal(p_proposal_id uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public, extensions'
    AS $$
declare
  r record;
  new_team_id uuid;
begin
  if not public.is_admin(auth.uid()) then raise exception 'forbidden'; end if;
  select * into r from public.career_item_proposals where id = p_proposal_id;
  if not found then raise exception 'proposal % not found', p_proposal_id; end if;
  if r.team_id is not null then return r.team_id; end if;
  if r.proposed_team_name is null then raise exception 'proposal has no proposed team name'; end if;
  insert into public.teams(
    name, country, country_code, category, transfermarkt_url,
    status, visibility, kind, requested_by_user_id, requested_in_application_id
  )
  values (
    r.proposed_team_name, r.proposed_team_country, r.proposed_team_country_code,
    null, r.proposed_team_transfermarkt_url,
    'pending', 'public', 'club', r.created_by_user_id, r.application_id
  )
  returning id into new_team_id;
  update public.career_item_proposals
    set team_id = new_team_id,
        proposed_team_name = null, proposed_team_country = null,
        proposed_team_country_code = null, proposed_team_transfermarkt_url = null,
        updated_at = now()
  where id = p_proposal_id;
  return new_team_id;
end;
$$;
CREATE OR REPLACE FUNCTION public.materialize_career_from_application(p_application_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public, extensions'
    AS $$
declare
  v_app record;
  v_player_id uuid;
  v_cnt_inserted int := 0;
  v_now timestamptz := now();
  r record;
begin
  if not public.is_admin(auth.uid()) then raise exception 'forbidden'; end if;
  select a.*, p.id as player_profile_id
  into v_app
  from public.player_applications a
  join public.player_profiles p on p.user_id = a.user_id
  where a.id = p_application_id
  order by p.created_at desc
  limit 1;
  if not found then raise exception 'application_or_profile_not_found'; end if;
  v_player_id := v_app.player_profile_id;
  for r in
    select cip.*,
      coalesce(
        cip.team_id,
        (select t.id from public.teams t where t.requested_from_career_item_id = cip.id limit 1),
        (select t.id from public.teams t
          where lower(t.name) = lower(coalesce(cip.proposed_team_name, cip.club))
          order by case when t.status = 'approved' then 0 when t.status = 'pending' then 1 else 2 end,
                   t.created_at asc
          limit 1)
      ) as resolved_team_id
    from public.career_item_proposals cip
    where cip.application_id = p_application_id
      and cip.status = 'accepted'
      and cip.materialized_at is null
  loop
    insert into public.career_items (player_id, club, division, start_date, end_date, team_id)
    values (
      v_player_id,
      coalesce( (select t.name from public.teams t where t.id = r.resolved_team_id), r.club ),
      r.division,
      case when r.start_year is not null then make_date(r.start_year, 1, 1) else null end,
      case when r.end_year   is not null then make_date(r.end_year, 12,31) else null end,
      r.resolved_team_id
    );
    update public.career_item_proposals set materialized_at = v_now where id = r.id;
    v_cnt_inserted := v_cnt_inserted + 1;
  end loop;
  return jsonb_build_object('inserted', v_cnt_inserted);
end;
$$;
CREATE OR REPLACE FUNCTION public.accept_career_item_proposal(p_id uuid, p_team_id uuid DEFAULT NULL::uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public, extensions'
    AS $$
begin
  if not public.is_admin(auth.uid()) then raise exception 'forbidden'; end if;
  update public.career_item_proposals
    set status='accepted',
        team_id = coalesce(p_team_id, team_id),
        reviewed_by_user_id = auth.uid(),
        reviewed_at = now()
  where id = p_id;
end;
$$;
CREATE OR REPLACE FUNCTION public.reject_career_item_proposal(p_id uuid, p_reason text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public, extensions'
    AS $$
begin
  if not public.is_admin(auth.uid()) then raise exception 'forbidden'; end if;
  update public.career_item_proposals
    set status='rejected', reviewed_by_user_id = auth.uid(), reviewed_at = now()
  where id = p_id;
  insert into public.audit_logs(user_id, action, subject_table, subject_id, meta)
  values (auth.uid(), 'career_proposal_rejected', 'career_item_proposals', p_id, jsonb_build_object('reason', p_reason));
end;
$$;

-- ===============================================================
-- SECTION 2 — 4 UNIQUE constraints (idempotent via pg_constraint check)
-- ===============================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'marketing_drip_enrollments_unique') THEN
    ALTER TABLE ONLY public.marketing_drip_enrollments
        ADD CONSTRAINT marketing_drip_enrollments_unique UNIQUE (drip_id, email, status);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'player_personal_details_player_id_unique') THEN
    ALTER TABLE ONLY public.player_personal_details
        ADD CONSTRAINT player_personal_details_player_id_unique UNIQUE (player_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'player_profiles_user_id_unique') THEN
    ALTER TABLE ONLY public.player_profiles
        ADD CONSTRAINT player_profiles_user_id_unique UNIQUE (user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_user_id_unique') THEN
    ALTER TABLE ONLY public.subscriptions
        ADD CONSTRAINT subscriptions_user_id_unique UNIQUE (user_id);
  END IF;
END $$;

-- ===============================================================
-- SECTION 3 — RLS policy on stats_revision_items
-- ===============================================================

ALTER TABLE public.stats_revision_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS stats_revision_items_manage_via_request ON public.stats_revision_items;
CREATE POLICY stats_revision_items_manage_via_request ON public.stats_revision_items
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM public.career_revision_requests r
  WHERE ((r.id = stats_revision_items.request_id) AND ((r.submitted_by_user_id = auth.uid()) OR public.is_admin(auth.uid()))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.career_revision_requests r
  WHERE ((r.id = stats_revision_items.request_id) AND ((r.submitted_by_user_id = auth.uid()) OR public.is_admin(auth.uid()))))));

-- ===============================================================
-- SECTION 4 — Storage buckets (teams + divisions)
-- ===============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('teams', 'teams', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/svg+xml']),
  ('divisions', 'divisions', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/svg+xml'])
ON CONFLICT (id) DO NOTHING;

-- ===============================================================
-- SECTION 5 — Storage policies (8 = 4 per bucket × 2 buckets)
-- ===============================================================

-- TEAMS bucket ---------------------------------------------------

DROP POLICY IF EXISTS teams_storage_select ON storage.objects;
CREATE POLICY teams_storage_select ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'teams'::text);

DROP POLICY IF EXISTS teams_storage_insert ON storage.objects;
CREATE POLICY teams_storage_insert ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'teams'::text
    AND (
      public.is_admin(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.user_id = auth.uid()
          AND up.role = ANY (ARRAY['moderator'::role, 'analyst'::role])
      )
    )
  );

DROP POLICY IF EXISTS teams_storage_update ON storage.objects;
CREATE POLICY teams_storage_update ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'teams'::text
    AND (
      public.is_admin(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.user_id = auth.uid()
          AND up.role = ANY (ARRAY['moderator'::role, 'analyst'::role])
      )
    )
  )
  WITH CHECK (
    bucket_id = 'teams'::text
    AND (
      public.is_admin(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.user_id = auth.uid()
          AND up.role = ANY (ARRAY['moderator'::role, 'analyst'::role])
      )
    )
  );

DROP POLICY IF EXISTS teams_storage_delete ON storage.objects;
CREATE POLICY teams_storage_delete ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'teams'::text AND public.is_admin(auth.uid()));

-- DIVISIONS bucket -----------------------------------------------

DROP POLICY IF EXISTS divisions_storage_select ON storage.objects;
CREATE POLICY divisions_storage_select ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'divisions'::text);

DROP POLICY IF EXISTS divisions_storage_insert ON storage.objects;
CREATE POLICY divisions_storage_insert ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'divisions'::text
    AND (
      public.is_admin(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.user_id = auth.uid()
          AND up.role = ANY (ARRAY['moderator'::role, 'analyst'::role])
      )
    )
  );

DROP POLICY IF EXISTS divisions_storage_update ON storage.objects;
CREATE POLICY divisions_storage_update ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'divisions'::text
    AND (
      public.is_admin(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.user_id = auth.uid()
          AND up.role = ANY (ARRAY['moderator'::role, 'analyst'::role])
      )
    )
  )
  WITH CHECK (
    bucket_id = 'divisions'::text
    AND (
      public.is_admin(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.user_id = auth.uid()
          AND up.role = ANY (ARRAY['moderator'::role, 'analyst'::role])
      )
    )
  );

DROP POLICY IF EXISTS divisions_storage_delete ON storage.objects;
CREATE POLICY divisions_storage_delete ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'divisions'::text AND public.is_admin(auth.uid()));

-- ===============================================================
-- SECTION 6 — Storage SELECT policies for legacy buckets
-- (added after smoke test revealed these 4 SELECT policies existed
-- in dev but not in prod — public read on agency-logos, agency-media,
-- manager-avatars, player-media buckets was failing for anon users)
-- ===============================================================

DROP POLICY IF EXISTS agency_logos_storage_select ON storage.objects;
CREATE POLICY agency_logos_storage_select ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'agency-logos'::text);

DROP POLICY IF EXISTS agency_media_storage_select ON storage.objects;
CREATE POLICY agency_media_storage_select ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'agency-media'::text);

DROP POLICY IF EXISTS manager_avatars_storage_select ON storage.objects;
CREATE POLICY manager_avatars_storage_select ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'manager-avatars'::text);

DROP POLICY IF EXISTS player_media_storage_select ON storage.objects;
CREATE POLICY player_media_storage_select ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'player-media'::text);

-- ===============================================================
-- SECTION 7 — Fix definitivo unaccent: qualified call extensions.unaccent
--
-- El owner reportó error 'function unaccent(text) does not exist' al
-- aprobar jugadores en /admin/applications. La cadena que falla:
--
--   INSERT player_profiles
--     → trigger biu_set_nationality_codes_players
--       → trg_set_country_code_from_text
--         → country_guess_codes(text[])
--           → country_guess_code(text)
--             → unaccent(...)   ← FALLA: vive en schema extensions,
--                                  no en search_path
--
-- Fix 1 (insuficiente): agregar 'extensions' al search_path de las
-- 4 functions de la cadena (search_path resolution puede tener edge
-- cases con SQL functions IMMUTABLE).
--
-- Fix 2 (definitivo, este): qualify la llamada explícitamente como
-- `extensions.unaccent(...)` en country_guess_code y slugify. Bypassa
-- el search_path resolution completamente.
--
-- Aplicado en prod via migration fix_unaccent_explicit_extensions_qualifier
-- y fix_slugify_qualified_unaccent.
-- ===============================================================

CREATE OR REPLACE FUNCTION public.country_guess_code(p_country text) RETURNS text
    LANGUAGE sql IMMUTABLE
    SET search_path TO 'public, extensions'
    AS $$
  with norm as (
    select lower(extensions.unaccent(coalesce(trim(p_country), ''))) as s
  ),
  m(alias, iso2) as (
    values
      ('argentina','ar'), ('brasil','br'), ('brazil','br'), ('uruguay','uy'),
      ('chile','cl'), ('colombia','co'), ('peru','pe'),
      ('paraguay','py'), ('bolivia','bo'), ('venezuela','ve'),
      ('mexico','mx'), ('canada','ca'), ('estados unidos','us'), ('usa','us'), ('united states','us'),
      ('espana','es'), ('spain','es'), ('francia','fr'), ('france','fr'),
      ('italia','it'), ('italy','it'), ('alemania','de'), ('germany','de'),
      ('inglaterra','gb'), ('reino unido','gb'), ('uk','gb'), ('united kingdom','gb'),
      ('irlanda','ie'), ('ireland','ie'), ('portugal','pt'),
      ('paises bajos','nl'), ('holanda','nl'), ('netherlands','nl'),
      ('belgica','be'), ('belgium','be'), ('suiza','ch'), ('switzerland','ch'),
      ('austria','at'), ('polonia','pl'), ('dinamarca','dk'), ('denmark','dk'),
      ('noruega','no'), ('norway','no'), ('suecia','se'), ('sweden','se'),
      ('finlandia','fi'), ('finland','fi'), ('grecia','gr'), ('greece','gr'),
      ('turquia','tr'), ('turkey','tr'), ('rumania','ro'), ('romania','ro'),
      ('croacia','hr'), ('croatia','hr'), ('serbia','rs'),
      ('marruecos','ma'), ('morocco','ma'), ('argelia','dz'), ('algeria','dz'),
      ('egipto','eg'), ('egypt','eg'), ('sudafrica','za'), ('south africa','za'),
      ('nigeria','ng'), ('ghana','gh'),
      ('japon','jp'), ('japan','jp'), ('china','cn'),
      ('corea del sur','kr'), ('south korea','kr'),
      ('australia','au'), ('nueva zelanda','nz'), ('new zealand','nz'),
      ('arabia saudita','sa'), ('saudi arabia','sa'),
      ('emiratos arabes unidos','ae'), ('uae','ae'),
      ('catar','qa'), ('qatar','qa'), ('iran','ir'), ('iraq','iq'), ('israel','il')
  )
  select iso2
  from norm n
  join m on n.s = m.alias
  limit 1
$$;

CREATE OR REPLACE FUNCTION public.slugify(input text) RETURNS text
    LANGUAGE sql IMMUTABLE
    SET search_path TO 'public, extensions'
    AS $$
  select coalesce(
    nullif(
      regexp_replace(lower(extensions.unaccent(coalesce(input,''))), '[^a-z0-9]+', '-', 'g'),
      ''
    ), 'team'
  )
$$;
