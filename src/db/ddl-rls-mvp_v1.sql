-- Extensiones
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- Enums (idempotentes)
do $$ begin create type role as enum ('player','coach','manager','reviewer','admin'); exception when duplicate_object then null; end $$;
do $$ begin create type visibility as enum ('public','private'); exception when duplicate_object then null; end $$;
do $$ begin create type media_type as enum ('photo','video','doc'); exception when duplicate_object then null; end $$;
do $$ begin create type review_status as enum ('pending','approved','rejected'); exception when duplicate_object then null; end $$;
do $$ begin create type plan as enum ('free','pro','pro_plus'); exception when duplicate_object then null; end $$;
do $$ begin create type reviewer_perm_status as enum ('pending','granted','revoked'); exception when duplicate_object then null; end $$;
do $$ begin create type invite_status as enum ('sent','accepted','expired','revoked'); exception when duplicate_object then null; end $$;

-- user_profiles
create table if not exists public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  role role not null default 'player',
  created_at timestamptz not null default now()
);

-- player_profiles
create table if not exists public.player_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  slug text not null unique,
  full_name text not null,
  birth_date date,
  nationality text[],
  foot text,
  height_cm integer,
  weight_kg integer,
  positions text[],
  current_club text,
  bio text,
  visibility visibility not null default 'public',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_player_profiles_user on public.player_profiles(user_id);
create index if not exists idx_player_slug on public.player_profiles(slug);

-- player_media
create table if not exists public.player_media (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.player_profiles(id) on delete cascade,
  type media_type not null,
  url text not null,
  title text,
  provider text,
  created_at timestamptz not null default now()
);
create index if not exists idx_player_media_player on public.player_media(player_id);

-- career_items
create table if not exists public.career_items (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.player_profiles(id) on delete cascade,
  club text not null,
  division text,
  start_date date,
  end_date date,
  created_at timestamptz not null default now()
);
create index if not exists idx_career_player on public.career_items(player_id);

-- stats_seasons
create table if not exists public.stats_seasons (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.player_profiles(id) on delete cascade,
  season text not null,
  matches int default 0,
  goals int default 0,
  assists int default 0,
  minutes int default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_stats_player on public.stats_seasons(player_id);

-- reviewer_profiles
create table if not exists public.reviewer_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  slug text unique,
  full_name text,
  role_label text,
  club text,
  bio text,
  contact_email text,
  contact_phone_enc text,
  visibility visibility not null default 'private',
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_reviewer_profiles_user on public.reviewer_profiles(user_id);

-- reviewer_permissions
create table if not exists public.reviewer_permissions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.player_profiles(id) on delete cascade,
  reviewer_id uuid not null references public.reviewer_profiles(id) on delete cascade,
  granted_by_user_id uuid not null references auth.users(id) on delete cascade,
  status reviewer_perm_status not null default 'granted',
  created_at timestamptz not null default now()
);
create unique index if not exists uniq_reviewer_permission on public.reviewer_permissions(player_id, reviewer_id);

-- review_invitations
create table if not exists public.review_invitations (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.player_profiles(id) on delete cascade,
  invitee_email_hash text not null,
  invitee_name text,
  role_label text,
  token_hash text not null,
  expires_at timestamptz,
  status invite_status not null default 'sent',
  created_at timestamptz not null default now()
);
create index if not exists idx_inv_player on public.review_invitations(player_id);

-- reviews
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.player_profiles(id) on delete cascade,
  author_user_id uuid references auth.users(id),
  author_reviewer_id uuid references public.reviewer_profiles(id),
  author_name text,
  author_email_hash text,
  content text not null,
  rating int,
  status review_status not null default 'pending',
  created_at timestamptz not null default now()
);
create index if not exists idx_reviews_player_status on public.reviews(player_id, status);
create index if not exists idx_reviews_author_reviewer on public.reviews(author_reviewer_id);

