-- Phase 3 (Gyms) — `gyms` + `gym_members`, and the wiring needed to link a
-- profile to a gym at signup (Google Places-sourced gym search/select).

create extension if not exists postgis;
create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------------
-- gyms
-- ---------------------------------------------------------------------------
create table public.gyms (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  location         geography(Point, 4326) not null,
  address          text,
  city             text,
  state            text,
  country          text,
  -- Dedupes gyms promoted from Google Places; null for manually-created gyms.
  google_place_id  text unique,
  -- Denormalized total "Members" (incl. seeded density). "Training Now" is
  -- computed live from check_ins (Phase 4), never stored here.
  member_count     int not null default 0,
  created_by       uuid references public.profiles (id),
  verified         boolean not null default false,
  created_at       timestamptz not null default now()
);

comment on table public.gyms is 'Gym directory, sourced from Google Places or user-created (Phase 3).';

create index gyms_location_idx on public.gyms using gist (location);
create index gyms_city_idx on public.gyms (city);
create index gyms_name_trgm_idx on public.gyms using gin (name gin_trgm_ops);

alter table public.gyms enable row level security;

create policy "Gyms are viewable by authenticated users"
  on public.gyms for select
  to authenticated
  using (true);

grant select on public.gyms to authenticated;
grant all on public.gyms to service_role;

-- ---------------------------------------------------------------------------
-- gym_members — membership history / current
-- ---------------------------------------------------------------------------
create table public.gym_members (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  gym_id      uuid not null references public.gyms (id) on delete cascade,
  is_current  boolean not null default true,
  joined_at   timestamptz not null default now()
);

comment on table public.gym_members is 'Gym membership history; one current gym per user (Phase 3).';

-- Only one "current" gym per user.
create unique index gym_members_one_current_per_user
  on public.gym_members (user_id)
  where is_current;

create index gym_members_gym_id_idx on public.gym_members (gym_id);

alter table public.gym_members enable row level security;

create policy "Users can view their own memberships"
  on public.gym_members for select
  to authenticated
  using (auth.uid() = user_id);

grant select on public.gym_members to authenticated;
grant all on public.gym_members to service_role;

-- ---------------------------------------------------------------------------
-- profiles — the FK deferred by the Phase 2 migration, now that gyms exists.
-- ---------------------------------------------------------------------------
alter table public.profiles
  add constraint profiles_gym_id_fkey foreign key (gym_id) references public.gyms (id);

alter table public.profiles
  add column needs_username boolean not null default false;

comment on column public.profiles.needs_username is
  'True for OAuth signups that got an auto-generated placeholder username and must claim a real one.';

-- ---------------------------------------------------------------------------
-- handle_new_user — flag placeholder usernames so the app can prompt to claim one.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_username text := nullif(trim(new.raw_user_meta_data ->> 'username'), '');
  v_needs_username boolean := false;
begin
  if v_username is null then
    v_username := 'user_' || substr(replace(new.id::text, '-', ''), 1, 12);
    v_needs_username := true;
  end if;

  insert into public.profiles (id, username, full_name, avatar_url, needs_username)
  values (
    new.id,
    v_username,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), ''),
    new.raw_user_meta_data ->> 'avatar_url',
    v_needs_username
  );

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- select_gym — atomically upsert a gym (by Google place id), set it as the
-- caller's current gym_members row, and cache gym_id on their profile.
-- Callable directly by `authenticated` (relies on auth.uid(), not an
-- explicit user_id param, so a caller can only ever act on their own row).
-- ---------------------------------------------------------------------------
create or replace function public.select_gym(
  p_google_place_id text,
  p_name text,
  p_address text,
  p_city text,
  p_state text,
  p_country text,
  p_lat double precision,
  p_lng double precision
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_gym_id uuid;
begin
  insert into public.gyms (name, location, address, city, state, country, google_place_id)
  values (
    p_name,
    public.st_setsrid(public.st_makepoint(p_lng, p_lat), 4326)::public.geography,
    p_address, p_city, p_state, p_country, p_google_place_id
  )
  on conflict (google_place_id) do update
    set name = excluded.name,
        address = excluded.address,
        city = excluded.city,
        state = excluded.state,
        country = excluded.country
  returning id into v_gym_id;

  update public.gym_members
    set is_current = false
    where user_id = auth.uid() and is_current;

  insert into public.gym_members (user_id, gym_id, is_current)
  values (auth.uid(), v_gym_id, true);

  update public.profiles set gym_id = v_gym_id where id = auth.uid();

  return v_gym_id;
end;
$$;

grant execute on function public.select_gym(text, text, text, text, text, text, double precision, double precision) to authenticated;
