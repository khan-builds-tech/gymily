-- Phase 4 (Realtime Presence) — check_ins is the source of truth for who's
-- actually training at a gym right now ("Training Now"), separate from
-- gym_members (total "Members", Phase 3). Self-reported, no geo-verification.

create table public.check_ins (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles (id) on delete cascade,
  gym_id          uuid not null references public.gyms (id) on delete cascade,
  checked_in_at   timestamptz not null default now(),
  last_active_at  timestamptz not null default now(),
  expires_at      timestamptz not null,
  checked_out_at  timestamptz
);

comment on table public.check_ins is 'Live presence ("Training Now"), Phase 4. Active = checked_out_at is null and expires_at > now().';

-- Only one active check-in per user at a time.
create unique index check_ins_one_active_per_user
  on public.check_ins (user_id)
  where checked_out_at is null;

-- Matches the architecture doc's "active members" query shape exactly.
create index check_ins_active_idx
  on public.check_ins (gym_id, expires_at)
  where checked_out_at is null;

alter table public.check_ins enable row level security;

-- Who's training now is core social/discovery content, not private — same
-- open-read posture as gym_members.
create policy "Check-ins are viewable by authenticated users"
  on public.check_ins for select
  to authenticated
  using (true);

grant select on public.check_ins to authenticated;
grant all on public.check_ins to service_role;

-- ---------------------------------------------------------------------------
-- check_in — close any existing active check-in for the caller, then open a
-- new one. Self-reported: no verification the caller is actually at the gym.
-- ---------------------------------------------------------------------------
create or replace function public.check_in(p_gym_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  update public.check_ins
    set checked_out_at = now()
    where user_id = auth.uid() and checked_out_at is null;

  insert into public.check_ins (user_id, gym_id, expires_at)
  values (auth.uid(), p_gym_id, now() + interval '5 minutes')
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.check_in(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- checkin_heartbeat — bump the caller's active check-in so it doesn't expire.
-- No-op if the caller has no active check-in (e.g. it already timed out).
-- ---------------------------------------------------------------------------
create or replace function public.checkin_heartbeat()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.check_ins
    set last_active_at = now(), expires_at = now() + interval '5 minutes'
    where user_id = auth.uid() and checked_out_at is null;
end;
$$;

grant execute on function public.checkin_heartbeat() to authenticated;

-- ---------------------------------------------------------------------------
-- check_out — manually end the caller's active check-in.
-- ---------------------------------------------------------------------------
create or replace function public.check_out()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.check_ins
    set checked_out_at = now()
    where user_id = auth.uid() and checked_out_at is null;
end;
$$;

grant execute on function public.check_out() to authenticated;

-- First table added to this publication — enables Realtime subscriptions
-- (e.g. a `gym:{id}:presence` channel) filtered on check_ins changes.
alter publication supabase_realtime add table public.check_ins;
