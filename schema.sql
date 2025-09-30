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
