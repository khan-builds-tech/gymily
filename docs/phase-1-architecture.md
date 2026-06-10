# Gymily — Phase 1: Product & Architecture Planning

> Status: **Planning only. No application code in this phase.**
> Approval gate: Phase 2 (Authentication) does not start until this document is approved.

---

## 1. Goals

Define the technical foundation for Gymily V1 — a **social network for gym-goers** built on three pillars:

1. **Gym identity** — you belong to a gym; your gym is part of who you are.
2. **Real-time gym presence** — "23 people currently training" at this gym, right now.
3. **Local discovery + social** — find gyms and people near you on a map; follow, post, like, comment.

Phase 1 delivers: the recommended tech stack (with justification), the system architecture, the **complete V1 database schema** (designed once, migrated incrementally), the API surface, the repo/folder structure, and the build roadmap with scalability notes.

Explicit non-goals for V1: workout tracking, calorie counting, coaching/supplement marketplaces, stories.

---

## 2. Tech Stack — Recommendation & Justification

Your stated preferences: React Native + Expo + TS / Next.js + TS / PostgreSQL / Google or Mapbox / cloud storage / "suggest realtime."

### CTO recommendation: **Supabase-centered backend + Fastify (Node.js) API layer**

The single highest-leverage decision for a venture-pace V1 is to **not hand-build auth, file storage, realtime, and a Postgres host from scratch.** Supabase gives us managed Postgres (with PostGIS), Auth (Google OAuth + email/password + email verification + password reset out of the box), S3-compatible Storage, and a Realtime engine — all behind one SDK, all replaceable later because it's *just Postgres + open standards*.

> **Backend framework note:** Gymily has no web frontend in V1, so Next.js (SSR/RSC/page routing) would be dead weight — we'd use only its API routes. A purpose-built Node.js API server is the cleaner fit. We use **Fastify + TypeScript**: fast, lightweight, first-class TS, built-in schema validation (pairs with Zod), and plugins for JWT/rate-limit/CORS. Because most CRUD goes client → Supabase directly (RLS-guarded), this Node service stays small — it only owns the hard logic.

| Layer | Choice | Why this, and what we considered |
|---|---|---|
| **Mobile** | React Native + **Expo (managed) + EAS** + TypeScript | One codebase for iOS/Android. Chosen over Flutter for Gymily because: (1) **one language end-to-end** — share TS types/Zod schemas between app and Fastify API; (2) Supabase Auth/Realtime ride the **reference JS SDK** (Flutter uses the community Dart port); (3) **EAS OTA updates** push JS fixes without store review. Flutter's rendering edge doesn't outweigh these for a maps+feed+realtime app. |
| **Navigation** | Expo Router (file-based) | Typed routes, deep links (needed for share/notifications later), familiar file-based routing. |
| **Server state** | TanStack Query | Caching, pagination, infinite scroll, optimistic updates (likes/follows) — built in. |
| **DB** | **PostgreSQL 15 (Supabase) + PostGIS** | Relational data (users, gyms, follows, posts) is the right fit. PostGIS powers "nearby gyms" with proper geo indexing. Postgres scales to 1M users with read replicas + partitioning. |
| **Auth** | **Supabase Auth (GoTrue)** | Ships Google OAuth, email/password, email verification, password reset, JWT sessions, account deletion. Building this securely by hand is weeks of work and a liability. JWTs are standard — portable later. |
| **Custom backend** | **Fastify + TypeScript (Node.js)** | A lightweight, TS-native JSON API server. Hosts logic that doesn't belong in the client or in raw SQL: feed ranking, presence aggregation, geo search orchestration, webhooks, rate limiting. Deployed on Fly.io / Railway / Render (containerized Node). |
| **Realtime** | **Supabase Realtime** (Phase 4: + Redis) | V1 presence/counts via Realtime Presence + Postgres CDC. Documented migration to **Redis (TTL keys + pub/sub)** when concurrent connections get expensive. |
| **Maps (render)** | **Mapbox** (`@rnmapbox/maps`) | Cheaper at scale than Google, excellent RN SDK with **built-in marker clustering** and vector tiles. Renders the map, markers, and clusters. |
| **Gym search (data)** | **Google Places API** | Best-in-class POI/place data for finding/seeding gyms (name, address, lat/lng, place_id). Used for gym search + autocomplete and to seed the curated (initially metro-focused, nationally open) gym DB. Hybrid: Google supplies gym *data*, Mapbox *renders* it. |
| **Storage** | **Supabase Storage** (S3-compatible) → CDN | Images (avatars, posts) with signed uploads + image transforms. Migration path to **Cloudflare R2** (zero egress) at scale. |
| **Image pipeline** | Client resize (expo-image-manipulator) + server-side transform | Never upload 12MP originals. Cap dimensions/quality before upload. |
| **Push** | Expo Notifications (Phase 8) | Unified APNs/FCM via Expo. |
| **Observability** | Sentry (crash/errors) + host/Supabase logs + PostHog (product analytics) | Phase 8. |

