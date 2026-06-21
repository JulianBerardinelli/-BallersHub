-- 0015c_fix_player_slug_generation.sql
--
-- Mismo bug de slug que 0015b (coach), ahora en approve_player_application.
-- El slug se armaba con lower(regexp_replace(full_name, '[^a-z0-9]+','-')) —el
-- regexp_replace ANTES del lower()— así que cada inicial en mayúscula caía en la
-- clase [^a-z0-9] y se la comía el trim: "Tomas Elena" => "omas-lena".
--
-- A diferencia del coach, en players el bug está LATENTE: el slug efectivo lo
-- setea el path app-level (TypeScript) en el onboarding, no esta RPC, así que
-- 0/32 player_profiles de prod tenían slug corrupto al momento del fix. Se
-- corrige igual por higiene/consistencia (si el path cambiara, la RPC debe dar
-- un slug correcto). NO requiere corrección de datos.
--
-- Fix idéntico al coach: lower() PRIMERO, transliterar acentos es/pt con
-- translate() (sin depender de extensions.unaccent, ausente en dev), después
-- regex + trim. Sólo cambia el bloque de slug_base.
--
-- Complementario: NO tracked en el journal de Drizzle. Se aplica a mano a dev
-- (ciolizjshimyvyonlssq) y prod (erdvpcfjynkhcrqktozd) vía MCP.

CREATE OR REPLACE FUNCTION public.approve_player_application(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public, extensions'
AS $function$
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
    update public.player_applications
    set status = 'approved',
        reviewed_by_user_id = coalesce(reviewed_by_user_id, auth.uid()),
        reviewed_at = coalesce(reviewed_at, now()),
        updated_at = now()
    where id = p_id AND status <> 'approved';
    return jsonb_build_object('player_id', existing_profile.id, 'slug', existing_profile.slug, 'idempotent', true);
  end if;

  -- Build unique slug: lower() PRIMERO, transliterar acentos (es/pt) y recién
  -- después el regex + trim. (Antes: lower(regexp_replace(name,...)) corría el
  -- regex sobre el nombre con mayúsculas y se comía las iniciales — bug.)
  slug_base := lower(coalesce(nullif(btrim(app.full_name), ''), 'player'));
  slug_base := translate(slug_base, 'áàäâãéèëêíìïîóòöôõúùüûñç', 'aaaaaeeeeiiiiooooouuuunc');
  slug_base := regexp_replace(slug_base, '[^a-z0-9]+', '-', 'g');
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
$function$;
