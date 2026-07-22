# Parked for later

Things deliberately deferred, with why and what's needed to pick them back up. Keep this list current — update or remove an entry when it's actually resolved.

## Google Sign-In

**Status:** code-complete, blocked on device.

`GoogleButton.tsx` implements the full flow (Supabase `signInWithOAuth` + PKCE, browser-redirect), the hosted Supabase project has the Google provider configured, and the DB side (profile creation, `needs_username` for OAuth signups) all works — verified end-to-end via curl and admin-created test users.

**Why it's blocked:** Expo Go cannot own a custom URL scheme (`gymily://`) — only a real app build can. Without that, the OAuth redirect back into the app is unreliable (confirmed: Expo Go mangles the callback URL, breaking Supabase's PKCE flow-state lookup).

**What's needed to resume:**
- An EAS development build — requires the paid Apple Developer Program ($99/yr) for ad-hoc device provisioning via `eas device:create` / `eas build`, **or**
- A local Xcode build using the free "Personal Team" (no cost, but provisioning profiles expire every 7 days, and requires Xcode to be *fully* installed on this Mac — it currently isn't; `xcrun simctl` errors on an incomplete install).

**In the meantime:** email/password signup is fully functional and is the primary path.

## Buddy chat / find each other

**Status:** parked for MVP.

`docs/buddy-up.md` describes accepted buddies being able to "chat / find each other" for the session. Decided this is out of scope for MVP — the feature ends at "you're buddies" (accepted request), with no in-app chat or in-gym locate mechanic. Users coordinate in person once matched.

**What's needed to resume:**
- A chat data model (thread/messages tables, likely scoped to a buddy pairing or session) + Supabase Realtime subscription for delivery, or a Fastify-backed endpoint if richer logic is needed.
- Decide if this is truly 1:1 ephemeral chat (expires with the buddy session) or persists.
- "Find each other" in-gym (if pursued) would need presence/location data beyond what `check_ins` currently tracks.

## Push notifications (Buddy Up)

**Status:** deferred in favor of in-app-only requests.

Buddy Up (`docs/buddy-up.md`) describes the recipient getting "a notification" when someone wants to buddy up. Built the feature with in-app-only delivery instead (a live badge + request list via Supabase Realtime) rather than real OS push notifications, since:

- Zero notification infrastructure exists yet — no `expo-notifications`, no device-token storage, no send path.
- Real push notifications have their own untested Expo-Go compatibility risk (Android dropped Expo Go's push support in recent SDKs) — the same category of problem that cost real time on Google Sign-In. Worth verifying deliberately rather than assuming it works.

**What's needed to resume:**
- Add `expo-notifications` + `expo-device`, request permission, register each device's Expo push token (new column, e.g. `profiles.push_token` or a separate `push_tokens` table for multi-device).
- A send path — likely a Fastify route or Supabase Edge Function calling Expo's push API when a `buddy_requests` row is inserted (a DB webhook or trigger could kick this off server-side).
- Verify push delivery actually works in whatever build target is current at the time (Expo Go vs. a dev client) *before* assuming the approach — don't repeat the OAuth mistake.