### Why not "self-hosted Node backend with its own Postgres"?
We'd reimplement GoTrue (auth), Storage signing, and a realtime layer ourselves — the three most error-prone pieces. Supabase collapses ~6–8 weeks of undifferentiated work. Because it's plain Postgres + JWT + S3 semantics, there's **no lock-in we can't escape**: at extreme scale we lift the DB out, keep our schema, and run our own GoTrue/Storage if needed.

### Why Fastify, not Next.js?
Next.js earns its keep when you have a **web frontend** (SSR, React Server Components, page routing, image optimization). Gymily V1 is mobile-only, so we'd use just its API routes — a thin Node HTTP wrapper — and carry the rest as dead weight. Fastify is purpose-built for a JSON API: faster, smaller, schema-validated, and trivially containerized. (If we add a web app or admin dashboard later, revisit Next.js then — not now.)

### Where we accept technical debt for V1 (deliberately)
- **Feed ranking is a simple SQL query**, not a precomputed fan-out timeline. Fine to ~100k users. (Migration plan in §8.)
- **Presence counts computed on read + cached**, not a per-user websocket fanout. (Phase 4.)
- **No CDN image variants matrix** — one resized upload + on-the-fly transform. Revisit at scale.
- **Monolothic Fastify API**, not microservices. Split only when a domain needs independent scaling.

---

## 3. System Architecture

```
                         ┌─────────────────────────────┐
                         │      Mobile App (Expo RN)    │
                         │  Expo Router · TanStack Query │
                         │  Mapbox SDK · Supabase Client │
                         └──────────────┬───────────────┘
                                        │ HTTPS / WSS
                ┌───────────────────────┼────────────────────────┐
                │                       │                         │
                ▼                       ▼                         ▼
   ┌─────────────────────┐  ┌────────────────────────┐  ┌──────────────────┐
   │   Supabase Auth     │  │   Fastify API (Node/TS) │  │ Supabase Realtime│
   │   (GoTrue / JWT)    │  │   containerized         │  │  presence/counts │
   │  Google · Email/Pwd │  │  • feed ranking         │  └────────┬─────────┘
   └──────────┬──────────┘  │  • geo gym search       │           │
              │             │  • presence aggregation │           │
              │             │  • rate limiting        │           │
              │             └───────────┬─────────────┘           │
              │                         │                         │
              │  validates JWT          │ SQL (pooled)            │ CDC / Presence
              └─────────────┬───────────┴─────────────┬───────────┘
                            ▼                          ▼
                 ┌────────────────────────────────────────────┐
                 │     PostgreSQL 15 + PostGIS (Supabase)       │
                 │  users · gyms · check_ins · posts · follows  │
                 │  RLS policies · GiST geo index · partitions  │
                 └──────────────────────┬───────────────────────┘
                                        │
                            ┌───────────┴───────────┐
                            ▼                       ▼
                  ┌──────────────────┐   ┌────────────────────────┐
                  │ Supabase Storage │   │  Redis (Phase 4+)      │
                  │  avatars/posts   │   │ presence TTL · caches  │
                  └──────────────────┘   └────────────────────────┘
```

