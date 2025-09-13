
\restrict 5YBcd24YxkcR9LrxZU1xfRiNFteNHmDy7GMxgGJerwwEt7P2vRyNAAcliBZwEgK


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "unaccent" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."invite_status" AS ENUM (
    'sent',
    'accepted',
    'expired',
    'revoked'
);


ALTER TYPE "public"."invite_status" OWNER TO "postgres";


CREATE TYPE "public"."media_type" AS ENUM (
    'photo',
    'video',
    'doc'
);


ALTER TYPE "public"."media_type" OWNER TO "postgres";


CREATE TYPE "public"."plan" AS ENUM (
    'free',
    'pro',
    'pro_plus'
);


ALTER TYPE "public"."plan" OWNER TO "postgres";


CREATE TYPE "public"."player_status" AS ENUM (
    'draft',
    'pending_review',
    'approved',
    'rejected'
);


ALTER TYPE "public"."player_status" OWNER TO "postgres";


CREATE TYPE "public"."review_status" AS ENUM (
    'pending',
    'approved',
    'rejected'
);


ALTER TYPE "public"."review_status" OWNER TO "postgres";


CREATE TYPE "public"."reviewer_perm_status" AS ENUM (
    'pending',
    'granted',
    'revoked'
);


ALTER TYPE "public"."reviewer_perm_status" OWNER TO "postgres";


CREATE TYPE "public"."role" AS ENUM (
    'member',
    'player',
    'coach',
    'manager',
    'reviewer',
    'admin'
);


ALTER TYPE "public"."role" OWNER TO "postgres";


CREATE TYPE "public"."team_kind" AS ENUM (
    'club',
    'national',
    'academy',
    'amateur'
);


ALTER TYPE "public"."team_kind" OWNER TO "postgres";


CREATE TYPE "public"."team_status" AS ENUM (
    'pending',
    'approved',
    'rejected'
);


ALTER TYPE "public"."team_status" OWNER TO "postgres";


CREATE TYPE "public"."visibility" AS ENUM (
    'public',
    'private'
);


