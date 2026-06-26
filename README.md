# Gymily

Social network for gym-goers — gym identity, real-time "training now" presence,
local discovery, and a social feed. Mobile-first (iOS + Android).

## Stack

| Layer     | Tech                                                              |
| --------- | ----------------------------------------------------------------- |
| Mobile    | React Native + Expo + EAS (TypeScript)                            |
| Backend   | Fastify (Node.js) + Supabase (Postgres + PostGIS, Auth, Realtime) |
| Maps      | Mapbox (render) + Google Places (gym search)                      |
| Storage   | Cloudflare R2 (images)                                            |
| Analytics | Google Analytics                                                  |

Full design: [`docs/phase-1-architecture.md`](docs/phase-1-architecture.md).

## Monorepo layout

```
apps/
  mobile/    Expo React Native app
  api/       Fastify backend
packages/
  types/     shared TS types + zod schemas
  config/    shared tsconfig base
supabase/
  migrations/  SQL migrations
  seed.sql     dev seed data
docs/        architecture + per-phase planning
```

## Getting started

```bash
pnpm install          # install workspace deps
cp .env.example .env  # fill in secrets (see docs)
pnpm format           # prettier
pnpm lint             # eslint
pnpm typecheck        # types across workspace
```

## Status

Planning complete (see `docs/`). Repo + tooling scaffolded.
Next: initialize the Expo app and Fastify server, then the `profiles` migration.