**Request patterns:**
- **Auth, simple reads/writes** → client → Supabase directly, guarded by **Row Level Security**.
- **Complex/aggregate logic** (ranked feed, geo search, presence counts) → client → **Fastify API** → Postgres.
- **Realtime** (live counts, presence) → client subscribes to Supabase Realtime channels.

This "thick DB (RLS) + thin API for the hard parts" split keeps V1 fast to build without a backend bottleneck for every CRUD call.

---

## 4. Database Design (complete V1 schema)

Designed in full now; **migrated incrementally** per phase. PostGIS enabled. All tables have `created_at timestamptz default now()`. UUID PKs (`gen_random_uuid()`).

### `profiles` (Phase 2/3) — extends `auth.users`
| column | type | notes |
|---|---|---|
| id | uuid PK | FK → `auth.users.id` (1:1) |
| username | citext UNIQUE NOT NULL | case-insensitive, immutable-ish |
| full_name | text NOT NULL | |
| bio | text | nullable |
| avatar_url | text | Supabase Storage path |
| city | text | |
| gym_id | uuid | FK → `gyms.id`, nullable |
| created_at | timestamptz | join date |

> Email, password hash, email-verified, OAuth identities all live in Supabase-managed `auth.users` — we never store passwords ourselves.

Indexes: `unique(username)`, `index(gym_id)`.

### `gyms` (Phase 3)
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| name | text NOT NULL | |
| location | geography(Point,4326) NOT NULL | PostGIS lat/lng |
| address | text | |
| city / state / country | text | |
| google_place_id | text UNIQUE | nullable; dedupes gyms promoted from Google Places |
| member_count | int default 0 | denormalized "Members" (total), incl. seeded artificial density |
| created_by | uuid | FK → profiles.id (user-created gyms) |
| verified | boolean default false | moderation flag |

Indexes: **GiST** on `location` (geo radius search), `index(city)`, trigram index on `name` (search), `unique(google_place_id)`.
> "Active Now / Training Now" is computed live from `check_ins` (§ check_ins), never stored here.

### `gym_members` (Phase 3) — membership history / current
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK → profiles | |
| gym_id | uuid FK → gyms | |
| is_current | boolean default true | only one current per user |
| joined_at | timestamptz | |

Unique partial index: `unique(user_id) where is_current`. (Profiles also caches `gym_id` for fast joins.)

### `check_ins` (Phase 4) — presence source of truth
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK → profiles | |
| gym_id | uuid FK → gyms | |
| checked_in_at | timestamptz default now() | |
| last_active_at | timestamptz default now() | heartbeat |
| expires_at | timestamptz NOT NULL | = last_active_at + timeout |
| checked_out_at | timestamptz | null = active |

"Active members" = `count(*) where gym_id=? and checked_out_at is null and expires_at > now()`.
Indexes: `index(gym_id, expires_at) where checked_out_at is null`. **Partition by month** at scale.

### `posts` (Phase 6)
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| author_id | uuid FK → profiles | |
| gym_id | uuid FK → gyms | nullable (context) |
| type | enum('text','image','gym_update','progress') | |
| body | text | |
| image_url | text | nullable |
| like_count / comment_count | int default 0 | denormalized counters |
| created_at | timestamptz | feed ordering |

Indexes: `index(author_id, created_at desc)`, `index(gym_id, created_at desc)`.

### `post_likes` (Phase 6)
`(post_id, user_id)` composite PK → guarantees one like per user; trigger maintains `posts.like_count`.

### `post_comments` (Phase 6)
| id | post_id FK | author_id FK | body | created_at |
Index: `index(post_id, created_at)`. Trigger maintains `comment_count`.

### `follows` (Phase 7)
| follower_id | uuid FK → profiles | following_id | uuid FK → profiles | created_at |
Composite PK `(follower_id, following_id)`, CHECK `follower_id <> following_id`.
Indexes: `index(following_id)` (who follows me), `index(follower_id)` (who I follow). Counts denormalized onto `profiles` (followers/following) via triggers or periodic recompute.

