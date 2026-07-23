-- Phase 5 (Feed) — `posts`, `post_likes`, `post_comments`, and the `get_feed`
-- read function. Step 2 of the Feed scope in docs/feed.md.
--
-- Deviates from docs/feed.md in one place: no `updated_at` column on posts.
-- v1 has no edit-post feature, and an updated_at that only ever moves because
-- a like/comment trigger touched the row would be misleading, not useful —
-- add it back if/when post editing actually ships.

create table public.posts (
  id            uuid primary key default gen_random_uuid(),
  author_id     uuid not null references public.profiles (id) on delete cascade,
  -- Snapshotted from profiles.gym_id at post time, so a later gym switch
  -- doesn't rewrite which gym's feed this post belongs to.
  gym_id        uuid references public.gyms (id) on delete set null,
  body          text,
  image_url     text,
  like_count    int not null default 0,
  comment_count int not null default 0,
  created_at    timestamptz not null default now(),
  constraint posts_body_or_image check (coalesce(body, '') <> '' or image_url is not null)
);

comment on table public.posts is 'Feed posts (docs/feed.md). Visible to all authenticated users, same as profiles.';

create index posts_gym_id_created_at_idx on public.posts (gym_id, created_at desc);
create index posts_author_id_created_at_idx on public.posts (author_id, created_at desc);

alter table public.posts enable row level security;

-- Public, like profiles/gyms/check_ins — posts show on a profile regardless
-- of follow status; the Feed itself is a personalized query on top, not a
-- visibility restriction.
create policy "Posts are viewable by authenticated users"
  on public.posts for select
  to authenticated
  using (true);

create policy "Users can create their own posts"
  on public.posts for insert
  to authenticated
  with check (auth.uid() = author_id);

create policy "Users can delete their own posts"
  on public.posts for delete
  to authenticated
  using (auth.uid() = author_id);

grant select, insert, delete on public.posts to authenticated;
grant all on public.posts to service_role;

-- ---------------------------------------------------------------------------
-- post_likes
-- ---------------------------------------------------------------------------
create table public.post_likes (
  post_id    uuid not null references public.posts (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.post_likes enable row level security;

create policy "Post likes are viewable by authenticated users"
  on public.post_likes for select
  to authenticated
  using (true);

create policy "Users can like as themselves"
  on public.post_likes for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can unlike as themselves"
  on public.post_likes for delete
  to authenticated
  using (auth.uid() = user_id);

grant select, insert, delete on public.post_likes to authenticated;
grant all on public.post_likes to service_role;

create or replace function public.post_likes_maintain_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set like_count = like_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.posts set like_count = greatest(like_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end;
$$;

create trigger post_likes_maintain_count_trigger
  after insert or delete on public.post_likes
  for each row execute function public.post_likes_maintain_count();

-- ---------------------------------------------------------------------------
-- post_comments
-- ---------------------------------------------------------------------------
create table public.post_comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts (id) on delete cascade,
  author_id  uuid not null references public.profiles (id) on delete cascade,
  body       text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now()
);

create index post_comments_post_id_created_at_idx on public.post_comments (post_id, created_at);

alter table public.post_comments enable row level security;

create policy "Post comments are viewable by authenticated users"
  on public.post_comments for select
  to authenticated
  using (true);

create policy "Users can comment as themselves"
  on public.post_comments for insert
  to authenticated
  with check (auth.uid() = author_id);

-- Own-comment delete only for v1 — a post author can't moderate comments on
-- their own post yet (see docs/feed.md).
create policy "Users can delete their own comments"
  on public.post_comments for delete
  to authenticated
  using (auth.uid() = author_id);

grant select, insert, delete on public.post_comments to authenticated;
grant all on public.post_comments to service_role;

create or replace function public.post_comments_maintain_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set comment_count = comment_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.posts set comment_count = greatest(comment_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end;
$$;

create trigger post_comments_maintain_count_trigger
  after insert or delete on public.post_comments
  for each row execute function public.post_comments_maintain_count();

-- ---------------------------------------------------------------------------
-- get_feed — "gym posts + people you follow + your own", cursor-paginated by
-- created_at. The one read that can't be a plain .from().select() from the
-- client, so it's a security-definer function called directly via
-- supabase.rpc('get_feed', ...) — same "reads bypass Fastify" convention as
-- every other hook (useActiveMembers, useGymDetail, ...).
-- ---------------------------------------------------------------------------
create or replace function public.get_feed(p_before timestamptz default now(), p_limit int default 20)
returns table (
  id                uuid,
  author_id         uuid,
  gym_id            uuid,
  body              text,
  image_url         text,
  like_count        int,
  comment_count     int,
  created_at        timestamptz,
  author_username   text,
  author_full_name  text,
  author_avatar_url text,
  liked_by_me       boolean
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    p.id, p.author_id, p.gym_id, p.body, p.image_url, p.like_count, p.comment_count, p.created_at,
    pr.username::text, pr.full_name, pr.avatar_url,
    exists (
      select 1 from public.post_likes l where l.post_id = p.id and l.user_id = auth.uid()
    ) as liked_by_me
  from public.posts p
  join public.profiles pr on pr.id = p.author_id
  where p.created_at < p_before
    and (
      p.author_id = auth.uid()
      or p.gym_id = (select gym_id from public.profiles where id = auth.uid())
      or p.author_id in (select following_id from public.follows where follower_id = auth.uid())
    )
  order by p.created_at desc
  limit least(p_limit, 50);
$$;

grant execute on function public.get_feed(timestamptz, int) to authenticated;