ALTER TYPE "public"."visibility" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."accept_career_item_proposal"("p_id" "uuid", "p_team_id" "uuid" DEFAULT NULL::"uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'forbidden';
  end if;

  update public.career_item_proposals
    set status='accepted',
        team_id = coalesce(p_team_id, team_id),
        reviewed_by_user_id = auth.uid(),
        reviewed_at = now()
  where id = p_id;
end;
$$;


ALTER FUNCTION "public"."accept_career_item_proposal"("p_id" "uuid", "p_team_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."active_invitations_count"("p_player_id" "uuid") RETURNS integer
    LANGUAGE "sql" STABLE
    AS $$
  select count(*)::int
  from public.review_invitations i
  where i.player_id = p_player_id
    and i.status = 'sent'::invite_status
    and (i.expires_at is null or i.expires_at > now());
$$;


ALTER FUNCTION "public"."active_invitations_count"("p_player_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."approve_player_application"("p_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  app record;
  slug_base text;
  slug_candidate text;
  n int := 1;
  exists_slug boolean;
  new_player_id uuid;
begin
  -- Solo admins (tu función ya existe)
  if not public.is_admin(auth.uid()) then
    raise exception 'forbidden';
  end if;

  select * into app
  from public.player_applications
  where id = p_id;

  if not found then
    raise exception 'application % not found', p_id;
  end if;

  -- slug base
  slug_base := coalesce(app.full_name, 'player');
  slug_base := lower(regexp_replace(slug_base, '[^a-z0-9]+', '-', 'g'));
  slug_base := trim(both '-' from slug_base);
  if slug_base = '' then slug_base := 'player'; end if;
  slug_candidate := left(slug_base, 60);

  -- asegurar único
  loop
    select exists(select 1 from public.player_profiles where slug = slug_candidate)
      into exists_slug;
    exit when not exists_slug;
    n := n + 1;
    slug_candidate := left(slug_base, 60 - length(n::text) - 1) || '-' || n::text;
    if n > 999 then
      raise exception 'no available slug';
    end if;
  end loop;

  -- crear perfil
  insert into public.player_profiles
    (user_id, slug, full_name, nationality, positions, current_club, bio, visibility, status, updated_at)
  values
    (app.user_id, slug_candidate, coalesce(app.full_name, 'Player'), app.nationality, app.positions, app.current_club, null, 'public', 'approved', now())
  returning id into new_player_id;

  -- upsert suscripción free
  insert into public.subscriptions (user_id, plan, status, limits_json, updated_at)
  values (
    app.user_id,
    'free',
    'active',
    jsonb_build_object(
      'max_photos',0,
      'max_videos',1,
      'reviews_enabled',false,
      'can_invite_reviews',false,
      'max_active_invitations',0,
      'stats_by_year_enabled',false,
      'branding_ads_visible',true,
      'branding_partner','service'
    ),
    now()
  )
  on conflict (user_id) do update
  set plan = excluded.plan,
      status = excluded.status,
      limits_json = excluded.limits_json,
      updated_at = excluded.updated_at;

  -- marcar solicitud
  update public.player_applications
  set status = 'approved',
      reviewed_by_user_id = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
  where id = p_id;

  return jsonb_build_object('player_id', new_player_id, 'slug', slug_candidate);
end;
$$;


ALTER FUNCTION "public"."approve_player_application"("p_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."approve_team"("p_team_id" "uuid", "p_slug" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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

  -- si vino de una application, linkear y limpiar propuestos
  if t.requested_in_application_id is not null then
    update public.player_applications
      set current_team_id = p_team_id,
          current_club = (select name from public.teams where id = p_team_id),
          proposed_team_name = null,
          proposed_team_country = null,
          proposed_team_category = null,
          proposed_team_transfermarkt_url = null,
          updated_at = now()
    where id = t.requested_in_application_id;
  end if;

  -- sincronizar perfiles con ese team
  update public.player_profiles
    set current_team_id = p_team_id,
        current_club = (select name from public.teams where id = p_team_id),
        updated_at = now()
  where current_team_id = p_team_id
     or (current_team_id is null and lower(current_club) = lower((select name from public.teams where id = p_team_id)));

  return p_team_id;
end;
$$;


ALTER FUNCTION "public"."approve_team"("p_team_id" "uuid", "p_slug" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_add_media"("p_user_id" "uuid", "p_player_id" "uuid", "p_type" "public"."media_type") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  with owner as (
    select 1 from public.player_profiles p where p.id = p_player_id and p.user_id = p_user_id
  ),
  cnt as (
    select count(*)::int as c from public.player_media m where m.player_id = p_player_id and m.type = p_type
  )
  select exists(select 1 from owner) and (select c from cnt) < max_media_allowed(p_player_id, p_type);
$$;


ALTER FUNCTION "public"."can_add_media"("p_user_id" "uuid", "p_player_id" "uuid", "p_type" "public"."media_type") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_create_invitation"("p_player_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select plan_allows_invites(p_player_id)
     and active_invitations_count(p_player_id) < max_active_invitations(p_player_id);
$$;


ALTER FUNCTION "public"."can_create_invitation"("p_player_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."country_guess_code"("p_country" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
  with norm as (
    select lower(unaccent(coalesce(trim(p_country), ''))) as s
  ),
  m(alias, iso2) as (
    values
      -- América
      ('argentina','ar'), ('republica argentina','ar'),
      ('brasil','br'), ('brazil','br'),
      ('uruguay','uy'),
      ('chile','cl'),
      ('colombia','co'),
      ('peru','pe'), ('perú','pe'),
      ('paraguay','py'),
      ('bolivia','bo'),
      ('venezuela','ve'),
      ('mexico','mx'), ('méxico','mx'),
      ('canada','ca'), ('canadá','ca'),
      ('estados unidos','us'), ('usa','us'), ('united states','us'),

      -- Europa
      ('españa','es'), ('espana','es'), ('spain','es'),
      ('francia','fr'), ('france','fr'),
      ('italia','it'), ('italy','it'),
      ('alemania','de'), ('germany','de'),
      ('inglaterra','gb'), ('reino unido','gb'), ('uk','gb'), ('united kingdom','gb'),
      ('escocia','gb'), ('scotland','gb'),
      ('gales','gb'), ('wales','gb'),
      ('irlanda','ie'), ('ireland','ie'),
      ('portugal','pt'),
      ('paises bajos','nl'), ('países bajos','nl'), ('holanda','nl'), ('netherlands','nl'),
      ('belgica','be'), ('bélgica','be'), ('belgium','be'),
      ('suiza','ch'), ('switzerland','ch'),
      ('austria','at'),
      ('polonia','pl'),
      ('dinamarca','dk'), ('denmark','dk'),
      ('noruega','no'), ('norway','no'),
      ('suecia','se'), ('sweden','se'),
      ('finlandia','fi'), ('finland','fi'), ('suomi','fi'),
      ('islandia','is'), ('iceland','is'),
      ('grecia','gr'), ('greece','gr'),
      ('turquia','tr'), ('turquía','tr'), ('turkey','tr'),
      ('rumania','ro'), ('romania','ro'),
      ('bulgaria','bg'),
      ('croacia','hr'), ('croatia','hr'),
      ('serbia','rs'),
      ('ucrania','ua'), ('ukraine','ua'),
      ('rusia','ru'), ('russia','ru'),
      ('chequia','cz'), ('rep checa','cz'), ('czech republic','cz'), ('czechia','cz'),

      -- África
      ('marruecos','ma'), ('morocco','ma'),
      ('argelia','dz'), ('algeria','dz'),
      ('egipto','eg'), ('egypt','eg'),
      ('tunez','tn'), ('túnez','tn'), ('tunisia','tn'),
      ('sudafrica','za'), ('sudáfrica','za'), ('south africa','za'),
      ('nigeria','ng'),
      ('ghana','gh'),

      -- Asia / Oceanía
      ('japon','jp'), ('japón','jp'), ('japan','jp'),
      ('china','cn'),
      ('corea del sur','kr'), ('south korea','kr'), ('korea','kr'),
      ('australia','au'),
      ('nueva zelanda','nz'), ('new zealand','nz'),
      ('arabia saudita','sa'), ('saudi arabia','sa'),
      ('emiratos arabes unidos','ae'), ('emiratos árabes unidos','ae'), ('uae','ae'),
      ('catar','qa'), ('qatar','qa'),
      ('iran','ir'), ('irán','ir'),
      ('iraq','iq'),
      ('israel','il')
  )
  select iso2
  from norm n
  join m on n.s = m.alias
  limit 1
$$;


ALTER FUNCTION "public"."country_guess_code"("p_country" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."country_guess_codes"("p_arr" "text"[]) RETURNS character[]
    LANGUAGE "sql" STABLE
    AS $$
  select case
    when p_arr is null then null
    else
      array_remove(
        array_agg(distinct public.country_guess_code(x)),
        null
      )
  end
  from unnest(coalesce(p_arr,'{}'::text[])) as t(x);
$$;


ALTER FUNCTION "public"."country_guess_codes"("p_arr" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_team_from_career_proposal"("p_proposal_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  r record;
  new_team_id uuid;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'forbidden';
  end if;

  select * into r from public.career_item_proposals where id = p_proposal_id;
  if not found then raise exception 'proposal % not found', p_proposal_id; end if;

  if r.team_id is not null then
    return r.team_id; -- ya linkeada
  end if;

  if r.proposed_team_name is null then
    raise exception 'proposal has no proposed team name';
  end if;

  insert into public.teams(
    name, country, country_code, category, transfermarkt_url,
    status, visibility, kind,
    requested_by_user_id, requested_in_application_id
  )
  values (
    r.proposed_team_name,
    r.proposed_team_country,
    r.proposed_team_country_code,
    null,
    r.proposed_team_transfermarkt_url,
    'pending', 'public', 'club',
    r.created_by_user_id,
    r.application_id
  )
  returning id into new_team_id;

  -- vincular la propuesta al nuevo team y limpiar campos propuestos
  update public.career_item_proposals
    set team_id = new_team_id,
        proposed_team_name = null,
        proposed_team_country = null,
        proposed_team_country_code = null,
        proposed_team_transfermarkt_url = null,
        updated_at = now()
  where id = p_proposal_id;

  return new_team_id;
end;
$$;


ALTER FUNCTION "public"."create_team_from_career_proposal"("p_proposal_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_limits_for_player"("p_player_id" "uuid") RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    AS $$
  select coalesce(s.limits_json, '{}'::jsonb)
  from public.player_profiles p
  left join public.subscriptions s on s.user_id = p.user_id
  where p.id = p_player_id
  limit 1;
$$;


ALTER FUNCTION "public"."get_limits_for_player"("p_player_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"("u" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.user_profiles up
    where up.user_id = u
      and up.role = 'admin'
  );
$$;


ALTER FUNCTION "public"."is_admin"("u" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."materialize_career_from_application"("p_application_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_app record;
  v_player_id uuid;
  v_cnt_inserted int := 0;
  v_now timestamptz := now();
  r record;
begin
  -- seguridad extra
  if not public.is_admin(auth.uid()) then
    raise exception 'forbidden';
  end if;

  -- application + player_profile (del usuario de la app)
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

  -- recorrer CIP aceptadas y no materializadas
  for r in
    select
      cip.*,
      coalesce(
        cip.team_id,
        (select t.id from public.teams t where t.requested_from_career_item_id = cip.id limit 1),
        (select t.id
           from public.teams t
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
    -- insertar career_item
    insert into public.career_items (player_id, club, division, start_date, end_date, team_id)
    values (
      v_player_id,
      coalesce( (select t.name from public.teams t where t.id = r.resolved_team_id), r.club ),
      r.division,
      case when r.start_year is not null then make_date(r.start_year, 1, 1) else null end,
      case when r.end_year   is not null then make_date(r.end_year, 12,31) else null end,
      r.resolved_team_id
    );

    -- marcar materializada
    update public.career_item_proposals
       set materialized_at = v_now
     where id = r.id;

    v_cnt_inserted := v_cnt_inserted + 1;
  end loop;

  return jsonb_build_object('inserted', v_cnt_inserted);
end;
$$;


ALTER FUNCTION "public"."materialize_career_from_application"("p_application_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."max_active_invitations"("p_player_id" "uuid") RETURNS integer
    LANGUAGE "sql" STABLE
    AS $$
  select coalesce((get_limits_for_player(p_player_id)->>'max_active_invitations')::int, 0);
$$;


ALTER FUNCTION "public"."max_active_invitations"("p_player_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."max_media_allowed"("p_player_id" "uuid", "p_type" "public"."media_type") RETURNS integer
    LANGUAGE "sql" STABLE
    AS $$
  select case
    when p_type = 'photo'::media_type then coalesce((get_limits_for_player(p_player_id)->>'max_photos')::int, 0)
    when p_type = 'video'::media_type then coalesce((get_limits_for_player(p_player_id)->>'max_videos')::int, 0)
    else 0 end;
$$;


ALTER FUNCTION "public"."max_media_allowed"("p_player_id" "uuid", "p_type" "public"."media_type") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."pa_defaults_tg"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  NEW.status := 'pending';
  NEW.reviewed_by_user_id := NULL;
  NEW.reviewed_at := NULL;
  RETURN NEW;
END $$;


ALTER FUNCTION "public"."pa_defaults_tg"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."plan_allows_invites"("p_player_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select coalesce((get_limits_for_player(p_player_id)->>'can_invite_reviews')::boolean, false);
$$;


ALTER FUNCTION "public"."plan_allows_invites"("p_player_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."plan_allows_reviews"("p_player_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select coalesce((get_limits_for_player(p_player_id)->>'reviews_enabled')::boolean, false);
$$;


ALTER FUNCTION "public"."plan_allows_reviews"("p_player_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reject_career_item_proposal"("p_id" "uuid", "p_reason" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'forbidden';
  end if;

  update public.career_item_proposals
    set status='rejected',
        reviewed_by_user_id = auth.uid(),
        reviewed_at = now()
  where id = p_id;

  -- opcional: audit log
  insert into public.audit_logs(user_id, action, subject_table, subject_id, meta)
  values (auth.uid(), 'career_proposal_rejected', 'career_item_proposals', p_id, jsonb_build_object('reason', p_reason));
end;
$$;


ALTER FUNCTION "public"."reject_career_item_proposal"("p_id" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."request_team_from_application"("p_application_id" "uuid", "p_name" "text", "p_country" "text" DEFAULT NULL::"text", "p_category" "text" DEFAULT NULL::"text", "p_tm_url" "text" DEFAULT NULL::"text", "p_country_code" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  app record;
  existing_id uuid;
  new_id uuid;
  s text;
begin
  -- auth
  if auth.uid() is null then
    raise exception 'unauthenticated';
  end if;

  select * into app from public.player_applications where id = p_application_id;
  if not found then
    raise exception 'application % not found', p_application_id;
  end if;
  if app.user_id <> auth.uid() and not public.is_admin(auth.uid()) then
    raise exception 'forbidden';
  end if;

  -- slug base
  s := public.slugify(p_name);

  -- 1) ya existe APROBADO -> linkear directo
  select t.id into existing_id
  from public.teams t
  where (t.slug = s or (lower(t.name)=lower(p_name) and coalesce(t.country,'')=coalesce(p_country,'')))
    and t.status = 'approved'
  limit 1;

  if existing_id is not null then
    update public.player_applications
      set current_team_id = existing_id,
          current_club    = (select name from public.teams where id = existing_id),
          proposed_team_name   = null,
          proposed_team_country= null,
          proposed_team_category = null,
          proposed_team_transfermarkt_url = null,
          updated_at = now()
    where id = p_application_id;

    return existing_id;
  end if;

  -- 2) existe (cualquier status) -> reactivar a pending y re-vincular
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
       set current_team_id = null,
           proposed_team_name = p_name,
           proposed_team_country = p_country,
           proposed_team_category = p_category,
           proposed_team_transfermarkt_url = p_tm_url,
           updated_at = now()
     where id = p_application_id;

    return existing_id;
  end if;

  -- 3) crear nuevo PENDING
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
     set current_team_id = null,
         proposed_team_name = p_name,
         proposed_team_country = p_country,
         proposed_team_category = p_category,
         proposed_team_transfermarkt_url = p_tm_url,
         updated_at = now()
   where id = p_application_id;

  return new_id;
end;
$$;


ALTER FUNCTION "public"."request_team_from_application"("p_application_id" "uuid", "p_name" "text", "p_country" "text", "p_category" "text", "p_tm_url" "text", "p_country_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."request_team_from_career_proposal"("p_proposal_id" "uuid", "p_name" "text" DEFAULT NULL::"text", "p_country" "text" DEFAULT NULL::"text", "p_category" "text" DEFAULT NULL::"text", "p_tm_url" "text" DEFAULT NULL::"text", "p_country_code" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  pr record;
  new_team_id uuid;
begin
  -- sólo admin
  if not public.is_admin(auth.uid()) then
    raise exception 'forbidden';
  end if;

  select * into pr from public.career_item_proposals where id = p_proposal_id;
  if not found then raise exception 'proposal % not found', p_proposal_id; end if;

  insert into public.teams (
    name, country, category, transfermarkt_url, country_code,
    status, visibility, kind,
    requested_by_user_id,
    requested_in_application_id,
    requested_from_career_item_id
  )
  values (
    coalesce(p_name, pr.proposed_team_name, pr.club),
    coalesce(p_country, pr.proposed_team_country),
    p_category,
    coalesce(p_tm_url, pr.proposed_team_transfermarkt_url),
    coalesce(p_country_code, pr.proposed_team_country_code),
    'pending', 'public', 'club',
    pr.created_by_user_id,
    pr.application_id,
    pr.id
  )
  returning id into new_team_id;

  -- enlazo la propuesta al team recien creado
  update public.career_item_proposals
    set team_id = new_team_id
  where id = pr.id;

  return new_team_id;
end;
$$;


ALTER FUNCTION "public"."request_team_from_career_proposal"("p_proposal_id" "uuid", "p_name" "text", "p_country" "text", "p_category" "text", "p_tm_url" "text", "p_country_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_teams"("p_q" "text", "p_limit" integer DEFAULT 10) RETURNS TABLE("id" "uuid", "name" "text", "slug" "text", "country" "text", "country_code" "text", "crest_url" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."search_teams"("p_q" "text", "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."slugify"("input" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select coalesce(
    nullif(
      regexp_replace(lower(unaccent(coalesce(input,''))), '[^a-z0-9]+', '-', 'g'),
      ''
    ), 'team'
  )
$$;


ALTER FUNCTION "public"."slugify"("input" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_team_denorm"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if new.name is distinct from old.name then
    -- apps linkeadas
    update public.player_applications
      set current_club = new.name, updated_at = now()
    where current_team_id = new.id;

    -- perfiles linkeados
    update public.player_profiles
      set current_club = new.name, updated_at = now()
    where current_team_id = new.id;

    -- historial (si existe FK)
    if exists (select 1 from information_schema.columns
               where table_schema='public' and table_name='career_items' and column_name='team_id') then
      update public.career_items
        set club = new.name
      where team_id = new.id;
    end if;
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."sync_team_denorm"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_set_country_code_from_text"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if TG_TABLE_NAME = 'teams' then
    if (new.country_code is null or length(trim(new.country_code))=0) and new.country is not null then
      new.country_code := public.country_guess_code(new.country);
    end if;
    return new;

  elsif TG_TABLE_NAME = 'player_applications' then
    if (new.proposed_team_country_code is null or length(trim(new.proposed_team_country_code))=0)
       and new.proposed_team_country is not null then
      new.proposed_team_country_code := public.country_guess_code(new.proposed_team_country);
    end if;
    return new;

  elsif TG_TABLE_NAME = 'player_profiles' then
    if (new.nationality_codes is null or cardinality(new.nationality_codes)=0) and new.nationality is not null then
      new.nationality_codes := public.country_guess_codes(new.nationality);
    end if;
    return new;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."trg_set_country_code_from_text"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "actor_ip" "inet",
    "action" "text" NOT NULL,
    "subject_table" "text",
    "subject_id" "uuid",
    "meta" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."career_item_proposals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "application_id" "uuid" NOT NULL,
    "club" "text" NOT NULL,
    "division" "text",
    "start_year" integer,
    "end_year" integer,
    "team_id" "uuid",
    "proposed_team_name" "text",
    "proposed_team_country" "text",
    "proposed_team_country_code" "text",
    "proposed_team_transfermarkt_url" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "reviewed_by_user_id" "uuid",
    "reviewed_at" timestamp with time zone,
    "materialized_at" timestamp with time zone,
    "created_by_user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."career_item_proposals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."career_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "player_id" "uuid" NOT NULL,
    "club" "text" NOT NULL,
    "division" "text",
    "start_date" "date",
    "end_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "team_id" "uuid"
);


ALTER TABLE "public"."career_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."countries" (
    "code" character(2) NOT NULL,
    "name_en" "text" NOT NULL,
    "name_es" "text"
);


ALTER TABLE "public"."countries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."player_applications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "plan_requested" "public"."plan" DEFAULT 'free'::"public"."plan" NOT NULL,
    "full_name" "text",
    "nationality" "text"[],
    "positions" "text"[],
    "current_club" "text",
    "transfermarkt_url" "text",
    "external_profile_url" "text",
    "id_doc_url" "text",
    "selfie_url" "text",
    "notes" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "reviewed_by_user_id" "uuid",
    "reviewed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "current_team_id" "uuid",
    "proposed_team_name" "text",
    "proposed_team_country" "text",
    "free_agent" boolean DEFAULT false NOT NULL,
    "personal_info_approved" boolean DEFAULT false NOT NULL,
    "proposed_team_category" "text",
    "proposed_team_transfermarkt_url" "text",
    "proposed_team_country_code" character(2)
);


ALTER TABLE "public"."player_applications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."player_media" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "player_id" "uuid" NOT NULL,
    "type" "public"."media_type" NOT NULL,
    "url" "text" NOT NULL,
    "title" "text",
    "provider" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."player_media" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."player_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "slug" "text" NOT NULL,
    "full_name" "text" NOT NULL,
    "birth_date" "date",
    "nationality" "text"[],
    "foot" "text",
    "height_cm" integer,
    "weight_kg" integer,
    "positions" "text"[],
    "current_club" "text",
    "bio" "text",
    "visibility" "public"."visibility" DEFAULT 'public'::"public"."visibility" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "avatar_url" "text" DEFAULT '/images/player-default.jpg'::"text" NOT NULL,
    "status" "public"."player_status" DEFAULT 'draft'::"public"."player_status" NOT NULL,
    "market_value_eur" numeric(12,2),
    "plan_public" "public"."plan" DEFAULT 'free'::"public"."plan" NOT NULL,
    "current_team_id" "uuid",
    "nationality_codes" character(2)[]
);


ALTER TABLE "public"."player_profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."player_profiles"."market_value_eur" IS 'Valor de mercado opcional en EUR. Puede ser null.';



CREATE TABLE IF NOT EXISTS "public"."review_invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "player_id" "uuid" NOT NULL,
    "invitee_email_hash" "text" NOT NULL,
    "invitee_name" "text",
    "role_label" "text",
    "token_hash" "text" NOT NULL,
    "expires_at" timestamp with time zone,
    "status" "public"."invite_status" DEFAULT 'sent'::"public"."invite_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."review_invitations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reviewer_permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "player_id" "uuid" NOT NULL,
    "reviewer_id" "uuid" NOT NULL,
    "granted_by_user_id" "uuid" NOT NULL,
    "status" "public"."reviewer_perm_status" DEFAULT 'granted'::"public"."reviewer_perm_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."reviewer_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reviewer_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "slug" "text",
    "full_name" "text",
    "role_label" "text",
    "club" "text",
    "bio" "text",
    "contact_email" "text",
    "contact_phone_enc" "text",
    "visibility" "public"."visibility" DEFAULT 'private'::"public"."visibility" NOT NULL,
    "verified" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."reviewer_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "player_id" "uuid" NOT NULL,
    "author_user_id" "uuid",
    "author_reviewer_id" "uuid",
    "author_name" "text",
    "author_email_hash" "text",
    "content" "text" NOT NULL,
    "rating" integer,
    "status" "public"."review_status" DEFAULT 'pending'::"public"."review_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stats_seasons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "player_id" "uuid" NOT NULL,
    "season" "text" NOT NULL,
    "matches" integer DEFAULT 0,
    "goals" integer DEFAULT 0,
    "assists" integer DEFAULT 0,
    "minutes" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."stats_seasons" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "plan" "public"."plan" DEFAULT 'free'::"public"."plan" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "limits_json" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "current_period_end" timestamp with time zone,
    "canceled_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."teams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "name" "text" NOT NULL,
    "country" "text",
    "kind" "public"."team_kind" DEFAULT 'club'::"public"."team_kind" NOT NULL,
    "visibility" "public"."visibility" DEFAULT 'public'::"public"."visibility" NOT NULL,
    "status" "public"."team_status" DEFAULT 'pending'::"public"."team_status" NOT NULL,
    "alt_names" "text"[],
    "tags" "text"[],
    "crest_url" "text" DEFAULT '/images/team-default.svg'::"text" NOT NULL,
    "requested_by_user_id" "uuid",
    "requested_in_application_id" "uuid",
    "featured" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "category" "text",
    "transfermarkt_url" "text",
    "country_code" character(2),
    "requested_from_career_item_id" "uuid"
);


ALTER TABLE "public"."teams" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."role" DEFAULT 'member'::"public"."role" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_profiles" OWNER TO "postgres";


ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."career_item_proposals"
    ADD CONSTRAINT "career_item_proposals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."career_items"
    ADD CONSTRAINT "career_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."countries"
    ADD CONSTRAINT "countries_pkey" PRIMARY KEY ("code");



ALTER TABLE ONLY "public"."player_applications"
    ADD CONSTRAINT "player_applications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."player_media"
    ADD CONSTRAINT "player_media_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."player_profiles"
    ADD CONSTRAINT "player_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."player_profiles"
    ADD CONSTRAINT "player_profiles_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."review_invitations"
    ADD CONSTRAINT "review_invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reviewer_permissions"
    ADD CONSTRAINT "reviewer_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reviewer_profiles"
    ADD CONSTRAINT "reviewer_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reviewer_profiles"
    ADD CONSTRAINT "reviewer_profiles_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stats_seasons"
    ADD CONSTRAINT "stats_seasons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_user_id_key" UNIQUE ("user_id");



CREATE INDEX "idx_app_proposed_team_country_code" ON "public"."player_applications" USING "btree" ("proposed_team_country_code");



CREATE INDEX "idx_career_player" ON "public"."career_items" USING "btree" ("player_id");



CREATE INDEX "idx_career_team" ON "public"."career_items" USING "btree" ("team_id");



CREATE INDEX "idx_cip_app" ON "public"."career_item_proposals" USING "btree" ("application_id");



CREATE INDEX "idx_cip_status" ON "public"."career_item_proposals" USING "btree" ("status");



CREATE INDEX "idx_cip_team" ON "public"."career_item_proposals" USING "btree" ("team_id");



CREATE INDEX "idx_inv_player" ON "public"."review_invitations" USING "btree" ("player_id");



CREATE INDEX "idx_player_media_player" ON "public"."player_media" USING "btree" ("player_id");



CREATE INDEX "idx_player_profiles_current_team_id" ON "public"."player_profiles" USING "btree" ("current_team_id");



CREATE INDEX "idx_player_profiles_nationality_codes" ON "public"."player_profiles" USING "gin" ("nationality_codes");



CREATE INDEX "idx_player_profiles_user" ON "public"."player_profiles" USING "btree" ("user_id");



CREATE INDEX "idx_player_slug" ON "public"."player_profiles" USING "btree" ("slug");



CREATE INDEX "idx_reviewer_profiles_user" ON "public"."reviewer_profiles" USING "btree" ("user_id");



CREATE INDEX "idx_reviews_author_reviewer" ON "public"."reviews" USING "btree" ("author_reviewer_id");



CREATE INDEX "idx_reviews_player_status" ON "public"."reviews" USING "btree" ("player_id", "status");



CREATE INDEX "idx_stats_player" ON "public"."stats_seasons" USING "btree" ("player_id");



CREATE INDEX "idx_teams_country_code" ON "public"."teams" USING "btree" ("country_code");



CREATE INDEX "idx_teams_lower_name" ON "public"."teams" USING "btree" ("lower"("name"));



CREATE INDEX "idx_teams_req_from_cip" ON "public"."teams" USING "btree" ("requested_from_career_item_id");



CREATE INDEX "idx_teams_status" ON "public"."teams" USING "btree" ("status");



CREATE UNIQUE INDEX "teams_name_country_key" ON "public"."teams" USING "btree" ("lower"("name"), COALESCE("country", ''::"text"));



CREATE UNIQUE INDEX "uniq_pending_application_per_user" ON "public"."player_applications" USING "btree" ("user_id") WHERE ("status" = 'pending'::"text");



CREATE UNIQUE INDEX "uniq_reviewer_permission" ON "public"."reviewer_permissions" USING "btree" ("player_id", "reviewer_id");



CREATE OR REPLACE TRIGGER "biu_set_country_code_app" BEFORE INSERT OR UPDATE OF "proposed_team_country", "proposed_team_country_code" ON "public"."player_applications" FOR EACH ROW EXECUTE FUNCTION "public"."trg_set_country_code_from_text"();



CREATE OR REPLACE TRIGGER "biu_set_country_code_teams" BEFORE INSERT OR UPDATE OF "country", "country_code" ON "public"."teams" FOR EACH ROW EXECUTE FUNCTION "public"."trg_set_country_code_from_text"();



CREATE OR REPLACE TRIGGER "biu_set_nationality_codes_players" BEFORE INSERT OR UPDATE OF "nationality", "nationality_codes" ON "public"."player_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."trg_set_country_code_from_text"();



CREATE OR REPLACE TRIGGER "pa_defaults_bi" BEFORE INSERT ON "public"."player_applications" FOR EACH ROW EXECUTE FUNCTION "public"."pa_defaults_tg"();



CREATE OR REPLACE TRIGGER "trg_cip_set_updated" BEFORE UPDATE ON "public"."career_item_proposals" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_sync_team_denorm" AFTER UPDATE OF "name" ON "public"."teams" FOR EACH ROW EXECUTE FUNCTION "public"."sync_team_denorm"();



CREATE OR REPLACE TRIGGER "trg_teams_updated_at" BEFORE UPDATE ON "public"."teams" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."career_item_proposals"
    ADD CONSTRAINT "career_item_proposals_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "public"."player_applications"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."career_item_proposals"
    ADD CONSTRAINT "career_item_proposals_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."career_item_proposals"
    ADD CONSTRAINT "career_item_proposals_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."career_item_proposals"
    ADD CONSTRAINT "career_item_proposals_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."career_items"
    ADD CONSTRAINT "career_items_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."player_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."career_items"
    ADD CONSTRAINT "career_items_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."player_applications"
    ADD CONSTRAINT "player_applications_current_team_id_fkey" FOREIGN KEY ("current_team_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."player_applications"
    ADD CONSTRAINT "player_applications_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."player_applications"
    ADD CONSTRAINT "player_applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."player_media"
    ADD CONSTRAINT "player_media_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."player_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."player_profiles"
    ADD CONSTRAINT "player_profiles_current_team_id_fkey" FOREIGN KEY ("current_team_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."player_profiles"
    ADD CONSTRAINT "player_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."review_invitations"
    ADD CONSTRAINT "review_invitations_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."player_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviewer_permissions"
    ADD CONSTRAINT "reviewer_permissions_granted_by_user_id_fkey" FOREIGN KEY ("granted_by_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviewer_permissions"
    ADD CONSTRAINT "reviewer_permissions_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."player_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviewer_permissions"
    ADD CONSTRAINT "reviewer_permissions_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "public"."reviewer_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviewer_profiles"
    ADD CONSTRAINT "reviewer_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_author_reviewer_id_fkey" FOREIGN KEY ("author_reviewer_id") REFERENCES "public"."reviewer_profiles"("id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."player_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stats_seasons"
    ADD CONSTRAINT "stats_seasons_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."player_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_requested_from_career_item_id_fkey" FOREIGN KEY ("requested_from_career_item_id") REFERENCES "public"."career_item_proposals"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_requested_in_application_id_fkey" FOREIGN KEY ("requested_in_application_id") REFERENCES "public"."player_applications"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "audit_select" ON "public"."audit_logs" FOR SELECT USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "career_cud" ON "public"."career_items" USING (((EXISTS ( SELECT 1
   FROM "public"."player_profiles" "p"
  WHERE (("p"."id" = "career_items"."player_id") AND ("p"."user_id" = "auth"."uid"())))) OR "public"."is_admin"("auth"."uid"()))) WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."player_profiles" "p"
  WHERE (("p"."id" = "career_items"."player_id") AND ("p"."user_id" = "auth"."uid"())))) OR "public"."is_admin"("auth"."uid"())));



ALTER TABLE "public"."career_item_proposals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."career_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "career_select" ON "public"."career_items" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."player_profiles" "p"
  WHERE (("p"."id" = "career_items"."player_id") AND (("p"."visibility" = 'public'::"public"."visibility") OR ("p"."user_id" = "auth"."uid"()))))) OR "public"."is_admin"("auth"."uid"())));



CREATE POLICY "cip_admin_all" ON "public"."career_item_proposals" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."user_id" = "auth"."uid"()) AND ("up"."role" = 'admin'::"public"."role"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."user_id" = "auth"."uid"()) AND ("up"."role" = 'admin'::"public"."role")))));



CREATE POLICY "cip_owner_insert" ON "public"."career_item_proposals" FOR INSERT TO "authenticated" WITH CHECK (("created_by_user_id" = "auth"."uid"()));



CREATE POLICY "cip_owner_select" ON "public"."career_item_proposals" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."player_applications" "a"
  WHERE (("a"."id" = "career_item_proposals"."application_id") AND ("a"."user_id" = "auth"."uid"())))) OR "public"."is_admin"("auth"."uid"())));



CREATE POLICY "inv_insert" ON "public"."review_invitations" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."player_profiles" "p"
  WHERE (("p"."id" = "review_invitations"."player_id") AND ("p"."user_id" = "auth"."uid"())))) AND "public"."can_create_invitation"("player_id")));



