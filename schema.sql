-- Approve team function
CREATE OR REPLACE FUNCTION public.approve_team(
  p_team_id uuid,
  p_slug text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
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

  update public.teams
    set status = 'approved', slug = s, updated_at = now()
  where id = p_team_id;

  if t.requested_in_application_id is not null then
    update public.player_applications
      set current_team_id = p_team_id,
          current_club = (select name from public.teams where id = p_team_id),
          proposed_team_name = null,
          proposed_team_country = null,
          proposed_team_category = null,
          proposed_team_transfermarkt_url = null,
          updated_at = now()
    where id = t.requested_in_application_id
      and proposed_team_name is not null;
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

-- Asegurar que los equipos no se eliminen al borrar solicitudes o trayectorias
alter table public.teams
  drop constraint if exists teams_requested_in_application_id_fkey,
  add constraint teams_requested_in_application_id_fkey
    foreign key (requested_in_application_id)
    references public.player_applications(id)
    on delete set null;

alter table public.teams
  drop constraint if exists teams_requested_from_career_item_id_fkey,
  add constraint teams_requested_from_career_item_id_fkey
    foreign key (requested_from_career_item_id)
    references public.career_item_proposals(id)
    on delete set null;

alter table public.career_item_proposals
  add column if not exists player_id uuid;

alter table public.career_item_proposals
  add column if not exists career_item_id uuid;

alter table public.career_items
  add column if not exists updated_at timestamptz not null default now();

-- Player media: bandera de foto principal reutilizada por el dashboard
ALTER TABLE public.player_media
  ADD COLUMN IF NOT EXISTS is_primary boolean DEFAULT false NOT NULL;

CREATE INDEX IF NOT EXISTS idx_player_media_primary_photo
  ON public.player_media (player_id)
  WHERE is_primary;

-- Auditoría de cambios críticos desde el dashboard
CREATE TABLE IF NOT EXISTS public.profile_change_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL,
  user_id uuid,
  field text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profile_change_logs_player_id_fkey'
      AND conrelid = 'public.profile_change_logs'::regclass
  ) THEN
    ALTER TABLE public.profile_change_logs
      ADD CONSTRAINT profile_change_logs_player_id_fkey
      FOREIGN KEY (player_id)
      REFERENCES public.player_profiles(id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profile_change_logs_user_id_fkey'
      AND conrelid = 'public.profile_change_logs'::regclass
  ) THEN
    ALTER TABLE public.profile_change_logs
      ADD CONSTRAINT profile_change_logs_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES auth.users(id)
      ON DELETE SET NULL;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_profile_change_logs_player
  ON public.profile_change_logs (player_id);

CREATE INDEX IF NOT EXISTS idx_profile_change_logs_created_at
  ON public.profile_change_logs (created_at);

