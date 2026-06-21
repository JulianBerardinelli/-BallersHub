-- 0015e_coach_media_limits.sql
--
-- Fix de límites de multimedia para coaches. Antes, coach_max_media_allowed leía
-- subscriptions.limits_json (vía get_limits_for_coach) con fallback 2 fotos / 1
-- video — y como las subscripciones pro-coach no traen limits_json, hasta un DT
-- Pro quedaba topado en 1 video / 2 fotos.
--
-- Ahora es plan-aware y NO depende de limits_json:
--   • Pro  (subscription plan='pro' o plan_id ilike 'pro%'): 5 fotos · videos ilimitados (999)
--   • Free                                                  : 1 foto  · 2 video-links
-- El avatar y el hero/asset Pro son columnas de coach_profiles (avatar_url /
-- hero_url), NO filas de coach_media, así que no cuentan contra estos límites.
--
-- Complementario: NO tracked en el journal de Drizzle. Se aplica a mano a dev
-- (ciolizjshimyvyonlssq) y prod (erdvpcfjynkhcrqktozd) vía MCP.

CREATE OR REPLACE FUNCTION public.coach_max_media_allowed(p_coach_id uuid, p_type media_type)
 RETURNS integer
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  with pro as (
    select exists (
      select 1
      from public.coach_profiles cp
      join public.subscriptions s on s.user_id = cp.user_id
      where cp.id = p_coach_id
        and (s.plan = 'pro' or s.plan_id ilike 'pro%')
    ) as is_pro
  )
  select case
    when p_type = 'photo'::media_type then case when (select is_pro from pro) then 5 else 1 end
    when p_type = 'video'::media_type then case when (select is_pro from pro) then 999 else 2 end
    else 0
  end;
$function$;
