# Gymily — Phase 2: Authentication System

> Status: **Planning. No application code until this is approved.**
> Builds on the locked stack in `docs/phase-1-architecture.md` (RN+Expo, Supabase, Fastify, Delhi launch).

---

## 1. Goals

A user can fully manage their identity:

- **Sign up** with email + password (full name, username, email, password).
- **Sign in** with email + password.
- **Google Sign In** on both Android and iOS (native).
- **Verify email** (required before the account is usable).
- **Reset a forgotten password.**
- **Stay logged in** across app restarts (secure, auto-refreshing session).
- **Delete account** (Apple/Play requirement) with full data cascade.

Hard requirements from the spec: JWT/session auth, secure password hashing, forgot password, email verification, account deletion — **all provided by Supabase Auth (GoTrue); we never store or hash passwords ourselves.**

**Definition of done:** a real user can sign up (email or Google) on a physical iOS *and* Android device, verify their email, log out, log back in, reset a forgotten password, and delete their account — covered by automated tests.

---

## 2. Architecture

### 2.1 Who owns what

| Concern | Owner | Notes |
|---|---|---|
| Password hashing, JWT issuance, session refresh | **Supabase Auth (GoTrue)** | bcrypt hashing, rotating refresh tokens — battle-tested, never reimplemented |
| Email/password signup + login | **Supabase JS SDK (client-direct)** | `signUp` / `signInWithPassword` |
| Google OAuth | **Native Google Sign-In → Supabase `signInWithIdToken`** | see §2.3 |
| Email verification + password reset | **Supabase email OTP** | see §2.4 |
| `profiles` row creation | **Postgres trigger** on `auth.users` insert | see §3.2 |
| Username uniqueness | **`citext UNIQUE` + server pre-check** | see §2.5 |
| Account deletion | **Fastify endpoint** (service-role key) | client can't self-delete an auth user; §2.6 |
| Session persistence | **expo-secure-store** adapter for Supabase client | encrypted at rest on device |

**Principle:** the client talks to Supabase directly for everything that's a standard auth primitive (RLS + GoTrue make this safe). Fastify only owns the two things the client *can't* safely do — pre-checking a username and deleting an auth user (both need privileged context).

### 2.2 Session management

- The Supabase client is configured with an **expo-secure-store** storage adapter (`autoRefreshToken: true`, `persistSession: true`, `detectSessionInUrl: false` for native).
- Access token (short-lived JWT) + refresh token stored encrypted in the device keychain/keystore.
- An **auth gate** at the navigation root reads session state from `onAuthStateChange` and routes: no session → `(auth)` stack; session but email unverified → verification screen; session + verified → `(tabs)` app.
- Fastify validates the JWT on protected endpoints via the Supabase JWKS / `auth.getUser(token)`.

### 2.3 Google Sign-In (native, both platforms)

Use **`@react-native-google-signin/google-signin`** to get a Google **ID token** natively, then hand it to Supabase:

```
Google native sheet → idToken → supabase.auth.signInWithIdToken({ provider:'google', token })
→ Supabase creates/links auth.users → trigger creates profile (username auto-derived, see below)
```

- Requires an **Expo Dev Build** (not Expo Go) — already our plan via EAS.
- Config needed: Google Cloud OAuth client IDs (iOS, Android, Web), Android **SHA-1/SHA-256** fingerprints, iOS bundle id / URL scheme. Tracked as a setup task.
- **Username for OAuth users:** Google gives name + email but no username. On first Google sign-in the trigger creates a profile with a generated placeholder username (e.g. `user_<short-id>`) and `username_pending = true`; the app routes them through a one-time **"choose your username"** screen before entering the app.

### 2.4 Email verification & password reset — OTP, not deep links

For a mobile app we use **6-digit email OTP** rather than magic links, because deep-link round-trips are fragile on mobile (especially during install/first-run) and OTP keeps the user in the app.

- **Verify email:** after `signUp`, Supabase emails a code → user enters it on the verification screen → `supabase.auth.verifyOtp({ type:'signup', email, token })`.
- **Reset password:** `resetPasswordForEmail` (configured for OTP) → user enters code → `verifyOtp({ type:'recovery' })` → then `updateUser({ password })`.
- Email templates customized in Supabase dashboard (Gymily branding) — a config task, not code.

### 2.5 Username handling

1. As the user types, the app calls `POST /api/auth/check-username` (debounced) → Fastify checks `profiles` for a case-insensitive match → returns `{ available: bool }`.
2. On submit, `supabase.auth.signUp({ email, password, options:{ data:{ full_name, username } }})`.
3. The DB trigger inserts the `profiles` row from `raw_user_meta_data`. The `citext UNIQUE` constraint is the **real** guarantee — if two users race the same username, the second trigger fails; the app surfaces "username just got taken, pick another." (Pre-check is UX; the constraint is correctness.)