-- subscriptions
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  plan plan not null default 'free',
  status text not null default 'active',
  limits_json jsonb not null default '{}'::jsonb,
  current_period_end timestamptz,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- audit_logs
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  actor_ip inet,
  action text not null,
  subject_table text,
  subject_id uuid,
  meta jsonb,
  created_at timestamptz not null default now()
);


-- is_admin robusta para evaluation en RLS
create or replace function public.is_admin(u uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.user_profiles up
    where up.user_id = u
      and up.role = 'admin'::role
  );
$$;

revoke all on function public.is_admin(uuid) from public;
grant execute on function public.is_admin(uuid) to anon, authenticated;

-- helpers de límites/planes
create or replace function public.get_limits_for_player(p_player_id uuid)
returns jsonb language sql stable as $$
  select coalesce(s.limits_json, '{}'::jsonb)
  from public.player_profiles p
  left join public.subscriptions s on s.user_id = p.user_id
  where p.id = p_player_id
  limit 1;
$$;

create or replace function public.plan_allows_reviews(p_player_id uuid)
returns boolean language sql stable as $$
  select coalesce((get_limits_for_player(p_player_id)->>'reviews_enabled')::boolean, false);
$$;

create or replace function public.plan_allows_invites(p_player_id uuid)
returns boolean language sql stable as $$
  select coalesce((get_limits_for_player(p_player_id)->>'can_invite_reviews')::boolean, false);
$$;

create or replace function public.max_active_invitations(p_player_id uuid)
returns integer language sql stable as $$
  select coalesce((get_limits_for_player(p_player_id)->>'max_active_invitations')::int, 0);
$$;

create or replace function public.active_invitations_count(p_player_id uuid)
returns integer language sql stable as $$
  select count(*)::int
  from public.review_invitations i
  where i.player_id = p_player_id
    and i.status = 'sent'::invite_status
    and (i.expires_at is null or i.expires_at > now());
$$;

create or replace function public.can_create_invitation(p_player_id uuid)
returns boolean language sql stable as $$
  select plan_allows_invites(p_player_id)
     and active_invitations_count(p_player_id) < max_active_invitations(p_player_id);
$$;

create or replace function public.max_media_allowed(p_player_id uuid, p_type media_type)
returns integer language sql stable as $$
  select case
    when p_type = 'photo'::media_type then coalesce((get_limits_for_player(p_player_id)->>'max_photos')::int, 0)
    when p_type = 'video'::media_type then coalesce((get_limits_for_player(p_player_id)->>'max_videos')::int, 0)
    else 0 end;
$$;

create or replace function public.can_add_media(p_user_id uuid, p_player_id uuid, p_type media_type)
returns boolean language sql stable as $$
  with owner as (
    select 1 from public.player_profiles p where p.id = p_player_id and p.user_id = p_user_id
  ),
  cnt as (
    select count(*)::int as c from public.player_media m where m.player_id = p_player_id and m.type = p_type
  )
  select exists(select 1 from owner) and (select c from cnt) < max_media_allowed(p_player_id, p_type);
$$;


-- user_profiles
alter table public.user_profiles enable row level security;
drop policy if exists user_profiles_select on public.user_profiles;
create policy user_profiles_select on public.user_profiles
for select using (user_id = auth.uid() or public.is_admin(auth.uid()));
drop policy if exists user_profiles_update on public.user_profiles;
create policy user_profiles_update on public.user_profiles
for update using (user_id = auth.uid() or public.is_admin(auth.uid()));

-- player_profiles
alter table public.player_profiles enable row level security;
drop policy if exists player_profiles_read on public.player_profiles;
create policy player_profiles_read on public.player_profiles
for select
using (
  visibility = 'public'::visibility
  or user_id = auth.uid()
  or public.is_admin(auth.uid())
);
drop policy if exists player_profiles_cud on public.player_profiles;
create policy player_profiles_cud on public.player_profiles
for all
using (user_id = auth.uid() or public.is_admin(auth.uid()))
with check (user_id = auth.uid() or public.is_admin(auth.uid()));