CREATE POLICY "inv_select" ON "public"."review_invitations" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."player_profiles" "p"
  WHERE (("p"."id" = "review_invitations"."player_id") AND ("p"."user_id" = "auth"."uid"())))) OR "public"."is_admin"("auth"."uid"())));



CREATE POLICY "inv_update" ON "public"."review_invitations" FOR UPDATE USING (("public"."is_admin"("auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."player_profiles" "p"
  WHERE (("p"."id" = "review_invitations"."player_id") AND ("p"."user_id" = "auth"."uid"()))))));



CREATE POLICY "pa_admin_all" ON "public"."player_applications" USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."user_id" = "auth"."uid"()) AND ("up"."role" = 'admin'::"public"."role"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."user_id" = "auth"."uid"()) AND ("up"."role" = 'admin'::"public"."role")))));



CREATE POLICY "pa_owner_insert_pending" ON "public"."player_applications" FOR INSERT WITH CHECK ((("auth"."role"() = 'authenticated'::"text") AND ("user_id" = "auth"."uid"()) AND (COALESCE("status", 'pending'::"text") = 'pending'::"text") AND ("reviewed_by_user_id" IS NULL) AND ("reviewed_at" IS NULL)));



CREATE POLICY "pa_owner_select" ON "public"."player_applications" FOR SELECT USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."player_applications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."player_media" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "player_media_owner_delete" ON "public"."player_media" FOR DELETE USING (((EXISTS ( SELECT 1
   FROM "public"."player_profiles" "p"
  WHERE (("p"."id" = "player_media"."player_id") AND ("p"."user_id" = "auth"."uid"())))) OR "public"."is_admin"("auth"."uid"())));



