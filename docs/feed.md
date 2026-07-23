# Gymily — Feed Feature (Scope)

Posts from people you follow and from your gym, with likes and comments.
Includes Follow/Unfollow as a prerequisite (no `follows` table exists yet).

Decisions locked in for v1 (asked and answered 2026-07-23):

- **Feed = gym posts ∪ followed-people posts** — build `follows` now, not gym-only.
- **Text + single image per post** — needs an R2 presigned-upload route.
- **Likes + comments** — both ship in v1, not likes-only.

Deliberate v1 narrowing (flag for later, same spirit as `docs/parked-for-later.md`):

- **No server-side image processing.** `docs/phase-3-tech-stack.md`'s blueprint
  describes a raw-bucket → Sharp/FFmpeg → public-bucket pipeline. Skipping that
  for v1: the client compresses/resizes on-device (`expo-image-manipulator`)
  before uploading straight to the public R2 path via a presigned PUT. Revisit
  if upload sizes or formats become a problem.
- **No edit-post.** Delete + repost is fine for v1.
- **Own-comment delete only** — a post author can't delete comments on their
  post (no moderation surface yet).

---

## Data model

### `follows`

```sql
create table public.follows (
  follower_id  uuid not null references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint follows_not_self check (follower_id <> following_id)
);

create index follows_following_id_idx on public.follows (following_id);
```

- RLS: `select` open to `authenticated` (follow graph is public, like `check_ins`/`gyms`); `insert`/`delete` restricted to `auth.uid() = follower_id`.
- `profiles` gains `followers_count int not null default 0` and `following_count int not null default 0` (denormalized, same pattern as `gyms.member_count`).
- Trigger `follows_maintain_counts` (after insert/delete) adjusts both profiles' counts — mirrors `gym_members_maintain_member_count`. No RPC needed; this is a single-table owned-row write, unlike `buddy_requests`/`join_gym` which need cross-table atomicity.

### `posts`

```sql
create table public.posts (
  id            uuid primary key default gen_random_uuid(),
  author_id     uuid not null references public.profiles (id) on delete cascade,
  gym_id        uuid references public.gyms (id) on delete set null,
  body          text,
  image_url     text,
  like_count    int not null default 0,
  comment_count int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint posts_body_or_image check (coalesce(body, '') <> '' or image_url is not null)
);

create index posts_gym_id_created_at_idx on public.posts (gym_id, created_at desc);
create index posts_author_id_created_at_idx on public.posts (author_id, created_at desc);
```