-- player_media
alter table public.player_media enable row level security;
drop policy if exists player_media_select on public.player_media;
create policy player_media_select on public.player_media
for select
using (
  exists(
    select 1 from public.player_profiles p
    where p.id = player_id and (p.visibility = 'public'::visibility or p.user_id = auth.uid())
  )
  or public.is_admin(auth.uid())
);
drop policy if exists player_media_owner_insert_limit on public.player_media;
create policy player_media_owner_insert_limit on public.player_media
for insert
with check (
  exists (select 1 from public.player_profiles p where p.id = player_id and p.user_id = auth.uid())
  and public.can_add_media(auth.uid(), player_id, type)
);
drop policy if exists player_media_owner_update on public.player_media;
create policy player_media_owner_update on public.player_media
for update
using (
  exists (select 1 from public.player_profiles p where p.id = player_id and p.user_id = auth.uid())
  or public.is_admin(auth.uid())
);
drop policy if exists player_media_owner_delete on public.player_media;
create policy player_media_owner_delete on public.player_media
for delete
using (
  exists (select 1 from public.player_profiles p where p.id = player_id and p.user_id = auth.uid())
  or public.is_admin(auth.uid())
);

-- career_items
alter table public.career_items enable row level security;
drop policy if exists career_select on public.career_items;
create policy career_select on public.career_items
for select
using (
  exists (
    select 1 from public.player_profiles p
    where p.id = player_id and (p.visibility = 'public'::visibility or p.user_id = auth.uid())
  )
  or public.is_admin(auth.uid())
);
drop policy if exists career_cud on public.career_items;
create policy career_cud on public.career_items
for all
using (
  exists (select 1 from public.player_profiles p where p.id = player_id and p.user_id = auth.uid())
  or public.is_admin(auth.uid())
)
with check (
  exists (select 1 from public.player_profiles p where p.id = player_id and p.user_id = auth.uid())
  or public.is_admin(auth.uid())
);

-- stats_seasons
alter table public.stats_seasons enable row level security;
drop policy if exists stats_select on public.stats_seasons;
create policy stats_select on public.stats_seasons
for select
using (
  exists (
    select 1 from public.player_profiles p
    where p.id = player_id and (p.visibility = 'public'::visibility or p.user_id = auth.uid())
  )
  or public.is_admin(auth.uid())
);
drop policy if exists stats_cud on public.stats_seasons;
create policy stats_cud on public.stats_seasons
for all
using (
  exists (select 1 from public.player_profiles p where p.id = player_id and p.user_id = auth.uid())
  or public.is_admin(auth.uid())
)
with check (
  exists (select 1 from public.player_profiles p where p.id = player_id and p.user_id = auth.uid())
  or public.is_admin(auth.uid())
);

-- review_invitations
alter table public.review_invitations enable row level security;
drop policy if exists inv_select on public.review_invitations;
create policy inv_select on public.review_invitations
for select
using (
  exists (select 1 from public.player_profiles p where p.id = player_id and p.user_id = auth.uid())
  or public.is_admin(auth.uid())
);
drop policy if exists inv_insert on public.review_invitations;
create policy inv_insert on public.review_invitations
for insert
with check (
  exists (select 1 from public.player_profiles p where p.id = player_id and p.user_id = auth.uid())
  and public.can_create_invitation(player_id)
);
drop policy if exists inv_update on public.review_invitations;
create policy inv_update on public.review_invitations
for update
using (
  public.is_admin(auth.uid())
  or exists (select 1 from public.player_profiles p where p.id = player_id and p.user_id = auth.uid())
);

