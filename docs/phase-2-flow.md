# Gymily — Phase 2: Mobile App & Screen Flow

The app is built with **React Native + Expo** (one codebase for both iOS and Android, written in TypeScript). Navigation uses **Expo Router** (file-based screens).

This doc gives a quick, high-level picture of the screens and how a user moves between them. Details and code come later.

---

## How a user moves through the app

```
Open app
   │
   ├─ Not logged in ──► Welcome ──► Sign Up / Log In  (handled by Supabase, Phase 1)
   │                                      │
   └─ Logged in ──────────────────────────┘
                                          ▼
                                    Main App (3 tabs)
                          ┌───────────────┼───────────────┐
                          ▼               ▼               ▼
                        Map            Feed            Profile
                          │
                          ▼
                     Gym Detail  ──►  (check in / join gym)
```

The app opens on the **Map** by default once you're logged in.

---

## Screens

**Entry (Phase 1 auth)**

- **Welcome** — logo + "Continue with Google" / "Sign up" / "Log in".
- **Sign Up / Log In** — email + password or Google. Email verified with a 6-digit code.

**Main app (bottom tabs)**

- **Map** _(home)_ — map of nearby gyms. Each marker shows the gym name and how many people are training now. Tap a marker to open the gym.
- **Feed** — scrolling list of posts from people you follow and your gym. Like and comment. Button to create a post.
- **Profile** — your photo, name, username, bio, gym, and your followers / following / posts counts. Settings live here (including log out and delete account).

**Other screens**

- **Gym Detail** — gym name, location, members vs. "training now", recent posts. Buttons to **join** the gym or **check in**.
- **Create Post** — write text or pick a photo, then share.
- **Other User's Profile** — view someone else, follow / unfollow them.

---

## What Phase 2 delivers

The full screen layout and navigation of the app, wired to the backend, so a logged-in user can browse the map, view gyms, see the feed, and open profiles. The deeper features behind these screens (live presence, posting, following) are built out in later phases.

Research from Gemini : Recommendation: For a standard social media app (feed, chat, profiles, camera), React Native is generally the safer and more efficient bet because of Meta's backing, the maturity of social-media-specific libraries, and the ability to do Over-the-Air updates.
