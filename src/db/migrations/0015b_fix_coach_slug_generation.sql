-- 0015b_fix_coach_slug_generation.sql
--
-- Fix: approve_coach_application generaba slugs corruptos cuando el nombre del
-- entrenador tenía mayúsculas. El slug se armaba con:
--     lower(regexp_replace(full_name, '[^a-z0-9]+', '-', 'g'))
-- es decir, el regexp_replace corría ANTES del lower(). Como la clase
-- [^a-z0-9] solo admite minúsculas, cada inicial en mayúscula (R, P, E, …)
-- caía en la clase, se reemplazaba por '-' y luego el trim de guiones se la
-- comía:  "Rivero Paulo Ezequiel"  =>  "ivero-aulo-zequiel".
--
-- El fix: lowercasear el nombre ANTES del regexp_replace. Así las iniciales ya
-- están en minúscula cuando corre la clase [^a-z0-9] y se conservan.
--
-- NOTA: deliberadamente NO usa public.slugify() — slugify llama a
-- extensions.unaccent(), que NO está instalada en la branch dev (drift del
-- rebuild), así que slugify revienta ahí y haría fallar la aprobación de
-- coaches en dev. En su lugar transliteramos los acentos comunes (es/pt) con
-- translate() —función core, sin extensión— así "José Núñez" => "jose-nunez"
-- y funciona idéntico en dev, prod y cualquier DB fresca.
--
-- Complementario: NO está tracked en el journal de Drizzle. Se aplica a mano a
-- dev (ciolizjshimyvyonlssq) y prod (erdvpcfjynkhcrqktozd) vía MCP.

CREATE OR REPLACE FUNCTION public.approve_coach_application(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  app record;
  existing_profile record;
  slug_base text;
  slug_candidate text;
  n int := 1;
  exists_slug boolean;
  new_coach_id uuid;
  lic jsonb;
begin
  if not public.is_admin(auth.uid()) then raise exception 'forbidden'; end if;

  select * into app from public.coach_applications where id = p_id;
  if not found then raise exception 'application % not found', p_id; end if;

  -- Idempotencia: si el user ya tiene un coach_profile, no recreamos.
  select id, slug into existing_profile from public.coach_profiles where user_id = app.user_id;
  if found then
    update public.coach_applications
    set status = 'approved',
        reviewed_by_user_id = coalesce(reviewed_by_user_id, auth.uid()),
        reviewed_at = coalesce(reviewed_at, now()),
        updated_at = now()
    where id = p_id AND status <> 'approved';
    return jsonb_build_object('coach_id', existing_profile.id, 'slug', existing_profile.slug, 'idempotent', true);
  end if;

  -- Slug determinístico: lower() PRIMERO, transliterar acentos comunes (es/pt)
  -- con translate() —sin depender de la extensión unaccent, ausente en dev—, y
  -- recién después el regex y el trim de guiones.
  -- (Antes: lower(regexp_replace(name, '[^a-z0-9]+','-')) corría el regex sobre
  -- el nombre con mayúsculas, que caían en [^a-z0-9] y se las comía el trim —
  -- "Rivero Paulo Ezequiel" => "ivero-aulo-zequiel". Bug corregido.)
  slug_base := lower(coalesce(nullif(btrim(app.full_name), ''), 'coach'));
  slug_base := translate(slug_base, 'áàäâãéèëêíìïîóòöôõúùüûñç', 'aaaaaeeeeiiiiooooouuuunc');
  slug_base := regexp_replace(slug_base, '[^a-z0-9]+', '-', 'g');
  slug_base := trim(both '-' from slug_base);
  if slug_base = '' then slug_base := 'coach'; end if;
  slug_candidate := left(slug_base, 60);
  loop
    select exists(select 1 from public.coach_profiles where slug = slug_candidate) into exists_slug;
    exit when not exists_slug;
    n := n + 1;
    slug_candidate := left(slug_base, 60 - length(n::text) - 1) || '-' || n::text;
    if n > 999 then raise exception 'no available slug'; end if;
  end loop;

  insert into public.coach_profiles
    (user_id, slug, full_name, nationality, role_title, current_club, bio, visibility, status, updated_at)
  values
    (app.user_id, slug_candidate, coalesce(app.full_name, 'Coach'),
     app.nationality, app.role_title, app.current_club, null, 'public', 'approved', now())
  returning id into new_coach_id;

  -- Materializar licencias declaradas en la aplicación → coach_licenses
  for lic in select * from jsonb_array_elements(coalesce(app.licenses_draft, '[]'::jsonb))
  loop
    if coalesce(lic->>'title', '') <> '' then
      insert into public.coach_licenses (coach_id, title, issuer, awarded_year, status)
      values (
        new_coach_id,
        lic->>'title',
        lic->>'issuer',
        case when lic->>'year' ~ '^\d+$' then (lic->>'year')::int else null end,
        'approved'::review_status
      );
    end if;
  end loop;

  update public.coach_applications
  set status = 'approved',
      reviewed_by_user_id = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
  where id = p_id;

  return jsonb_build_object('coach_id', new_coach_id, 'slug', slug_candidate, 'idempotent', false);
end;
$function$;