### Row Level Security (cross-cutting)
- `profiles`: readable by all authenticated; writable only by owner (`auth.uid() = id`).
- `posts`/`comments`/`likes`: insert only as self; delete only own rows.
- `follows`: insert/delete only where `follower_id = auth.uid()`.
- `check_ins`: mutate only own rows.
RLS is the V1 authorization backbone — security lives next to the data.

---

## 5. API Design (surface for all V1 phases)

Two surfaces: **(A)** direct Supabase (RLS-guarded CRUD + Realtime), **(B)** Fastify routes for logic. All Fastify endpoints validate the Supabase JWT and enforce rate limits.

### Auth (Phase 2) — mostly Supabase SDK; thin server helpers
- `POST /api/auth/register` — email/pwd signup (full_name, username, email, password) → triggers verification email; creates `profiles` row.
- `POST /api/auth/check-username` — availability.
- Google OAuth, login, refresh, forgot-password, email-verify → **Supabase SDK directly** (no custom endpoints).
- `DELETE /api/account` — account deletion (auth user + cascade).

### Profiles & Gyms (Phase 3)
- `GET /api/profiles/:username` — profile + follower/following/post counts.
- `PATCH /api/profiles/me` — update bio/avatar/city.
- `GET /api/gyms/search?q=&near=lat,lng&radius=` — searches **our** seeded gyms first (PostGIS `ST_DWithin` + name trigram). If sparse, falls through to **Google Places API** (server-side, key never on device) and returns places we can promote into `gyms` on join.
- `GET /api/gyms/:id` — gym detail returning **both** `member_count` (total, from `gym_members`) and `active_count` ("Training Now", from `check_ins`) + recent posts.
- `POST /api/gyms` — create/promote gym (from a Google `place_id` or manual). `POST /api/gyms/:id/join` — join/switch (sets `is_current`).

### Presence (Phase 4)
- `POST /api/gyms/:id/checkin` — check in.
- `POST /api/checkin/heartbeat` — bump `last_active_at`/`expires_at`.
- `POST /api/checkout` — manual checkout.
- `GET /api/gyms/:id/active-count` — cached active count.
- Realtime channel `gym:{id}:presence` — live count pushes.

### Map (Phase 5)
- `GET /api/gyms/nearby?lat=&lng=&radius=&zoom=` — gyms in viewport + active counts (server clusters at low zoom).

### Feed / Social (Phase 6–7)
- `GET /api/feed?cursor=` — personalized, cursor-paginated infinite scroll.
- `POST /api/posts`, `DELETE /api/posts/:id`.
- `POST /api/posts/:id/like`, `DELETE …/like`.
- `GET /api/posts/:id/comments?cursor=`, `POST …/comments`.
- `POST /api/users/:id/follow`, `DELETE …/follow`.
- `GET /api/users/:id/followers|following?cursor=`.

**Conventions:** cursor (keyset) pagination everywhere — never OFFSET. JSON. Standard error envelope `{ error: { code, message } }`. JWT in `Authorization: Bearer`.

---

## 6. Folder Structure (pnpm monorepo)

A monorepo keeps shared TS types between app and API in lockstep — the biggest DX win.

```
gymily/
├── apps/
│   ├── mobile/                 # Expo React Native app
│   │   ├── app/                # Expo Router routes
│   │   │   ├── (auth)/         # login, register, forgot-password
│   │   │   ├── (tabs)/         # map, feed, profile
│   │   │   ├── gym/[id].tsx
│   │   │   └── _layout.tsx
│   │   ├── src/
│   │   │   ├── components/     # UI primitives + feature components
│   │   │   ├── features/       # auth, profile, gym, presence, feed, follow
│   │   │   ├── lib/            # supabase client, query client, mapbox
│   │   │   ├── hooks/
│   │   │   └── theme/
│   │   ├── app.config.ts       # EAS / env
│   │   └── package.json
│   └── api/                    # Fastify (Node/TS) backend
│       ├── src/
│       │   ├── server.ts       # Fastify bootstrap + plugins (jwt, cors, rate-limit)
│       │   ├── routes/         # route plugins (mirrors §5)
│       │   ├── lib/            # supabase admin client, auth guard
│       │   ├── services/       # feed, geo, presence, gym domain logic
│       │   └── validators/     # zod schemas
│       ├── Dockerfile          # containerized deploy (Fly/Railway/Render)
│       └── package.json
├── packages/
│   ├── types/                  # shared TS types + zod schemas (DB row types)
│   ├── config/                 # eslint, tsconfig, prettier presets
│   └── ui/                     # (optional) shared design tokens
├── supabase/
│   ├── migrations/             # SQL migrations, one folder per phase
│   ├── seed.sql                # dev seed (sample gyms w/ real coords)
│   └── config.toml
├── docs/                       # this file + per-phase planning
├── .github/workflows/          # CI (Phase 8)
├── pnpm-workspace.yaml
└── package.json
```