CREATE POLICY "player_media_owner_insert_limit" ON "public"."player_media" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."player_profiles" "p"
  WHERE (("p"."id" = "player_media"."player_id") AND ("p"."user_id" = "auth"."uid"())))) AND "public"."can_add_media"("auth"."uid"(), "player_id", "type")));



CREATE POLICY "player_media_owner_update" ON "public"."player_media" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM "public"."player_profiles" "p"
  WHERE (("p"."id" = "player_media"."player_id") AND ("p"."user_id" = "auth"."uid"())))) OR "public"."is_admin"("auth"."uid"())));



CREATE POLICY "player_media_select" ON "public"."player_media" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."player_profiles" "p"
  WHERE (("p"."id" = "player_media"."player_id") AND (("p"."visibility" = 'public'::"public"."visibility") OR ("p"."user_id" = "auth"."uid"()))))) OR "public"."is_admin"("auth"."uid"())));



ALTER TABLE "public"."player_profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "player_profiles_cud" ON "public"."player_profiles" USING ((("user_id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"()))) WITH CHECK ((("user_id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"())));



CREATE POLICY "player_profiles_read" ON "public"."player_profiles" FOR SELECT USING (((("visibility" = 'public'::"public"."visibility") AND ("status" = 'approved'::"public"."player_status")) OR ("user_id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"())));



