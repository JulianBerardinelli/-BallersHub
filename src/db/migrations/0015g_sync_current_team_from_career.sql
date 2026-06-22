-- ===============================================================
-- 0015g_sync_current_team_from_career.sql
--
-- Manual complementario (no tracked by Drizzle — function + trigger PL/pgSQL).
-- Aplica: mantiene player_profiles.current_team_id / current_club SIEMPRE en
--   sync con la "etapa actual" de la trayectoria (career_items con end_date
--   IS NULL). Fuente única de verdad = la trayectoria. Cubre la materialización
--   del onboarding, la aprobación de revisiones, ediciones admin y cualquier
--   mutación futura de career_items, sin que ningún consumidor cambie (las
--   columnas siguen existiendo, sólo que siempre correctas).
-- Por qué: current_team_id se seteaba 1 sola vez (onboarding) y no se
--   re-sincronizaba con la trayectoria. El badge Libre/Contrato de /players y
--   el club mostrado podían contradecirse. Ver PR del badge (scouting) + review
--   P2 "fallback cuando el club actual no está materializado".
-- Requires: tablas public.player_profiles, public.career_items, public.teams
--   (baseline ya existente).
-- Idempotente: sí (CREATE OR REPLACE + DROP TRIGGER IF EXISTS; backfill por UPDATE
--   guardado con IS DISTINCT FROM).
-- Aplicado en dev  (ciolizjshimyvyonlssq) via MCP apply_migration el 2026-06-22.
--   Smoke test OK: objetos creados, backfill consistente (0 drift), trigger
--   verificado (cerrar etapa actual ⇒ current_team_id/current_club → NULL, reversible).
-- Aplicado en prod (erdvpcfjynkhcrqktozd) via MCP apply_migration el: PENDIENTE
-- ===============================================================

-- 1) Recalcula la etapa actual de UN jugador y la baja a player_profiles.
create or replace function public.sync_current_team_from_career(p_player_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_team_id uuid;
  v_club    text;
begin
  if p_player_id is null then return; end if;

  -- Etapa actual = la más reciente con end_date NULL (la UI fuerza una sola,
  -- pero ordenamos por las dudas). team_id puede ser NULL (club sin vínculo a
  -- teams): en ese caso current_team_id queda NULL y current_club usa el texto.
  select ci.team_id,
         coalesce((select t.name from public.teams t where t.id = ci.team_id), ci.club)
    into v_team_id, v_club
    from public.career_items ci
   where ci.player_id = p_player_id
     and ci.end_date is null
   order by ci.start_date desc nulls last, ci.created_at desc
   limit 1;

  -- Sin etapa actual ⇒ NULL/NULL (jugador libre). El guard IS DISTINCT FROM
  -- evita escrituras y bumps de updated_at innecesarios.
  update public.player_profiles pp
     set current_team_id = v_team_id,
         current_club    = v_club,
         updated_at      = now()
   where pp.id = p_player_id
     and (pp.current_team_id is distinct from v_team_id
          or pp.current_club  is distinct from v_club);
end;
$function$;

-- 2) Trigger wrapper: recalcula ante cualquier mutación de career_items.
create or replace function public.tg_sync_current_team_from_career()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if tg_op = 'DELETE' then
    perform public.sync_current_team_from_career(old.player_id);
    return old;
  end if;
  perform public.sync_current_team_from_career(new.player_id);
  -- Si un UPDATE moviera la etapa a otro jugador (no esperado), refrescar ambos.
  if tg_op = 'UPDATE' and new.player_id is distinct from old.player_id then
    perform public.sync_current_team_from_career(old.player_id);
  end if;
  return new;
end;
$function$;

drop trigger if exists trg_sync_current_team_from_career on public.career_items;
create trigger trg_sync_current_team_from_career
  after insert or update or delete on public.career_items
  for each row
  execute function public.tg_sync_current_team_from_career();

-- 3) Backfill idempotente: re-sincroniza todos los jugadores con su trayectoria.
--    En los datos actuales no cambia nada (0 drift verificado), deja todo prolijo.
do $backfill$
declare r record;
begin
  for r in select id from public.player_profiles loop
    perform public.sync_current_team_from_career(r.id);
  end loop;
end;
$backfill$;