-- reviews
alter table public.reviews enable row level security;
drop policy if exists reviews_public_read on public.reviews;
create policy reviews_public_read on public.reviews
for select
using (
  status = 'approved'::review_status
  or public.is_admin(auth.uid())
  or exists (select 1 from public.player_profiles p where p.id = reviews.player_id and p.user_id = auth.uid())
);
drop policy if exists reviews_insert_reviewer on public.reviews;
create policy reviews_insert_reviewer on public.reviews
for insert
with check (
  public.plan_allows_reviews(reviews.player_id)
  and exists (
    select 1
    from public.reviewer_profiles r
    join public.reviewer_permissions rp on rp.reviewer_id = r.id
    where r.user_id = auth.uid()
      and rp.player_id = reviews.player_id
      and rp.status = 'granted'::reviewer_perm_status
  )
);
-- (inserción por invitación: usar service role tras validar token)

-- reviewer_profiles
alter table public.reviewer_profiles enable row level security;
drop policy if exists reviewer_profiles_select on public.reviewer_profiles;
create policy reviewer_profiles_select on public.reviewer_profiles
for select
using (visibility = 'public'::visibility or user_id = auth.uid() or public.is_admin(auth.uid()));
drop policy if exists reviewer_profiles_update on public.reviewer_profiles;
create policy reviewer_profiles_update on public.reviewer_profiles
for update
using (user_id = auth.uid() or public.is_admin(auth.uid()));
drop policy if exists reviewer_profiles_insert on public.reviewer_profiles;
create policy reviewer_profiles_insert on public.reviewer_profiles
for insert
with check (public.is_admin(auth.uid()));

-- reviewer_permissions
alter table public.reviewer_permissions enable row level security;
drop policy if exists reviewer_permissions_select on public.reviewer_permissions;
create policy reviewer_permissions_select on public.reviewer_permissions
for select
using (
  public.is_admin(auth.uid())
  or exists (select 1 from public.player_profiles p where p.id = reviewer_permissions.player_id and p.user_id = auth.uid())
  or exists (select 1 from public.reviewer_profiles r where r.id = reviewer_permissions.reviewer_id and r.user_id = auth.uid())
);
drop policy if exists reviewer_permissions_insert on public.reviewer_permissions;
create policy reviewer_permissions_insert on public.reviewer_permissions
for insert
with check (
  public.is_admin(auth.uid())
  or exists (select 1 from public.player_profiles p where p.id = reviewer_permissions.player_id and p.user_id = auth.uid())
);
drop policy if exists reviewer_permissions_update on public.reviewer_permissions;
create policy reviewer_permissions_update on public.reviewer_permissions
for update
using (
  public.is_admin(auth.uid())
  or exists (select 1 from public.player_profiles p where p.id = reviewer_permissions.player_id and p.user_id = auth.uid())
);
drop policy if exists reviewer_permissions_delete on public.reviewer_permissions;
create policy reviewer_permissions_delete on public.reviewer_permissions
for delete
using (public.is_admin(auth.uid()));

-- subscriptions
alter table public.subscriptions enable row level security;
drop policy if exists subs_select on public.subscriptions;
create policy subs_select on public.subscriptions
for select
using (user_id = auth.uid() or public.is_admin(auth.uid()));
drop policy if exists subs_update on public.subscriptions;
create policy subs_update on public.subscriptions
for update
using (public.is_admin(auth.uid()));

-- audit_logs
alter table public.audit_logs enable row level security;
drop policy if exists audit_select on public.audit_logs;
create policy audit_select on public.audit_logs
for select
using (public.is_admin(auth.uid()));


create index if not exists idx_reviews_player_status on public.reviews(player_id, status);
create index if not exists idx_reviews_author_reviewer on public.reviews(author_reviewer_id);
create index if not exists idx_player_media_player on public.player_media(player_id);
create index if not exists idx_career_player on public.career_items(player_id);
create index if not exists idx_stats_player on public.stats_seasons(player_id);
create index if not exists idx_inv_player on public.review_invitations(player_id);
create index if not exists idx_reviewer_profiles_user on public.reviewer_profiles(user_id);
create index if not exists idx_player_profiles_user on public.player_profiles(user_id);
create index if not exists idx_player_slug on public.player_profiles(slug);