ALTER TABLE "public"."review_invitations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reviewer_permissions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "reviewer_permissions_delete" ON "public"."reviewer_permissions" FOR DELETE USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "reviewer_permissions_insert" ON "public"."reviewer_permissions" FOR INSERT WITH CHECK (("public"."is_admin"("auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."player_profiles" "p"
  WHERE (("p"."id" = "reviewer_permissions"."player_id") AND ("p"."user_id" = "auth"."uid"()))))));



CREATE POLICY "reviewer_permissions_select" ON "public"."reviewer_permissions" FOR SELECT USING (("public"."is_admin"("auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."player_profiles" "p"
  WHERE (("p"."id" = "reviewer_permissions"."player_id") AND ("p"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."reviewer_profiles" "r"
  WHERE (("r"."id" = "reviewer_permissions"."reviewer_id") AND ("r"."user_id" = "auth"."uid"()))))));



CREATE POLICY "reviewer_permissions_update" ON "public"."reviewer_permissions" FOR UPDATE USING (("public"."is_admin"("auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."player_profiles" "p"
  WHERE (("p"."id" = "reviewer_permissions"."player_id") AND ("p"."user_id" = "auth"."uid"()))))));



ALTER TABLE "public"."reviewer_profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "reviewer_profiles_insert" ON "public"."reviewer_profiles" FOR INSERT WITH CHECK ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "reviewer_profiles_select" ON "public"."reviewer_profiles" FOR SELECT USING ((("visibility" = 'public'::"public"."visibility") OR ("user_id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"())));