ALTER TABLE public.profile_change_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profile_change_logs_select ON public.profile_change_logs;
CREATE POLICY profile_change_logs_select
  ON public.profile_change_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.player_profiles p
      WHERE p.id = profile_change_logs.player_id
        AND (p.user_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

DROP POLICY IF EXISTS profile_change_logs_insert ON public.profile_change_logs;
CREATE POLICY profile_change_logs_insert
  ON public.profile_change_logs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.player_profiles p
      WHERE p.id = profile_change_logs.player_id
        AND (p.user_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

GRANT ALL ON public.profile_change_logs TO anon;
GRANT ALL ON public.profile_change_logs TO authenticated;
GRANT ALL ON public.profile_change_logs TO service_role;

-- Información personal extendida para el dashboard
CREATE TABLE IF NOT EXISTS public.player_personal_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL,
  document_type text,
  document_number text,
  document_country text,
  document_country_code char(2),
  languages text[],
  phone text,
  residence_city text,
  residence_country text,
  residence_country_code char(2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.player_personal_details
  ADD COLUMN IF NOT EXISTS document_type text,
  ADD COLUMN IF NOT EXISTS document_number text,
  ADD COLUMN IF NOT EXISTS document_country text,
  ADD COLUMN IF NOT EXISTS document_country_code char(2),
  ADD COLUMN IF NOT EXISTS languages text[],
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS residence_city text,
  ADD COLUMN IF NOT EXISTS residence_country text,
  ADD COLUMN IF NOT EXISTS residence_country_code char(2),
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'player_personal_details_player_id_key'
      AND conrelid = 'public.player_personal_details'::regclass
  ) THEN
    ALTER TABLE public.player_personal_details
      ADD CONSTRAINT player_personal_details_player_id_key UNIQUE (player_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'player_personal_details_player_id_fkey'
      AND conrelid = 'public.player_personal_details'::regclass
  ) THEN
    ALTER TABLE public.player_personal_details
      ADD CONSTRAINT player_personal_details_player_id_fkey
      FOREIGN KEY (player_id)
      REFERENCES public.player_profiles(id)
      ON DELETE CASCADE;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_player_personal_details_player
  ON public.player_personal_details (player_id);

CREATE INDEX IF NOT EXISTS idx_cip_player
  ON public.career_item_proposals (player_id);

CREATE INDEX IF NOT EXISTS idx_cip_career_item
  ON public.career_item_proposals (career_item_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'biu_set_country_code_player_personal'
      AND tgrelid = 'public.player_personal_details'::regclass
  ) THEN
    CREATE TRIGGER biu_set_country_code_player_personal
      BEFORE INSERT OR UPDATE OF residence_country, residence_country_code,
        document_country, document_country_code
      ON public.player_personal_details
      FOR EACH ROW
      EXECUTE FUNCTION public.trg_set_country_code_from_text();
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_player_personal_details_updated'
      AND tgrelid = 'public.player_personal_details'::regclass
  ) THEN
    CREATE TRIGGER trg_player_personal_details_updated
      BEFORE UPDATE ON public.player_personal_details
      FOR EACH ROW
      EXECUTE FUNCTION public.set_updated_at();
  END IF;
END$$;

ALTER TABLE public.player_personal_details ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS player_personal_details_select ON public.player_personal_details;
CREATE POLICY player_personal_details_select
  ON public.player_personal_details
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.player_profiles p
      WHERE p.id = player_personal_details.player_id
        AND (p.user_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

DROP POLICY IF EXISTS player_personal_details_insert ON public.player_personal_details;
CREATE POLICY player_personal_details_insert
  ON public.player_personal_details
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.player_profiles p
      WHERE p.id = player_personal_details.player_id
        AND (p.user_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

DROP POLICY IF EXISTS player_personal_details_update ON public.player_personal_details;
CREATE POLICY player_personal_details_update
  ON public.player_personal_details
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.player_profiles p
      WHERE p.id = player_personal_details.player_id
        AND (p.user_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.player_profiles p
      WHERE p.id = player_personal_details.player_id
        AND (p.user_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

DROP POLICY IF EXISTS player_personal_details_delete ON public.player_personal_details;
CREATE POLICY player_personal_details_delete
  ON public.player_personal_details
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.player_profiles p
      WHERE p.id = player_personal_details.player_id
        AND (p.user_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

GRANT ALL ON public.player_personal_details TO anon;
GRANT ALL ON public.player_personal_details TO authenticated;
GRANT ALL ON public.player_personal_details TO service_role;

-- Cascada consistente al eliminar un perfil de jugador
ALTER TABLE public.career_items
  DROP CONSTRAINT IF EXISTS career_items_player_id_fkey,
  ADD CONSTRAINT career_items_player_id_fkey
    FOREIGN KEY (player_id)
    REFERENCES public.player_profiles(id)
    ON DELETE CASCADE;

ALTER TABLE public.career_item_proposals
  DROP CONSTRAINT IF EXISTS career_item_proposals_player_id_fkey,
  ADD CONSTRAINT career_item_proposals_player_id_fkey
    FOREIGN KEY (player_id)
    REFERENCES public.player_profiles(id)
    ON DELETE SET NULL;

ALTER TABLE public.career_item_proposals
  DROP CONSTRAINT IF EXISTS career_item_proposals_career_item_id_fkey,
  ADD CONSTRAINT career_item_proposals_career_item_id_fkey
    FOREIGN KEY (career_item_id)
    REFERENCES public.career_items(id)
    ON DELETE SET NULL;

ALTER TABLE public.player_media
  DROP CONSTRAINT IF EXISTS player_media_player_id_fkey,
  ADD CONSTRAINT player_media_player_id_fkey
    FOREIGN KEY (player_id)
    REFERENCES public.player_profiles(id)
    ON DELETE CASCADE;

ALTER TABLE public.profile_change_logs
  DROP CONSTRAINT IF EXISTS profile_change_logs_player_id_fkey,
  ADD CONSTRAINT profile_change_logs_player_id_fkey
    FOREIGN KEY (player_id)
    REFERENCES public.player_profiles(id)
    ON DELETE CASCADE;

ALTER TABLE public.player_personal_details
  DROP CONSTRAINT IF EXISTS player_personal_details_player_id_fkey,
  ADD CONSTRAINT player_personal_details_player_id_fkey
    FOREIGN KEY (player_id)
    REFERENCES public.player_profiles(id)
    ON DELETE CASCADE;

ALTER TABLE public.review_invitations
  DROP CONSTRAINT IF EXISTS review_invitations_player_id_fkey,
  ADD CONSTRAINT review_invitations_player_id_fkey
    FOREIGN KEY (player_id)
    REFERENCES public.player_profiles(id)
    ON DELETE CASCADE;

ALTER TABLE public.reviewer_permissions
  DROP CONSTRAINT IF EXISTS reviewer_permissions_player_id_fkey,
  ADD CONSTRAINT reviewer_permissions_player_id_fkey
    FOREIGN KEY (player_id)
    REFERENCES public.player_profiles(id)
    ON DELETE CASCADE;

ALTER TABLE public.reviews
  DROP CONSTRAINT IF EXISTS reviews_player_id_fkey,
  ADD CONSTRAINT reviews_player_id_fkey
    FOREIGN KEY (player_id)
    REFERENCES public.player_profiles(id)
    ON DELETE CASCADE;

ALTER TABLE public.stats_seasons
  DROP CONSTRAINT IF EXISTS stats_seasons_player_id_fkey,
  ADD CONSTRAINT stats_seasons_player_id_fkey
    FOREIGN KEY (player_id)
    REFERENCES public.player_profiles(id)
    ON DELETE CASCADE;

-- Client dashboard aggregated view for player context hydration
create or replace view public.player_dashboard_state as
select
  u.id as user_id,
  u.email as user_email,
  p.id as profile_id,
  p.status as profile_status,
  p.slug as profile_slug,
  p.visibility as profile_visibility,
  p.full_name as profile_full_name,
  p.birth_date as profile_birth_date,
  p.nationality as profile_nationality,
  p.nationality_codes as profile_nationality_codes,
  p.positions as profile_positions,
  p.current_club as profile_current_club,
  p.bio as profile_bio,
  p.avatar_url as profile_avatar_url,
  p.foot as profile_foot,
  p.height_cm as profile_height_cm,
  p.weight_kg as profile_weight_kg,
  p.updated_at as profile_updated_at,
  p.plan_public as profile_plan_public,
  p.market_value_eur as profile_market_value_eur,
  ppd.id as personal_details_id,
  ppd.document_type as personal_document_type,
  ppd.document_number as personal_document_number,
  ppd.document_country as personal_document_country,
  ppd.document_country_code as personal_document_country_code,
  ppd.languages as personal_languages,
  ppd.phone as personal_phone,
  ppd.residence_city as personal_residence_city,
  ppd.residence_country as personal_residence_country,
  ppd.residence_country_code as personal_residence_country_code,
  app.id as application_id,
  app.status as application_status,
  app.created_at as application_created_at,
  app.plan_requested as application_plan_requested,
  app.transfermarkt_url as application_transfermarkt_url,
  app.external_profile_url as application_external_profile_url,
  app.full_name as application_full_name,
  app.nationality as application_nationality,
  app.positions as application_positions,
  app.current_club as application_current_club,
  app.notes as application_notes,
  sub.plan as subscription_plan,
  sub.status as subscription_status,
  media.url as primary_photo_url
from auth.users u
left join public.player_profiles p on p.user_id = u.id
left join public.player_personal_details ppd on ppd.player_id = p.id
left join lateral (
  select pa.*
  from public.player_applications pa
  where pa.user_id = u.id
  order by pa.created_at desc
  limit 1
) app on true
left join public.subscriptions sub on sub.user_id = u.id
left join lateral (
  select pm.url
  from public.player_media pm
  where pm.player_id = p.id and pm.type = 'photo'::public.media_type and pm.is_primary = true
  order by pm.created_at desc
  limit 1
) media on true;

grant select on public.player_dashboard_state to authenticated;
grant select on public.player_dashboard_state to service_role;

CREATE OR REPLACE FUNCTION public.apply_career_proposals(
  p_application_id uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_app record;
  v_player_id uuid;
  v_now timestamptz := now();
  v_cnt_updated int := 0;
  v_cnt_inserted int := 0;
  v_cnt_skipped int := 0;
  r record;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'forbidden';
  end if;

  select a.*, p.id as player_profile_id
  into v_app
  from public.player_applications a
  join public.player_profiles p on p.user_id = a.user_id
  where a.id = p_application_id
  order by p.created_at desc
  limit 1;

  if not found then
    raise exception 'application_or_profile_not_found';
  end if;

  v_player_id := v_app.player_profile_id;
  if v_player_id is null then
    raise exception 'player_profile_not_found';
  end if;

  for r in
    select *
    from public.career_item_proposals cip
    where cip.application_id = p_application_id
      and cip.status = 'accepted'
      and cip.materialized_at is null
  loop
    if r.career_item_id is not null then
      update public.career_items as ci
         set club = coalesce((select t.name from public.teams t where t.id = coalesce(r.team_id, ci.team_id)), r.club),
             division = r.division,
             start_date = case when r.start_year is not null then make_date(r.start_year, 1, 1) else null end,
             end_date = case when r.end_year is not null then make_date(r.end_year, 12, 31) else null end,
             team_id = r.team_id,
             updated_at = v_now
       where ci.id = r.career_item_id
         and ci.player_id = v_player_id;

      if found then
        v_cnt_updated := v_cnt_updated + 1;
      else
        v_cnt_skipped := v_cnt_skipped + 1;
      end if;
    else
      insert into public.career_items (
        player_id,
        club,
        division,
        start_date,
        end_date,
        team_id,
        created_at,
        updated_at
      )
      values (
        v_player_id,
        coalesce((select t.name from public.teams t where t.id = r.team_id), r.club),
        r.division,
        case when r.start_year is not null then make_date(r.start_year, 1, 1) else null end,
        case when r.end_year is not null then make_date(r.end_year, 12, 31) else null end,
        r.team_id,
        v_now,
        v_now
      );
      v_cnt_inserted := v_cnt_inserted + 1;
    end if;

    update public.career_item_proposals
       set materialized_at = v_now
     where id = r.id;
  end loop;

  with latest as (
    select *
    from public.career_items
    where player_id = v_player_id
    order by case when end_date is null then 0 else 1 end,
             coalesce(end_date, start_date, make_date(1900,1,1)) desc,
             start_date desc
    limit 1
  )
  update public.player_profiles
     set current_team_id = latest.team_id,
         current_club = case
           when latest.team_id is not null then coalesce((select t.name from public.teams t where t.id = latest.team_id), latest.club)
           else latest.club
         end,
         updated_at = v_now
   from latest
   where public.player_profiles.id = v_player_id;

  if not found then
    update public.player_profiles
       set current_team_id = null,
           current_club = null,
           updated_at = v_now
     where id = v_player_id;
  end if;

  return jsonb_build_object(
    'updated', v_cnt_updated,
    'inserted', v_cnt_inserted,
    'skipped', v_cnt_skipped
  );
end;
$$;

grant all on function public.apply_career_proposals(p_application_id uuid) to anon;
grant all on function public.apply_career_proposals(p_application_id uuid) to authenticated;
grant all on function public.apply_career_proposals(p_application_id uuid) to service_role;
