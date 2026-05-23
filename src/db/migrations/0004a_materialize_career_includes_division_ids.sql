-- Complementary SQL (not tracked by Drizzle) — RPC body update.
-- Adds division_id + secondary_division_id propagation when admin
-- materializes career_item_proposals into career_items.
-- Idempotent: CREATE OR REPLACE.
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
        cip.team_id,
        (select t.id from public.teams t where t.requested_from_career_item_id = cip.id limit 1),
        (select t.id from public.teams t
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
