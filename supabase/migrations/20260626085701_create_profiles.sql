-- Phase 2 (Authentication) — `profiles` table.
--
-- profiles is the public-facing identity for each user, 1:1 with auth.users.
-- Credentials, email, email-verified state and OAuth identities all live in the
-- Supabase-managed `auth.users` table — we never store passwords ourselves.

-- citext gives us case-insensitive, unique usernames (so "Aman" == "aman").
create extension if not exists citext;

create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  username   citext      not null unique,
  full_name  text        not null default '',
  bio        text,
  avatar_url text,
  city       text,
  -- Current gym. Kept as a plain uuid for now; the FK -> public.gyms(id)
  -- is added in the Phase 3 (gyms) migration, once that table exists.
  gym_id     uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[a-zA-Z0-9_]{3,30}$')
);

comment on table public.profiles is 'Public user profile, 1:1 with auth.users (Phase 2).';
comment on column public.profiles.gym_id is 'Current gym; FK to public.gyms added in Phase 3.';

create index profiles_gym_id_idx on public.profiles (gym_id);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auto-create a profile when a new auth user is created.
--
--   * Email/password signup passes `username` + `full_name` via user metadata
--     (raw_user_meta_data), so we use those directly.
--   * Google OAuth signup has no username yet, so we generate a collision-safe
--     provisional one ("user_<id-fragment>"). The app routes such users through
--     a "choose your username" screen to claim a real one.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- text (not citext): with search_path = '' the citext type isn't resolvable
  -- unqualified, and a plain text value casts cleanly into the citext column.
  v_username text := nullif(trim(new.raw_user_meta_data ->> 'username'), '');
begin
  if v_username is null then
    v_username := 'user_' || substr(replace(new.id::text, '-', ''), 1, 12);
  end if;

  insert into public.profiles (id, username, full_name, avatar_url)
  values (
    new.id,
    v_username,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), ''),
    new.raw_user_meta_data ->> 'avatar_url'
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security — the V1 authorization backbone.
-- Profiles are readable by any signed-in user; writable only by their owner.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

create policy "Profiles are viewable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- Table privileges. RLS governs *which rows* a role sees, but a role still
-- needs table-level GRANTs to touch the table at all. service_role bypasses
-- RLS but NOT grants, so it must be granted explicitly.
-- ---------------------------------------------------------------------------
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
