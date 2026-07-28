-- Feed: drop the gym/follow restriction — the Feed now shows every post,
-- not just the caller's gym or people they follow. `follows` stays as a
-- social graph (profile counts, Follow/Unfollow) but no longer gates what's
-- visible in get_feed. Supersedes the visibility clause from
-- 20260723100000_posts_likes_comments.sql.

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
  order by p.created_at desc
  limit least(p_limit, 50);
$$;
