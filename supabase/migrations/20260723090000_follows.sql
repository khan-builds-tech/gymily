-- Phase 5 (Feed) — `follows`, the prerequisite for "gym posts + people you
-- follow" (docs/phase-2-flow.md). Step 1 of the Feed scope in docs/feed.md.

create table public.follows (
  follower_id  uuid not null references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint follows_not_self check (follower_id <> following_id)
);

comment on table public.follows is 'Follow graph for the Feed (docs/feed.md). Public, like gyms/check_ins.';

create index follows_following_id_idx on public.follows (following_id);

alter table public.follows enable row level security;

-- Public, like check_ins/gyms — who follows whom is discovery content, not private.
create policy "Follows are viewable by authenticated users"
  on public.follows for select
  to authenticated
  using (true);

create policy "Users can follow as themselves"
  on public.follows for insert
  to authenticated
  with check (auth.uid() = follower_id);

create policy "Users can unfollow as themselves"
  on public.follows for delete
  to authenticated
  using (auth.uid() = follower_id);

grant select, insert, delete on public.follows to authenticated;
grant all on public.follows to service_role;

-- ---------------------------------------------------------------------------
-- Denormalized follower/following counts on profiles — same pattern as
-- gyms.member_count (Phase 3): correct-by-trigger, cheap to read on a
-- profile screen without a count(*) query.
-- ---------------------------------------------------------------------------
alter table public.profiles add column followers_count int not null default 0;
alter table public.profiles add column following_count int not null default 0;

create or replace function public.follows_maintain_counts()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.profiles set following_count = following_count + 1 where id = new.follower_id;
    update public.profiles set followers_count = followers_count + 1 where id = new.following_id;
  elsif tg_op = 'DELETE' then
    update public.profiles set following_count = greatest(following_count - 1, 0) where id = old.follower_id;
    update public.profiles set followers_count = greatest(followers_count - 1, 0) where id = old.following_id;
  end if;
  return null;
end;
$$;

create trigger follows_maintain_counts_trigger
  after insert or delete on public.follows
  for each row execute function public.follows_maintain_counts();
