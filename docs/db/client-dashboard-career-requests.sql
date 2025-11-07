-- Client dashboard — career requests v2
-- Ejecutar este script luego de `client-dashboard-publishing-v2.sql`.

begin;

-- 1) Solicitudes de revisión de trayectoria para jugadores ya dados de alta.
create table if not exists public.career_revision_requests (
  id uuid primary key default uuid_generate_v4(),
  player_id uuid not null references public.player_profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled')),
  submitted_by_user_id uuid not null references auth.users(id),
  submitted_at timestamptz not null default now(),
  reviewed_by_user_id uuid references auth.users(id),
  reviewed_at timestamptz,
  resolution_note text,
  change_summary text,
  current_snapshot jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_career_revision_player on public.career_revision_requests(player_id);
create index if not exists idx_career_revision_status on public.career_revision_requests(status);
create index if not exists idx_career_revision_submitted_by on public.career_revision_requests(submitted_by_user_id);

-- 2) Equipos propuestos durante la revisión (cuando no existen en catálogo).
create table if not exists public.career_revision_proposed_teams (
  id uuid primary key default uuid_generate_v4(),
  request_id uuid not null references public.career_revision_requests(id) on delete cascade,
  name text not null,
  country_name text,
  country_code char(2),
  transfermarkt_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_career_revision_prop_teams_request on public.career_revision_proposed_teams(request_id);

-- 3) Etapas propuestas dentro de cada solicitud.
create table if not exists public.career_revision_items (
  id uuid primary key default uuid_generate_v4(),
  request_id uuid not null references public.career_revision_requests(id) on delete cascade,
  original_item_id uuid references public.career_items(id) on delete set null,
  club text not null,
  division text,
  start_year integer,
  end_year integer,
  team_id uuid references public.teams(id) on delete set null,
  proposed_team_id uuid references public.career_revision_proposed_teams(id) on delete set null,
  order_index integer not null default 0,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_career_revision_items_request on public.career_revision_items(request_id);
create index if not exists idx_career_revision_items_original on public.career_revision_items(original_item_id);

-- 4) Compatibilidad: columna updated_at en career_items para sincronización.
alter table if exists public.career_items
  add column if not exists updated_at timestamptz not null default now();

-- 5) Hooks de actualización de timestamp reutilizando la función global.
do $$
begin
  if exists (select 1 from pg_proc where proname = 'set_updated_at') then
    if exists (select 1 from pg_trigger where tgname = 'trg_career_items_updated') then
      execute 'drop trigger trg_career_items_updated on public.career_items';
    end if;
    execute 'create trigger trg_career_items_updated before update on public.career_items for each row execute function public.set_updated_at();';

    if exists (select 1 from pg_trigger where tgname = 'trg_career_revision_requests_updated') then
      execute 'drop trigger trg_career_revision_requests_updated on public.career_revision_requests';
    end if;
    execute 'create trigger trg_career_revision_requests_updated before update on public.career_revision_requests for each row execute function public.set_updated_at();';

    if exists (select 1 from pg_trigger where tgname = 'trg_career_revision_items_updated') then
      execute 'drop trigger trg_career_revision_items_updated on public.career_revision_items';
    end if;
    execute 'create trigger trg_career_revision_items_updated before update on public.career_revision_items for each row execute function public.set_updated_at();';

    if exists (select 1 from pg_trigger where tgname = 'trg_career_revision_proposed_teams_updated') then
      execute 'drop trigger trg_career_revision_proposed_teams_updated on public.career_revision_proposed_teams';
    end if;
    execute 'create trigger trg_career_revision_proposed_teams_updated before update on public.career_revision_proposed_teams for each row execute function public.set_updated_at();';
  end if;
end $$;

-- 6) Seguridad y permisos.
alter table public.career_revision_requests enable row level security;
alter table public.career_revision_items enable row level security;
alter table public.career_revision_proposed_teams enable row level security;

-- Política: propietarios (jugadores) pueden insertar y leer sus solicitudes.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'career_revision_requests'
      and policyname = 'career_revision_requests_owner_rw'
  ) then
    execute $ddl$
      create policy career_revision_requests_owner_rw on public.career_revision_requests
        for all to authenticated
        using (
          player_id in (
            select id from public.player_profiles where user_id = auth.uid()
          )
        )
        with check (
          player_id in (
            select id from public.player_profiles where user_id = auth.uid()
          )
        );
    $ddl$;
  end if;
end $$;

