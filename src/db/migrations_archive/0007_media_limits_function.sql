-- Custom SQL migration file, put your code below! ----

CREATE OR REPLACE FUNCTION "public"."max_media_allowed"("p_player_id" "uuid", "p_type" "public"."media_type") RETURNS integer
    LANGUAGE "sql" STABLE
    AS $$
  select case
    when p_type = 'photo'::media_type then coalesce((get_limits_for_player(p_player_id)->>'max_photos')::int, 2)
    when p_type = 'video'::media_type then coalesce((get_limits_for_player(p_player_id)->>'max_videos')::int, 1)
    else 0 end;
$$;