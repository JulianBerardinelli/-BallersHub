-- ===============================================================
-- 0015b_materialize_career_excludes_rejected_teams.sql
--
-- Manual complementario (no tracked by Drizzle — function PL/pgSQL).
-- Aplica: CREATE OR REPLACE de public.materialize_career_from_application para
--   que al resolver `resolved_team_id` IGNORE los teams con status = 'rejected'
--   en los tres caminos del coalesce (cip.team_id directo, requested_from_career_item_id,
--   y match por nombre). Antes, rechazar un team dejaba que una propuesta de
--   trayectoria aceptada materializara career_items apuntando a un team rechazado;
--   ahora, si el único candidato está rechazado, resolved_team_id queda NULL y el
--   career_item se materializa con el nombre del club como texto, sin vínculo.
-- Requires: la función ya existe (baseline). No depende de tablas nuevas.
-- Aplicado en dev  (ciolizjshimyvyonlssq) via MCP apply_migration el 2026-06-21.
-- Aplicado en prod (erdvpcfjynkhcrqktozd) via MCP apply_migration el 2026-06-21.
-- Idempotente: sí (CREATE OR REPLACE FUNCTION; mismo signature).
-- ===============================================================

CREATE OR REPLACE FUNCTION public.materialize_career_from_application(p_application_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
        -- Path directo: sólo si el team enlazado NO fue rechazado.
        (select t.id from public.teams t where t.id = cip.team_id and t.status <> 'rejected'),
        -- Path por origen de la propuesta: excluye rechazados.
        (select t.id from public.teams t
          where t.requested_from_career_item_id = cip.id and t.status <> 'rejected'
          limit 1),
        -- Path por nombre: excluye rechazados, prioriza approved > pending.
        (select t.id from public.teams t
          where lower(t.name) = lower(coalesce(cip.proposed_team_name, cip.club))
            and t.status <> 'rejected'
          order by case when t.status = 'approved' then 0 when t.status = 'pending' then 1 else 2 end,
                   t.created_at asc
          limit 1)
      ) as resolved_team_id
    from public.career_item_proposals cip
    where cip.application_id = p_application_id
      and cip.status = 'accepted'
      and cip.materialized_at is null
  loop
    insert into public.career_items (
      player_id, club, division, division_id, secondary_division_id,
      start_date, end_date, team_id
    )
    values (
      v_player_id,
      coalesce( (select t.name from public.teams t where t.id = r.resolved_team_id), r.club ),
      r.division,
      r.division_id,
      r.secondary_division_id,
      case when r.start_year is not null then make_date(r.start_year, 1, 1) else null end,
      case when r.end_year   is not null then make_date(r.end_year, 12,31) else null end,
      r.resolved_team_id
    );
    update public.career_item_proposals set materialized_at = v_now where id = r.id;
    v_cnt_inserted := v_cnt_inserted + 1;
  end loop;
  return jsonb_build_object('inserted', v_cnt_inserted);
end;
$function$;