CREATE POLICY "reviewer_profiles_update" ON "public"."reviewer_profiles" FOR UPDATE USING ((("user_id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"())));



ALTER TABLE "public"."reviews" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "reviews_insert_reviewer" ON "public"."reviews" FOR INSERT WITH CHECK (("public"."plan_allows_reviews"("player_id") AND (EXISTS ( SELECT 1
   FROM ("public"."reviewer_profiles" "r"
     JOIN "public"."reviewer_permissions" "rp" ON (("rp"."reviewer_id" = "r"."id")))
  WHERE (("r"."user_id" = "auth"."uid"()) AND ("rp"."player_id" = "reviews"."player_id") AND ("rp"."status" = 'granted'::"public"."reviewer_perm_status"))))));



CREATE POLICY "reviews_public_read" ON "public"."reviews" FOR SELECT USING ((("status" = 'approved'::"public"."review_status") OR "public"."is_admin"("auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."player_profiles" "p"
  WHERE (("p"."id" = "reviews"."player_id") AND ("p"."user_id" = "auth"."uid"()))))));



CREATE POLICY "stats_cud" ON "public"."stats_seasons" USING (((EXISTS ( SELECT 1
   FROM "public"."player_profiles" "p"
  WHERE (("p"."id" = "stats_seasons"."player_id") AND ("p"."user_id" = "auth"."uid"())))) OR "public"."is_admin"("auth"."uid"()))) WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."player_profiles" "p"
  WHERE (("p"."id" = "stats_seasons"."player_id") AND ("p"."user_id" = "auth"."uid"())))) OR "public"."is_admin"("auth"."uid"())));



