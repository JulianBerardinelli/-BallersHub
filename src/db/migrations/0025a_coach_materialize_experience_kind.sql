-- ===============================================================
-- 0025a_coach_materialize_experience_kind.sql
--
-- Manual complementario (no tracked by Drizzle — function PL/pgSQL).
-- Aplica: CREATE OR REPLACE de public.materialize_coach_career_from_application
--   para el eje "tipo de experiencia" (staff_experience_kind: club/job/project,
--   migración 0025). Supersede la versión de 0020a. Dos cambios:
--     1) Solo las etapas `club` resuelven/crean un teams row. `job` (trabajo en
--        institución) y `project` (proyecto personal) fuerzan team_id NULL y NO
--        matchean por nombre ni crean teams pending → mata el spam de equipos
--        que generaban las etapas de texto libre.
--     2) Copia `experience_kind` de la proposal a coach_career_items.
--   El resto del cuerpo (roles, divisiones, slug, fechas) NO cambia.
-- Requires: 0025 (columna experience_kind en coach_career_items +
--   coach_career_item_proposals) + 0020a (versión previa de la función).
-- Aplicar: dev (ciolizjshimyvyonlssq) primero via MCP apply_migration, luego
--   prod (erdvpcfjynkhcrqktozd) con OK explícito del owner.
-- Idempotente: sí (CREATE OR REPLACE FUNCTION; mismo signature).
-- Ver docs/staff/ONBOARDING-AUDIT.md (Fase B) + docs/staff/PLAN.md §5.2.
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
    v_team_id := r.team_id;
    -- Etapas no-club (job/project) nunca linkean a un teams row: forzamos NULL
    -- y saltamos toda la resolución (match por nombre + creación de pending).
    if coalesce(r.experience_kind, 'club') <> 'club' then
      v_team_id := null;
    elsif v_team_id is null then
      v_proposed := nullif(trim(r.proposed_team_name), '');
      v_name := coalesce(v_proposed, nullif(trim(r.club), ''));
      if v_name is not null then
        select t.id into v_team_id
        from public.teams t
        where lower(t.name) = lower(v_name)
          and t.status <> 'rejected'
        order by case when t.status = 'approved' then 0 when t.status = 'pending' then 1 else 2 end,
                 t.created_at asc
        limit 1;

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
      coach_id, club, experience_kind, role_title, roles, division, division_id,
      secondary_division_id, start_date, end_date, team_id
    )
    values (
      v_coach_id,
      coalesce((select t.name from public.teams t where t.id = v_team_id), r.club),
      coalesce(r.experience_kind, 'club'),
      r.role_title,
      r.roles,
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
