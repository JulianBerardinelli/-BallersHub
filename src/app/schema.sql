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

-- Materialize accepted career proposals into career_items
CREATE OR REPLACE FUNCTION public.materialize_career_from_application(
  p_application_id uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_app record;
  v_player_id uuid;
  v_cnt_inserted int := 0;
  v_now timestamptz := now();
  r record;
begin
  if auth.role() <> 'service_role' and not public.is_admin(auth.uid()) then
    raise exception 'forbidden';
  end if;

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
    insert into public.career_items (player_id, club, division, start_date, end_date, team_id)
    values (
      v_player_id,
      coalesce((select t.name from public.teams t where t.id = r.resolved_team_id), r.club),
      r.division,
      case when r.start_year is not null then make_date(r.start_year, 1, 1) else null end,
      case when r.end_year is not null then make_date(r.end_year, 12, 31) else null end,
      r.resolved_team_id
    );

    update public.career_item_proposals
       set materialized_at = v_now
     where id = r.id;

    v_cnt_inserted := v_cnt_inserted + 1;
  end loop;

  return jsonb_build_object('inserted', v_cnt_inserted);
end;
$$;

-- Cascade deletes between career item proposals and teams
ALTER TABLE ONLY public.career_item_proposals
  DROP CONSTRAINT IF EXISTS career_item_proposals_team_id_fkey,
  ADD CONSTRAINT career_item_proposals_team_id_fkey
    FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.teams
  DROP CONSTRAINT IF EXISTS teams_requested_from_career_item_id_fkey,
  ADD CONSTRAINT teams_requested_from_career_item_id_fkey
    FOREIGN KEY (requested_from_career_item_id) REFERENCES public.career_item_proposals(id) ON DELETE CASCADE;

-- Delete KYC files from storage when removing an application
CREATE OR REPLACE FUNCTION public.delete_application_kyc_files()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.id_doc_url IS NOT NULL THEN
    DELETE FROM storage.objects WHERE bucket_id = 'kyc' AND name = OLD.id_doc_url;
  END IF;
  IF OLD.selfie_url IS NOT NULL THEN
    DELETE FROM storage.objects WHERE bucket_id = 'kyc' AND name = OLD.selfie_url;
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER delete_application_kyc_files
AFTER DELETE ON public.player_applications
FOR EACH ROW EXECUTE FUNCTION public.delete_application_kyc_files();