ALTER TABLE "public"."stats_seasons" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "stats_select" ON "public"."stats_seasons" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."player_profiles" "p"
  WHERE (("p"."id" = "stats_seasons"."player_id") AND (("p"."visibility" = 'public'::"public"."visibility") OR ("p"."user_id" = "auth"."uid"()))))) OR "public"."is_admin"("auth"."uid"())));



CREATE POLICY "subs_delete_admin" ON "public"."subscriptions" FOR DELETE USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "subs_insert_admin" ON "public"."subscriptions" FOR INSERT WITH CHECK ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "subs_insert_owner" ON "public"."subscriptions" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "subs_select" ON "public"."subscriptions" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"())));



CREATE POLICY "subs_update" ON "public"."subscriptions" FOR UPDATE USING ("public"."is_admin"("auth"."uid"()));



ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."teams" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "teams_admin_read" ON "public"."teams" FOR SELECT TO "authenticated" USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "teams_admin_update" ON "public"."teams" FOR UPDATE TO "authenticated" USING ("public"."is_admin"("auth"."uid"())) WITH CHECK ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "teams_del_none" ON "public"."teams" FOR DELETE TO "authenticated" USING (false);



CREATE POLICY "teams_insert_none" ON "public"."teams" FOR INSERT TO "authenticated" WITH CHECK (false);



CREATE POLICY "teams_public_read" ON "public"."teams" FOR SELECT TO "authenticated", "anon" USING ((("status" = 'approved'::"public"."team_status") AND ("visibility" = 'public'::"public"."visibility")));



CREATE POLICY "teams_ud_none" ON "public"."teams" FOR UPDATE TO "authenticated" USING (false) WITH CHECK (false);



ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_profiles_select" ON "public"."user_profiles" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"())));



