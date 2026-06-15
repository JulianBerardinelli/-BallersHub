-- ===============================================================
-- 0012a_approve_application_copies_gender.sql
--
-- Manual complementario (no tracked by Drizzle — las functions PL/pgSQL
-- no las modela Drizzle, ver docs/db/migration-workflow.md §3).
--
-- Aplica: CREATE OR REPLACE de public.approve_player_application para que
--   copie player_applications.gender -> player_profiles.gender al aprobar.
--   Sin este cambio el perfil tomaría el DEFAULT 'male' de la columna e
--   ignoraría la elección de la jugadora.
--
-- Contexto: hoy el camino de aprobación VIVO es el route TS
--   src/app/api/admin/applications/[id]/approve/route.ts (que inserta el
--   perfil directamente y ya copia gender). Esta función SQL es el camino
--   legacy (su llamada RPC está comentada en ese route). Se actualiza igual
--   para mantener el artefacto de schema correcto y consistente por si se
--   re-habilita.
--
-- Requires: 0012_next_dexter_bennett.sql aplicado primero (crea el enum
--   `gender` y las columnas player_applications.gender / player_profiles.gender).
-- Idempotente: sí (CREATE OR REPLACE).
-- Diff vs versión previa (0002_sync_historical_drift.sql §approve_player_application):
--   + columna `gender` en el INSERT, valor coalesce(app.gender,'male').
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
    (user_id, slug, full_name, gender, nationality, positions, current_club, bio, visibility, status, updated_at)
  values
    (app.user_id, slug_candidate, coalesce(app.full_name, 'Player'),
     coalesce(app.gender, 'male'),
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