- `gym_id` is snapshotted from `profiles.gym_id` at post time (so a later gym switch doesn't rewrite history).
- `image_url` stores the final public R2 URL directly (same convention as `profiles.avatar_url`) — no separate object-key column, no server-side resolution step.
- `updated_at` trigger reuses the existing `set_updated_at()` function.
- RLS: `select` open to `authenticated` (posts are visible on profiles regardless of follow status, same as check-ins); `insert`/`update`/`delete` restricted to `auth.uid() = author_id`.

### `post_likes`

```sql
create table public.post_likes (
  post_id    uuid not null references public.posts (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
```

- RLS: `select` open; `insert`/`delete` restricted to `auth.uid() = user_id`.
- Trigger `post_likes_maintain_count` keeps `posts.like_count` live.

### `post_comments`

```sql
create table public.post_comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts (id) on delete cascade,
  author_id  uuid not null references public.profiles (id) on delete cascade,
  body       text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now()
);

create index post_comments_post_id_created_at_idx on public.post_comments (post_id, created_at);
```

- RLS: `select` open; `insert`/`delete` restricted to `auth.uid() = author_id`.
- Trigger `post_comments_maintain_count` keeps `posts.comment_count` live.

### `get_feed` (read RPC)

The only genuinely non-trivial read here — "gym posts ∪ followed posts ∪ my own, paginated by cursor" isn't a plain `.from().select()`. A `security definer` SQL function, called directly by the mobile client via `supabase.rpc('get_feed', ...)` (same "reads bypass Fastify" pattern as every other hook — `useActiveMembers`, `useGymDetail`, etc. all read Supabase directly):

```sql
create or replace function public.get_feed(p_before timestamptz default now(), p_limit int default 20)
returns table (...)  -- post columns + author username/full_name/avatar_url + liked_by_me boolean
language sql security definer set search_path = ''
as $$
  select p.*, pr.username, pr.full_name, pr.avatar_url,
         exists(select 1 from public.post_likes l where l.post_id = p.id and l.user_id = auth.uid()) as liked_by_me
  from public.posts p
  join public.profiles pr on pr.id = p.author_id
  where p.created_at < p_before
    and (
      p.author_id = auth.uid()
      or p.gym_id = (select gym_id from public.profiles where id = auth.uid())
      or p.author_id in (select following_id from public.follows where follower_id = auth.uid())
    )
  order by p.created_at desc
  limit p_limit;
$$;
```

---

## API routes (Fastify — mutations only; reads go direct-to-Supabase from the client, per existing convention)

Mutations here are single-table owned-row writes with no business-rule checks (unlike `buddy_requests`'s same-gym check), so — matching `profile.ts`'s `claim-username` pattern, not `buddy.ts`'s RPC pattern — they use the service-role client with an explicit `author_id: req.authUser!.id` filter, not a Postgres RPC.

| Method | Path                       | Purpose                                                             |
| ------ | -------------------------- | --------------------------------------------------------------------- |
| POST   | `/api/posts/upload-url`    | Presigned R2 PUT URL + deterministic `image_url` for the client's upload |
| POST   | `/api/posts`               | Create a post (`body?`, `image_url?`)                                 |
| DELETE | `/api/posts/:id`           | Delete own post                                                       |
| POST   | `/api/posts/:id/like`      | Like a post (idempotent)                                              |
| DELETE | `/api/posts/:id/like`      | Unlike a post                                                          |
| POST   | `/api/posts/:id/comments`  | Add a comment (`body`)                                                |
| DELETE | `/api/comments/:id`        | Delete own comment                                                    |
| POST   | `/api/follows/:userId`     | Follow a user                                                         |
| DELETE | `/api/follows/:userId`     | Unfollow a user                                                       |

New infra:

- `apps/api/src/lib/r2.ts` — S3-compatible client (`@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`) for the presigned-PUT route.
- `apps/api/src/env.ts` — wire the already-present `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET` / `R2_PUBLIC_URL` (currently only in `.env.example`, not in the `Env` zod schema).
- `packages/types/src/post.ts`, `packages/types/src/follow.ts` — zod schemas + shared interfaces (`Post`, `FeedItem`, `Comment`, `FollowStatus`, etc.), following `buddy.ts`'s shape.

## Mobile (Expo)

New deps: `expo-image-picker`, `expo-image-manipulator` (client-side compress/resize before upload).

**Hooks** (`apps/mobile/src/hooks/`):

- `useFeed` — `useInfiniteQuery` over `supabase.rpc('get_feed', ...)`, cursor = last item's `created_at`.
- `usePostComments(postId)`, `useIsFollowing(targetId)` — direct reads.
- `useCreatePost`, `useLikePost` / `useUnlikePost`, `useAddComment`, `useFollowUser` / `useUnfollowUser` — mutations via `apiFetch`.

**Screens:**

- `app/(tabs)/feed.tsx` — new tab (current tabs are Explore/Training/Profile, not the Map/Feed/Profile in `docs/phase-2-flow.md`; adding Feed as a 4th tab rather than replacing either existing one, since both still serve distinct purposes). `FlashList` of post cards — author row, image, body, like button + count, comment count → tap opens detail.
- `app/post/[id].tsx` — full post + comment thread + add-comment input.
- `app/post/create.tsx` — compose: text input + optional single image (picker → manipulator → presigned upload → `POST /api/posts`).
- `app/user/[username].tsx` (existing) — add Follow/Unfollow button, followers/following counts, that user's posts.
- `app/(tabs)/profile.tsx` (existing) — add followers/following counts + own posts list.

---

## Migration files (proposed)

- `supabase/migrations/20260723090000_follows.sql`
- `supabase/migrations/20260723100000_posts_likes_comments.sql`