### 2.6 Account deletion

- `DELETE /api/account` (authenticated). Fastify validates the caller's JWT, then uses the **service-role key** to call `supabase.auth.admin.deleteUser(userId)`.
- `profiles` and all child rows are removed via `ON DELETE CASCADE` FKs (defined as the schema grows). For V1 (only `profiles` exists yet), cascade is trivial; later phases add their tables with cascading FKs to `profiles`.
- Confirmation UX (type username / "DELETE") before the call. Irreversible — clearly messaged.

---

## 3. Database Changes (migration `0002_auth_profiles`)

> Phase 1 designed `profiles` in full; Phase 2 actually migrates it + the trigger + RLS.

### 3.1 Extensions & table

```sql
create extension if not exists citext;

create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  username      citext not null unique,
  full_name     text   not null,
  bio           text,
  avatar_url    text,
  city          text,
  gym_id        uuid,              -- FK added in Phase 3
  username_pending boolean not null default false,  -- true for OAuth users until they pick one
  created_at    timestamptz not null default now()
);

create index profiles_gym_id_idx on public.profiles (gym_id);
```

### 3.2 Auto-create profile trigger

```sql
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, username, username_pending)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)),
    (new.raw_user_meta_data->>'username') is null   -- pending if no username (OAuth)
  );
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

### 3.3 Row Level Security

```sql
alter table public.profiles enable row level security;

create policy "profiles readable by authenticated"
  on public.profiles for select to authenticated using (true);

create policy "users update own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);
-- INSERT handled by SECURITY DEFINER trigger; no client insert policy.
-- DELETE handled by cascade from auth.users; no client delete policy.
```

### 3.4 Supabase Auth config (dashboard / config.toml — not app code)
- Enable **email confirmation required**.
- Enable **Google** provider (client IDs/secret).
- Configure email OTP for signup + recovery; custom branded templates.
- Password policy (min length, etc.).

---

## 4. API Endpoints (Fastify — only the two privileged ones)

Everything else is Supabase SDK client-direct.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/auth/check-username` | public | `{ username }` → `{ available: boolean }`. Validates format (3–20 chars, `[a-z0-9_]`) + case-insensitive uniqueness. Rate-limited. |
| `DELETE` | `/api/account` | JWT required | Deletes the authenticated user via service-role admin API; cascades `profiles`. |

**Client-direct (Supabase SDK), no custom endpoint:**
`signUp`, `signInWithPassword`, `signInWithIdToken` (Google), `verifyOtp` (signup + recovery), `resetPasswordForEmail`, `updateUser` (password / username), `signOut`, `getSession`, `onAuthStateChange`.

Error envelope (Fastify): `{ error: { code, message } }`. All endpoints behind `@fastify/rate-limit` + `@fastify/helmet` + CORS.

---

## 5. Mobile Screens

Route group `app/(auth)/` + an auth gate in `app/_layout.tsx`.

| Screen | Route | Purpose |
|---|---|---|
| **Splash / Auth gate** | `_layout` | Reads session; routes to auth / verify / choose-username / app |
| **Welcome** | `(auth)/index` | Logo, "Continue with Google", "Sign up with email", "Log in" |
| **Sign Up** | `(auth)/sign-up` | full_name, username (live availability ✓/✗), email, password (strength meter) |
| **Verify Email** | `(auth)/verify` | 6-digit OTP input, resend (with cooldown) |
| **Choose Username** | `(auth)/choose-username` | OAuth users only, one-time, before entering app |
| **Log In** | `(auth)/sign-in` | email, password, "Forgot password?", Google button |
| **Forgot Password** | `(auth)/forgot` | email → sends OTP |
| **Reset Password** | `(auth)/reset` | OTP + new password |
| **Settings → Delete Account** | `(tabs)/settings` | confirmation flow → `DELETE /api/account` → sign out |

UX details: inline validation, disabled submit until valid, loading states, friendly error mapping (e.g. "email already registered"), OTP resend cooldown, secure text entry with reveal toggle, keyboard-aware scrolling.

---

## 6. Folder Structure (additions)

```
apps/mobile/
├── app/
│   ├── _layout.tsx               # auth gate (session → route)
│   └── (auth)/
│       ├── index.tsx             # welcome
│       ├── sign-up.tsx
│       ├── sign-in.tsx
│       ├── verify.tsx
│       ├── choose-username.tsx
│       ├── forgot.tsx
│       └── reset.tsx
├── src/
│   ├── features/auth/
│   │   ├── hooks/                # useAuth, useSignUp, useGoogleSignIn, useOtp
│   │   ├── api/                  # supabase auth calls + check-username fetch
│   │   ├── components/           # OtpInput, PasswordField, UsernameField
│   │   └── validation/          # zod schemas (shared via packages/types)
│   └── lib/
│       ├── supabase.ts           # client + SecureStore adapter
│       └── google.ts             # GoogleSignin config

apps/api/
└── src/
    ├── routes/auth.ts            # check-username, delete account
    ├── lib/auth-guard.ts         # verify Supabase JWT
    └── validators/auth.ts        # zod (shared)

packages/types/
└── auth.ts                       # shared zod schemas + types (username rules, signup payload)

supabase/migrations/
└── 0002_auth_profiles.sql
```