CREATE POLICY "user_profiles_update" ON "public"."user_profiles" FOR UPDATE USING ((("user_id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"())));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."accept_career_item_proposal"("p_id" "uuid", "p_team_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."accept_career_item_proposal"("p_id" "uuid", "p_team_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."accept_career_item_proposal"("p_id" "uuid", "p_team_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."active_invitations_count"("p_player_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."active_invitations_count"("p_player_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."active_invitations_count"("p_player_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."approve_player_application"("p_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."approve_player_application"("p_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."approve_player_application"("p_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."approve_team"("p_team_id" "uuid", "p_slug" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."approve_team"("p_team_id" "uuid", "p_slug" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."approve_team"("p_team_id" "uuid", "p_slug" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_add_media"("p_user_id" "uuid", "p_player_id" "uuid", "p_type" "public"."media_type") TO "anon";
GRANT ALL ON FUNCTION "public"."can_add_media"("p_user_id" "uuid", "p_player_id" "uuid", "p_type" "public"."media_type") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_add_media"("p_user_id" "uuid", "p_player_id" "uuid", "p_type" "public"."media_type") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_create_invitation"("p_player_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_create_invitation"("p_player_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_create_invitation"("p_player_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."country_guess_code"("p_country" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."country_guess_code"("p_country" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."country_guess_code"("p_country" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."country_guess_codes"("p_arr" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."country_guess_codes"("p_arr" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."country_guess_codes"("p_arr" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."create_team_from_career_proposal"("p_proposal_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_team_from_career_proposal"("p_proposal_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_team_from_career_proposal"("p_proposal_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_limits_for_player"("p_player_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_limits_for_player"("p_player_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_limits_for_player"("p_player_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_admin"("u" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_admin"("u" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"("u" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"("u" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."materialize_career_from_application"("p_application_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."materialize_career_from_application"("p_application_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."materialize_career_from_application"("p_application_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."max_active_invitations"("p_player_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."max_active_invitations"("p_player_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."max_active_invitations"("p_player_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."max_media_allowed"("p_player_id" "uuid", "p_type" "public"."media_type") TO "anon";
GRANT ALL ON FUNCTION "public"."max_media_allowed"("p_player_id" "uuid", "p_type" "public"."media_type") TO "authenticated";
GRANT ALL ON FUNCTION "public"."max_media_allowed"("p_player_id" "uuid", "p_type" "public"."media_type") TO "service_role";



GRANT ALL ON FUNCTION "public"."pa_defaults_tg"() TO "anon";
GRANT ALL ON FUNCTION "public"."pa_defaults_tg"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."pa_defaults_tg"() TO "service_role";



GRANT ALL ON FUNCTION "public"."plan_allows_invites"("p_player_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."plan_allows_invites"("p_player_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."plan_allows_invites"("p_player_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."plan_allows_reviews"("p_player_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."plan_allows_reviews"("p_player_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."plan_allows_reviews"("p_player_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."reject_career_item_proposal"("p_id" "uuid", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."reject_career_item_proposal"("p_id" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reject_career_item_proposal"("p_id" "uuid", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."request_team_from_application"("p_application_id" "uuid", "p_name" "text", "p_country" "text", "p_category" "text", "p_tm_url" "text", "p_country_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."request_team_from_application"("p_application_id" "uuid", "p_name" "text", "p_country" "text", "p_category" "text", "p_tm_url" "text", "p_country_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."request_team_from_application"("p_application_id" "uuid", "p_name" "text", "p_country" "text", "p_category" "text", "p_tm_url" "text", "p_country_code" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."request_team_from_career_proposal"("p_proposal_id" "uuid", "p_name" "text", "p_country" "text", "p_category" "text", "p_tm_url" "text", "p_country_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."request_team_from_career_proposal"("p_proposal_id" "uuid", "p_name" "text", "p_country" "text", "p_category" "text", "p_tm_url" "text", "p_country_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."request_team_from_career_proposal"("p_proposal_id" "uuid", "p_name" "text", "p_country" "text", "p_category" "text", "p_tm_url" "text", "p_country_code" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."search_teams"("p_q" "text", "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_teams"("p_q" "text", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_teams"("p_q" "text", "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."slugify"("input" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."slugify"("input" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."slugify"("input" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_team_denorm"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_team_denorm"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_team_denorm"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_set_country_code_from_text"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_set_country_code_from_text"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_set_country_code_from_text"() TO "service_role";



GRANT ALL ON FUNCTION "public"."unaccent"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."unaccent"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."unaccent"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."unaccent"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."unaccent"("regdictionary", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."unaccent"("regdictionary", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."unaccent"("regdictionary", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."unaccent"("regdictionary", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."unaccent_init"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."unaccent_init"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."unaccent_init"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."unaccent_init"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."unaccent_lexize"("internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."unaccent_lexize"("internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."unaccent_lexize"("internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."unaccent_lexize"("internal", "internal", "internal", "internal") TO "service_role";


















GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."career_item_proposals" TO "anon";
GRANT ALL ON TABLE "public"."career_item_proposals" TO "authenticated";
GRANT ALL ON TABLE "public"."career_item_proposals" TO "service_role";



GRANT ALL ON TABLE "public"."career_items" TO "anon";
GRANT ALL ON TABLE "public"."career_items" TO "authenticated";
GRANT ALL ON TABLE "public"."career_items" TO "service_role";



GRANT ALL ON TABLE "public"."countries" TO "anon";
GRANT ALL ON TABLE "public"."countries" TO "authenticated";
GRANT ALL ON TABLE "public"."countries" TO "service_role";



GRANT ALL ON TABLE "public"."player_applications" TO "anon";
GRANT ALL ON TABLE "public"."player_applications" TO "authenticated";
GRANT ALL ON TABLE "public"."player_applications" TO "service_role";



GRANT ALL ON TABLE "public"."player_media" TO "anon";
GRANT ALL ON TABLE "public"."player_media" TO "authenticated";
GRANT ALL ON TABLE "public"."player_media" TO "service_role";



GRANT ALL ON TABLE "public"."player_profiles" TO "anon";
GRANT ALL ON TABLE "public"."player_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."player_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."review_invitations" TO "anon";
GRANT ALL ON TABLE "public"."review_invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."review_invitations" TO "service_role";



GRANT ALL ON TABLE "public"."reviewer_permissions" TO "anon";
GRANT ALL ON TABLE "public"."reviewer_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."reviewer_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."reviewer_profiles" TO "anon";
GRANT ALL ON TABLE "public"."reviewer_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."reviewer_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."reviews" TO "anon";
GRANT ALL ON TABLE "public"."reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."reviews" TO "service_role";



GRANT ALL ON TABLE "public"."stats_seasons" TO "anon";
GRANT ALL ON TABLE "public"."stats_seasons" TO "authenticated";
GRANT ALL ON TABLE "public"."stats_seasons" TO "service_role";



GRANT ALL ON TABLE "public"."subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."teams" TO "anon";
GRANT ALL ON TABLE "public"."teams" TO "authenticated";
GRANT ALL ON TABLE "public"."teams" TO "service_role";



GRANT ALL ON TABLE "public"."user_profiles" TO "anon";
GRANT ALL ON TABLE "public"."user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






























\unrestrict 5YBcd24YxkcR9LrxZU1xfRiNFteNHmDy7GMxgGJerwwEt7P2vRyNAAcliBZwEgK

RESET ALL;
