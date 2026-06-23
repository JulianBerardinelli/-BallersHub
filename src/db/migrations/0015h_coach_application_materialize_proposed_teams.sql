-- ===============================================================
-- 0015h_coach_application_materialize_proposed_teams.sql
--
-- Manual complementario (no tracked by Drizzle — function PL/pgSQL).
-- Aplica: CREATE OR REPLACE de public.materialize_coach_career_from_application
--   para que, al aprobar la solicitud de DT (onboarding), un EQUIPO PROPUESTO
--   (no del catálogo) entre a `public.teams` como status='pending' — igual que
--   el flujo de revisión de trayectoria del DT (app-level) y que el de players.
--   Antes la función sólo linkeaba a un team existente por nombre; si no existía,
--   caía a texto libre (team_id NULL) y la propuesta no llegaba a /admin/teams.
--
-- Comportamiento nuevo (por etapa aceptada):
--   1. team_id directo (catálogo elegido)              -> se usa.
--   2. si no, match por nombre EXCLUYENDO 'rejected'    -> se linkea (approved>pending).
--      (espeja 0015b_materialize_career_excludes_rejected_teams del lado player).
--   3. si no hay match Y era un proposed_team_name      -> se CREA teams pending
--      (slug vía translate(), SIN unaccent — roto en dev; ver #241) + se linkea.
--   4. club de texto libre sin proposed_team_name       -> comportamiento previo
--      (linkea si existe, si no queda texto; NO crea team).
--   Resolución dentro del loop -> dedup entre etapas de la misma alta.
--
-- Requires: la función ya existe (baseline 0015a). teams.requested_by_user_id.
-- Aplicado en dev  (ciolizjshimyvyonlssq) via MCP apply_migration el 2026-06-22.
-- Aplicado en prod (erdvpcfjynkhcrqktozd) via MCP apply_migration el 2026-06-22 (OK explícito del owner).
-- Idempotente: sí (CREATE OR REPLACE FUNCTION; mismo signature).
-- ===============================================================

CREATE OR REPLACE FUNCTION public.materialize_coach_career_from_application(p_application_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_app record;
  v_coach_id uuid;
  v_cnt_inserted int := 0;
  v_now timestamptz := now();
  r record;
  v_team_id uuid;
  v_proposed text;
  v_name text;
  v_base_slug text;
  v_slug text;
  v_n int;
begin
  if not public.is_admin(auth.uid()) then raise exception 'forbidden'; end if;

  select a.*, p.id as coach_profile_id
  into v_app
  from public.coach_applications a
  join public.coach_profiles p on p.user_id = a.user_id
  where a.id = p_application_id
  order by p.created_at desc
  limit 1;
  if not found then raise exception 'application_or_profile_not_found'; end if;
  v_coach_id := v_app.coach_profile_id;

  for r in
    select cip.*
    from public.coach_career_item_proposals cip
    where cip.application_id = p_application_id
      and cip.status = 'accepted'
      and cip.materialized_at is null
    order by cip.start_year asc nulls last, cip.created_at asc
  loop
    -- Resolve the team for this stage. Runs INSIDE the loop so a team created
    -- for an earlier stage is reused by a later one with the same name (no dups).
    v_team_id := r.team_id;
    if v_team_id is null then
      v_proposed := nullif(trim(r.proposed_team_name), '');
      v_name := coalesce(v_proposed, nullif(trim(r.club), ''));
      if v_name is not null then
        -- Existing catalog team by name; never link to a rejected one
        -- (mirrors the player function 0015b).
        select t.id into v_team_id
        from public.teams t
        where lower(t.name) = lower(v_name)
          and t.status <> 'rejected'
        order by case when t.status = 'approved' then 0 when t.status = 'pending' then 1 else 2 end,
                 t.created_at asc
        limit 1;

        -- No match AND it was an explicit proposed team -> create it as pending so
        -- an admin completes it (crest/badge) from /admin/teams.
        if v_team_id is null and v_proposed is not null then
          v_base_slug := trim(both '-' from regexp_replace(
            lower(translate(v_name,
              'áàäâãéèëêíìïîóòöôõúùüûñçÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇ',
              'aaaaaeeeeiiiiooooouuuuncAAAAAEEEEIIIIOOOOOUUUUNC')),
            '[^a-z0-9]+', '-', 'g'));
          if v_base_slug = '' then v_base_slug := 'team'; end if;
          v_base_slug := left(v_base_slug, 56);
          v_slug := v_base_slug;
          v_n := 1;
          while exists (select 1 from public.teams t where t.slug = v_slug) loop
            v_n := v_n + 1;
            v_slug := v_base_slug || '-' || v_n::text;
          end loop;

          insert into public.teams (
            name, slug, country, country_code, category, transfermarkt_url,
            status, visibility, requested_by_user_id
          )
          values (
            v_name, v_slug, r.proposed_team_country, r.proposed_team_country_code,
            r.division, r.proposed_team_transfermarkt_url,
            'pending', 'public', v_app.user_id
          )
          returning id into v_team_id;
        end if;
      end if;
    end if;

    insert into public.coach_career_items (
      coach_id, club, role_title, division, division_id, secondary_division_id,
      start_date, end_date, team_id
    )
    values (
      v_coach_id,
      coalesce((select t.name from public.teams t where t.id = v_team_id), r.club),
      r.role_title,
      r.division,
      r.division_id,
      r.secondary_division_id,
      case when r.start_year is not null then make_date(r.start_year, 1, 1)  else null end,
      case when r.end_year   is not null then make_date(r.end_year, 12, 31) else null end,
      v_team_id
    );
    update public.coach_career_item_proposals set materialized_at = v_now where id = r.id;
    v_cnt_inserted := v_cnt_inserted + 1;
  end loop;

  return jsonb_build_object('inserted', v_cnt_inserted);
end;
$function$;
