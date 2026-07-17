-- Make gyms.member_count a real live count of current gym_members rows,
-- instead of the seeded/denormalized "artificial density" number the
-- original schema comment described. For now, correctness over marketing
-- polish — dynamically-created gyms had no seeding step wiring the seeded
-- number anyway, so they all sat at 0.

-- One-time backfill: recompute from the current gym_members state.
update public.gyms g
set member_count = (
  select count(*) from public.gym_members m
  where m.gym_id = g.id and m.is_current
);

-- Keep it live going forward: adjust on join/switch/leave/account-delete.
create or replace function public.gym_members_maintain_member_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.is_current then
      update public.gyms set member_count = member_count + 1 where id = new.gym_id;
    end if;
  elsif tg_op = 'UPDATE' then
    if old.is_current and not new.is_current then
      update public.gyms set member_count = greatest(member_count - 1, 0) where id = old.gym_id;
    elsif not old.is_current and new.is_current then
      update public.gyms set member_count = member_count + 1 where id = new.gym_id;
    end if;
  elsif tg_op = 'DELETE' then
    if old.is_current then
      update public.gyms set member_count = greatest(member_count - 1, 0) where id = old.gym_id;
    end if;
  end if;
  return null;
end;
$$;

create trigger gym_members_member_count_trigger
  after insert or update or delete on public.gym_members
  for each row execute function public.gym_members_maintain_member_count();
