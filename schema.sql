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