---

## 7. Development Roadmap

Sequenced to the 8 phases in the spec; each phase is independently shippable & testable.

| Phase | Scope | Key deliverables | Rough effort |
|---|---|---|---|
| **1** | Planning (this doc) | Architecture, schema, API, roadmap | ✅ now |
| **2** | Auth | Supabase Auth wired, register/login/Google/forgot/verify screens, `profiles` migration, account deletion | ~1 wk |
| **3** | Profiles & Gyms | gyms+members schema + PostGIS, gym search/create/join, profile + gym screens | ~1.5 wk |
| **4** | Realtime Presence | check_ins schema, check-in/heartbeat/timeout, cached active counts, Realtime channel | ~1.5 wk |
| **5** | Map | Mapbox integration, markers + clustering, current location, nearby query, gym detail | ~1.5 wk |
| **6** | Social Feed | posts/likes/comments schema, image upload pipeline, feed query, infinite scroll | ~2 wk |
| **7** | Follow System | follows schema, follow/unfollow, followers/following lists, personalized feed ranking | ~1 wk |
| **8** | Production Readiness | Sentry, PostHog, rate limiting, CI/CD, EAS submit, backups, monitoring | ~1.5 wk |

**Critical path / dependencies:** 2 → 3 (gym needed for presence & feed context) → 4 & 5 can parallelize → 6 → 7 → 8.

**Phase 2 "definition of done" preview** (so approval is concrete): a user can sign up with email+password *or* Google on both iOS and Android, verify email, reset a forgotten password, stay logged in across restarts (session persistence), see a `profiles` row auto-created, and delete their account — with tests covering the auth flows.

---

## 7b. Launch & Cold-Start Strategy (nationally available)

Gymily is **nationally available** — anyone in India can sign up, and gyms can be created/joined anywhere. There is **no geo-gate in code**. What `location.md` still teaches us is that presence/feed features depend on **density, not coverage**, so while availability is national, our *seeding and marketing* should concentrate to avoid the "2 users per city, feels empty everywhere" failure mode.

- **Availability:** national — no city restriction in signup, gym search, or the map.
- **Density tactic (recommended, not enforced):** focus initial seeding + marketing on a few high-density pockets (e.g. metros like Delhi, Gurgaon, Bangalore, Mumbai) so early users find a live network, even though the app is open everywhere.
- **Seed data:** curate **real gyms nationally** (Cult.fit, Anytime Fitness, serious independent/powerlifting gyms, neighborhood gyms), prioritizing dense metros first. Sourced via **Google Places API** → promoted into `gyms` with `google_place_id`. New gyms anywhere are created on-demand when a user joins a place not yet in our DB.
- **Artificial density (key UX rule):** never show a gym as "0 members." Seed `member_count` from historical/associated joins so a gym reads e.g. **Members: 42 · Training Now: 3**. This is exactly why the schema splits `gym_members.member_count` (total) from live `check_ins` (active) — the network feels alive before real-time traffic exists.

**Engineering implications for V1:** `member_count` must be seedable/denormalized (done in schema); gym detail returns both counts (done in API §5); seed script lives in `supabase/seed.sql` and can hold gyms from any city. Staying geo-agnostic is the cheap, correct default — density is achieved through where we *market and seed*, not through code restrictions.