---

## 7. Development Tasks (ordered)

**Setup**
1. Scaffold pnpm monorepo (`apps/mobile`, `apps/api`, `packages/types`, `packages/config`, `supabase/`).
2. Create Supabase project; enable email confirmation, Google provider, OTP templates.
3. Google Cloud: OAuth client IDs (iOS/Android/Web), SHA fingerprints, bundle ids.
4. EAS dev build profile (Google Sign-In needs a dev build, not Expo Go).

**Backend / DB**
5. Write & apply migration `0002_auth_profiles` (table, trigger, RLS).
6. Fastify bootstrap (helmet, cors, rate-limit, jwt guard, error envelope).
7. Implement `POST /api/auth/check-username` + `DELETE /api/account`.

**Shared**
8. `packages/types/auth.ts`: zod schemas (username regex, password policy, signup payload) used by both app + API.

**Mobile**
9. Supabase client with SecureStore adapter; auth gate in `_layout`.
10. Welcome, Sign Up (with live username check + password strength), Verify (OTP).
11. Sign In + Forgot/Reset (OTP) flows.
12. Google Sign-In integration + Choose-Username screen for OAuth users.
13. Settings → Delete Account confirmation flow.
14. Error/loading polish, resend cooldowns, session-restore on launch.

**Verify**
15. Test suite (§8) + manual device matrix.

---

## 8. Testing Strategy

| Layer | Tool | Coverage |
|---|---|---|
| **Unit** | Vitest | zod validators (username format, password policy), error-mapping helpers, OTP input logic |
| **Integration** | Vitest + Supabase **test project** | `check-username` (available/taken/invalid/rate-limit), `DELETE /api/account` (auth required, cascade), trigger creates profile on signup, `citext` uniqueness rejects case-variant dupes |
| **E2E** | **Maestro** (RN-friendly) | sign-up → verify → land in app; login; forgot→reset; Google sign-in (mocked where needed); delete account |
| **Manual matrix** | physical devices | Google Sign-In on real iOS + Android; email deliverability; session persists across cold start; deep-link/back-nav edge cases |

Security checks: confirm passwords never logged; service-role key only on server (never bundled in app); JWT validated on `DELETE /api/account`; RLS prevents reading/updating others' profiles (negative tests).

---

## 9. Risks & Mitigation

| Risk | Impact | Mitigation |
|---|---|---|
| **Google OAuth misconfig** (SHA-1, bundle id, client IDs) | Google login broken on one platform | Treat as explicit setup checklist task; test on both real devices early |
| **Email deliverability** (OTP in spam) | Users can't verify | Custom branded templates; use Supabase SMTP / configure custom SMTP (e.g. Resend) before launch; resend button |
| **Username race condition** | Duplicate-ish usernames | `citext UNIQUE` is source of truth; pre-check is UX only; graceful retry on constraint violation |
| **Service-role key leakage** | Full DB compromise | Key only in Fastify env, never in mobile bundle; account deletion gated behind JWT check |
| **Session token theft on device** | Account takeover | Tokens in encrypted SecureStore (keychain/keystore), short-lived access token + refresh rotation |
| **Apple rejection** (no account deletion) | Launch blocked | Account deletion shipped in this phase (requirement met) |
| **Expo Go can't do native Google Sign-In** | Dev confusion | Standardize on EAS dev build from the start; document in README |
| **OAuth users with no username** | Broken profile/feed | `username_pending` flag + forced choose-username screen before app access |

---

## 10. Implementation

**Not in this phase yet.** On approval of this plan I'll implement in the task order of §7, starting with the monorepo scaffold, the Supabase project + `0002_auth_profiles` migration, and the auth gate — then build outward through the screens and the two Fastify endpoints, finishing with the test suite.

---

## Decisions — RESOLVED
1. ✅ **Email sending:** Supabase built-in email for dev; switch to **custom SMTP (Resend)** before public launch.
2. ✅ **Username rules:** **3–20 chars, lowercase `a–z`, `0–9`, `_`**, no leading/trailing underscore. Regex: `^[a-z0-9](?:[a-z0-9_]{1,18}[a-z0-9])$` (3–20).
3. ✅ **Password policy:** min **8 chars**, at least **1 letter + 1 number**.
4. ✅ **Verification style:** **6-digit OTP** (email), for both signup verification and password reset.

**Phase 2 planning is complete and approved.** Ready to implement in the §7 task order.
