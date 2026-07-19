-- Enforce "you cannot buddy up with more than one person" server-side, and
-- add a way to explicitly end a buddy session (vs. waiting out expires_at).

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

  insert into public.buddy_requests (requester_id, target_id, expires_at)
  values (auth.uid(), p_target_id, now() + interval '3 hours')
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.respond_buddy_request(p_request_id uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_requester_id uuid;
begin
  if p_accept then
    select requester_id into v_requester_id
      from public.buddy_requests
      where id = p_request_id and target_id = auth.uid() and status = 'pending';

    if v_requester_id is null then
      raise exception 'No pending request found to respond to';
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
        and (requester_id = v_requester_id or target_id = v_requester_id)
    ) then
      raise exception 'That person is already training with someone else';
    end if;
  end if;

  update public.buddy_requests
    set status = case when p_accept then 'accepted' else 'rejected' end,
        responded_at = now()
    where id = p_request_id and target_id = auth.uid() and status = 'pending';

  if not found then
    raise exception 'No pending request found to respond to';
  end if;
end;
$$;

-- end_buddy_session — explicitly end the caller's active buddy connection(s),
-- rather than waiting for expires_at. Reuses expires_at as the "still live"
-- signal everything else already checks, so no new status value is needed.
create or replace function public.end_buddy_session()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.buddy_requests
    set expires_at = now()
    where status = 'accepted' and expires_at > now()
      and (requester_id = auth.uid() or target_id = auth.uid());
end;
$$;

grant execute on function public.end_buddy_session() to authenticated;
