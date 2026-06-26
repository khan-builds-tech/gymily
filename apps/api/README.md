# apps/api

Gymily backend — **Fastify (Node.js) + TypeScript**. Thin API for custom logic
(feed ranking, geo gym search, presence aggregation), in front of Supabase.

## Stack

- Fastify 5 + `@fastify/helmet`, `@fastify/cors`, `@fastify/rate-limit`, `@fastify/sensible`
- `@supabase/supabase-js` (service-role + anon clients)
- Zod validation via shared `@gymily/types`
- Vitest for tests, tsup for the production bundle

## Layout

```
src/
  server.ts          # entrypoint (loads .env, listens)
  app.ts             # buildApp() — plugins + routes (used by tests too)
  env.ts             # zod-validated environment
  lib/               # supabase clients, error helpers
  plugins/           # supabase clients + auth (JWT) decorators
  routes/            # health, auth (register/check-username), account (delete)
test/                # vitest
```

## Local development

Requires the local Supabase stack (`pnpm exec supabase start` from the repo root)
and `apps/api/.env` (already populated with the Supabase CLI's local default keys).

```bash
pnpm --filter @gymily/api dev          # tsx watch on http://localhost:8787
pnpm --filter @gymily/api typecheck
pnpm --filter @gymily/api test
pnpm --filter @gymily/api build        # -> dist/ (tsup)
```

> Port is **8787** (8080 is commonly taken by Apache on macOS).

## Endpoints (Phase 2 — Auth)

| Method | Path                       | Auth | Notes                                            |
| ------ | -------------------------- | ---- | ------------------------------------------------ |
| GET    | `/health`                  | —    | Liveness probe                                   |
| POST   | `/api/auth/register`       | —    | Email/password signup; DB trigger makes profile  |
| POST   | `/api/auth/check-username` | —    | Username availability                            |
| DELETE | `/api/account`             | JWT  | Delete user (cascades to profile)                |

Login, Google OAuth, password reset and email verification are handled by the
**Supabase SDK directly** from the mobile app — no custom endpoints.