---

## 8. Scalability Plan (10k → 100k → 1M)

| Concern | 10k users | 100k users | 1M users |
|---|---|---|---|
| **DB** | Single Supabase Postgres | Add **read replicas**; route reads (feed, search) to replicas | Partition `check_ins`/`posts` by time; consider Citus/sharding; PgBouncer pooling |
| **Feed** | On-read SQL join (follows + same-gym, keyset paginated) | Add Redis cache for hot feeds; precompute counts | **Fan-out-on-write** timelines (materialized per-user feed) for heavy accounts |
| **Presence** | Supabase Realtime + on-read count | **Redis TTL keys** per check-in; pub/sub fanout; count cached 5–10s | Dedicated WS/presence service, sharded by gym; edge fanout |
| **Geo search** | PostGIS `ST_DWithin` + GiST | Cache popular viewports; precompute gym cluster tiles | Tile server / H3 geo-indexing; CDN-cached cluster tiles |
| **Images** | Supabase Storage + transforms | CDN in front; generate size variants | Migrate to **Cloudflare R2** (no egress fees); aggressive CDN |
| **API** | Single Fastify container | Horizontal autoscale (stateless); move rate-limit to edge/Redis | Split hot domains (feed, presence) into dedicated services |
| **Cost driver** | Negligible | Storage egress + Realtime connections | Realtime connections + DB compute → the two to watch |

**Bottleneck order we'll actually hit:** (1) Realtime connection cost, (2) feed query under fan-out, (3) image egress. Each has a pre-planned migration above — we build the simple version now and migrate on metrics, not speculation.

---

## 9. Risks & Mitigation

| Risk | Impact | Mitigation |
|---|---|---|
| **Presence accuracy** (ghost check-ins, GPS spoofing) | Core feature credibility | Server-side `expires_at` + heartbeat; optional geofence verify (within gym radius) in Phase 4; rate-limit check-ins |
| **Realtime cost blowup** | $$ at scale | Counts on-read + short cache, not per-user sockets; Redis migration path documented |
| **Empty-network cold start** | No gyms/people nearby = dead app | National availability but **density-focused seeding/marketing** in metros first (§7b); seed real gyms via Google Places; artificial `member_count` so gyms never read "0"; gym-by-gym acquisition |
| **Supabase lock-in fear** | Strategic | It's plain Postgres + JWT + S3 — exit path documented; keep custom logic in our Next.js layer |
| **RLS misconfiguration** | Security/data leak | RLS policies reviewed + tested per table; Phase 8 security review; least-privilege service keys |
| **Image moderation / abuse** | Trust & safety, store policy | Report flow + soft-delete in V1; automated moderation deferred but flagged |
| **App store rejection** | Launch delay | Account deletion (Apple requirement) built in Phase 2; privacy manifest in Phase 8 |
| **Geo query performance** | Slow map | GiST index from day one; viewport-bounded queries; clustering server-side |

---

## 10. Implementation

**None in Phase 1** — per the spec, no application code until planning is approved.

What Phase 2 will produce on approval: the monorepo scaffold (§6), Supabase project + first migration (`profiles`), the auth screens, session persistence, and the auth test suite.

---

## Decisions — RESOLVED
1. ✅ **Mobile:** React Native + Expo + EAS (over Flutter — one TS language end-to-end, reference Supabase JS SDK, OTA updates).
2. ✅ **Backend:** Supabase (Postgres/PostGIS, Auth, Storage, Realtime) + thin **Fastify** API (over Next.js — mobile-only app, no need for SSR).
3. ✅ **Maps:** **Mapbox** renders the map/markers/clusters; **Google Places API** supplies gym search + seed data (hybrid).
4. ✅ **Launch:** **nationally available** (no geo-gate); density achieved via metro-focused seeding/marketing, not code; split Members (total) vs Training Now (active). See §7b.

**Phase 1 planning is complete.** Approve and I'll begin **Phase 2 — Authentication** (monorepo scaffold, Supabase project + `profiles` migration, auth screens, session persistence, tests).
```