-- Política: administradores acceso completo.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'career_revision_requests'
      and policyname = 'career_revision_requests_admin_all'
  ) then
    execute $ddl$
      create policy career_revision_requests_admin_all on public.career_revision_requests
        for all to authenticated
        using (public.is_admin(auth.uid()))
        with check (public.is_admin(auth.uid()));
    $ddl$;
  end if;
end $$;

-- Items heredan permisos via solicitud.
-- Selección.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'career_revision_items'
      and policyname = 'career_revision_items_owner_select'
  ) then
    execute $ddl$
      create policy career_revision_items_owner_select on public.career_revision_items
        for select to authenticated using (
          request_id in (
            select id from public.career_revision_requests
            where player_id in (select id from public.player_profiles where user_id = auth.uid())
          )
        );
    $ddl$;
  end if;
end $$;

-- Inserción.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'career_revision_items'
      and policyname = 'career_revision_items_owner_insert'
  ) then
    execute $ddl$
      create policy career_revision_items_owner_insert on public.career_revision_items
        for insert to authenticated with check (
          request_id in (
            select id from public.career_revision_requests
            where player_id in (select id from public.player_profiles where user_id = auth.uid())
          )
        );
    $ddl$;
  end if;
end $$;

-- Acceso completo administradores.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'career_revision_items'
      and policyname = 'career_revision_items_admin_all'
  ) then
    execute $ddl$
      create policy career_revision_items_admin_all on public.career_revision_items
        for all to authenticated
        using (public.is_admin(auth.uid()))
        with check (public.is_admin(auth.uid()));
    $ddl$;
  end if;
end $$;

-- Equipos propuestos también siguen el scope de la solicitud.
-- Selección.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'career_revision_proposed_teams'
      and policyname = 'career_revision_proposed_teams_owner_select'
  ) then
    execute $ddl$
      create policy career_revision_proposed_teams_owner_select on public.career_revision_proposed_teams
        for select to authenticated using (
          request_id in (
            select id from public.career_revision_requests
            where player_id in (select id from public.player_profiles where user_id = auth.uid())
          )
        );
    $ddl$;
  end if;
end $$;

-- Inserción.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'career_revision_proposed_teams'
      and policyname = 'career_revision_proposed_teams_owner_insert'
  ) then
    execute $ddl$
      create policy career_revision_proposed_teams_owner_insert on public.career_revision_proposed_teams
        for insert to authenticated with check (
          request_id in (
            select id from public.career_revision_requests
            where player_id in (select id from public.player_profiles where user_id = auth.uid())
          )
        );
    $ddl$;
  end if;
end $$;

-- Acceso completo administradores.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'career_revision_proposed_teams'
      and policyname = 'career_revision_proposed_teams_admin_all'
  ) then
    execute $ddl$
      create policy career_revision_proposed_teams_admin_all on public.career_revision_proposed_teams
        for all to authenticated
        using (public.is_admin(auth.uid()))
        with check (public.is_admin(auth.uid()));
    $ddl$;
  end if;
end $$;

-- Grants mínimos para clientes autenticados y rol de servicio.
grant all on table public.career_revision_requests to authenticated, service_role;
grant all on table public.career_revision_items to authenticated, service_role;
grant all on table public.career_revision_proposed_teams to authenticated, service_role;

-- 7) Player honours y stats enlazados a career_items.
alter table if exists public.player_honours
  add column if not exists career_item_id uuid references public.career_items(id) on delete set null;

create index if not exists idx_player_honours_career_item on public.player_honours(career_item_id);

alter table if exists public.stats_seasons
  add column if not exists career_item_id uuid references public.career_items(id) on delete set null;

create index if not exists idx_stats_seasons_career_item on public.stats_seasons(career_item_id);

-- 8) Vista auxiliar para administración: solicitudes pendientes con conteo de equipos propuestos.
create or replace view public.career_revision_inbox as
select
  crr.id,
  crr.player_id,
  pp.full_name,
  crr.status,
  crr.submitted_at,
  crr.reviewed_at,
  crr.resolution_note,
  coalesce(jsonb_array_length(crr.current_snapshot), 0) as snapshot_items,
  (select count(*) from public.career_revision_items cri where cri.request_id = crr.id) as requested_items,
  (select count(*) from public.career_revision_proposed_teams crt where crt.request_id = crr.id) as proposed_teams
from public.career_revision_requests crr
join public.player_profiles pp on pp.id = crr.player_id;

grant select on public.career_revision_inbox to authenticated, service_role;

commit;
