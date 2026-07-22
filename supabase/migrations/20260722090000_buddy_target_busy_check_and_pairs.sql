-- Fix: send_buddy_request only checked the CALLER's active-buddy status, not
-- the target's — so a third person could still request someone who was
-- already paired up (respond_buddy_request would have caught it, but only
-- once the target tried to accept, not when the request was sent).
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

  if exists (
    select 1 from public.buddy_requests
    where status = 'accepted' and expires_at > now()
      and (requester_id = auth.uid() or target_id = auth.uid())
  ) then
    raise exception 'You are already training with someone';
  end if;

  if exists (
    select 1 from public.buddy_requests
    where status = 'accepted' and expires_at > now()
      and (requester_id = p_target_id or target_id = p_target_id)
  ) then
    raise exception 'That person is already training with someone else';
  end if;

  insert into public.buddy_requests (requester_id, target_id, expires_at)
  values (auth.uid(), p_target_id, now() + interval '3 hours')
  returning id into v_id;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- gym_buddy_pairs — who's currently paired with whom at a gym, so the rest of
-- the "training now" roster can see "A & B are training together" the same
-- way A and B see each other (docs/buddy-up.md visibility gap). Returned via
-- a security-definer function rather than loosening buddy_requests' RLS,
-- since it deliberately narrows exposure to just accepted+live pairs where
-- both people are still actively checked in at this gym right now — no
-- pending/rejected request details leak.
-- ---------------------------------------------------------------------------
create or replace function public.gym_buddy_pairs(p_gym_id uuid)
returns table (
  user_id uuid,
  buddy_id uuid,
  buddy_username text,
  buddy_full_name text,
  buddy_avatar_url text
)
language sql
security definer
set search_path = ''
stable
as $$
  select br.requester_id, br.target_id, t.username, t.full_name, t.avatar_url
    from public.buddy_requests br
    join public.profiles t on t.id = br.target_id
    join public.check_ins ci_r on ci_r.user_id = br.requester_id
      and ci_r.gym_id = p_gym_id and ci_r.checked_out_at is null and ci_r.expires_at > now()
    join public.check_ins ci_t on ci_t.user_id = br.target_id
      and ci_t.gym_id = p_gym_id and ci_t.checked_out_at is null and ci_t.expires_at > now()
   where br.status = 'accepted' and br.expires_at > now()
  union all
  select br.target_id, br.requester_id, r.username, r.full_name, r.avatar_url
    from public.buddy_requests br
    join public.profiles r on r.id = br.requester_id
    join public.check_ins ci_r on ci_r.user_id = br.requester_id
      and ci_r.gym_id = p_gym_id and ci_r.checked_out_at is null and ci_r.expires_at > now()
    join public.check_ins ci_t on ci_t.user_id = br.target_id
      and ci_t.gym_id = p_gym_id and ci_t.checked_out_at is null and ci_t.expires_at > now()
   where br.status = 'accepted' and br.expires_at > now();
$$;

grant execute on function public.gym_buddy_pairs(uuid) to authenticated;
