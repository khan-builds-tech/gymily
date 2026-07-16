-- Phase 3 (Profiles & Gyms, continued) — open up gym_members visibility so a
-- gym's member list can be shown, and add join_gym for switching to an
-- already-known gym (vs. select_gym, which also upserts from Google Places).

drop policy "Users can view their own memberships" on public.gym_members;

create policy "Gym memberships are viewable by authenticated users"
  on public.gym_members for select
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- join_gym — set an existing gym as the caller's current gym. Unlike
-- select_gym, this never touches public.gyms (the gym must already exist);
-- it only rewrites gym_members/profiles.gym_id for the caller.
-- ---------------------------------------------------------------------------
create or replace function public.join_gym(p_gym_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.gym_members
    set is_current = false
    where user_id = auth.uid() and is_current;

  insert into public.gym_members (user_id, gym_id, is_current)
  values (auth.uid(), p_gym_id, true);

  update public.profiles set gym_id = p_gym_id where id = auth.uid();
end;
$$;

grant execute on function public.join_gym(uuid) to authenticated;
