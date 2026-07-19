-- Buddy Up (docs/buddy-up.md) — in-app only for now, no push notifications
-- (see docs/parked-for-later.md). Requests surface live via Realtime.

create table public.buddy_requests (
  id            uuid primary key default gen_random_uuid(),
  requester_id  uuid not null references public.profiles (id) on delete cascade,
  target_id     uuid not null references public.profiles (id) on delete cascade,
  status        text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at    timestamptz not null default now(),
  responded_at  timestamptz,
  expires_at    timestamptz not null,
  constraint buddy_requests_not_self check (requester_id <> target_id)
);

comment on table public.buddy_requests is 'Buddy Up requests between two people checked into the same gym.';

-- "You can't spam — one pending request per person."
create unique index buddy_requests_one_pending_per_pair
  on public.buddy_requests (requester_id, target_id)
  where status = 'pending';

create index buddy_requests_target_pending_idx
  on public.buddy_requests (target_id)
  where status = 'pending';

alter table public.buddy_requests enable row level security;

-- Personal, not presence — only the two people involved can see a request.
create policy "Buddy requests are viewable by the requester or target"
  on public.buddy_requests for select
  to authenticated
  using (auth.uid() = requester_id or auth.uid() = target_id);

grant select on public.buddy_requests to authenticated;
grant all on public.buddy_requests to service_role;

-- ---------------------------------------------------------------------------
-- send_buddy_request — only allowed if both caller and target are currently
-- checked in at the same gym ("Only people checked in at the same gym can
-- buddy up"). Expires in 3 hours ("expire after the session / a few hours").
-- ---------------------------------------------------------------------------
create or replace function public.send_buddy_request(p_target_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_my_gym uuid;
  v_target_gym uuid;
  v_id uuid;
begin
  select gym_id into v_my_gym
    from public.check_ins
    where user_id = auth.uid() and checked_out_at is null and expires_at > now();

  if v_my_gym is null then
    raise exception 'You must be checked in to send a buddy request';
  end if;

  select gym_id into v_target_gym
    from public.check_ins
    where user_id = p_target_id and checked_out_at is null and expires_at > now();

  if v_target_gym is null or v_target_gym <> v_my_gym then
    raise exception 'That person is not currently training at your gym';
  end if;

  insert into public.buddy_requests (requester_id, target_id, expires_at)
  values (auth.uid(), p_target_id, now() + interval '3 hours')
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.send_buddy_request(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- respond_buddy_request — only the target of a still-pending request may
-- accept or reject it.
-- ---------------------------------------------------------------------------
create or replace function public.respond_buddy_request(p_request_id uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.buddy_requests
    set status = case when p_accept then 'accepted' else 'rejected' end,
        responded_at = now()
    where id = p_request_id and target_id = auth.uid() and status = 'pending';

  if not found then
    raise exception 'No pending request found to respond to';
  end if;
end;
$$;

grant execute on function public.respond_buddy_request(uuid, boolean) to authenticated;

alter publication supabase_realtime add table public.buddy_requests;
