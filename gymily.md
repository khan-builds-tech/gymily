# Gymily V1 Development Master Prompt

You are a Staff Mobile Engineer, Product Architect, and Startup CTO.

I am building a mobile application called **Gymily**.

Your job is to design and implement a production-ready V1 in multiple phases.

Do not try to build everything at once.

Act as if this will become a real startup product with thousands of users.

For every phase:

- Explain the architecture decisions.
- Define database schemas.
- Define API contracts.
- Define mobile screens.
- Define folder structure.
- Define development tasks.
- Define testing strategy.
- Define deployment strategy.
- Produce implementation code only after planning is complete.

---

# PRODUCT OVERVIEW

Gymily is a social network for gym-goers.

The core idea is:

People join a gym.

People discover who is training at nearby gyms.

People see real-time gym activity.

People interact through a social feed.

The app combines:

- gym identity
- local discovery
- community
- fitness social networking

This is NOT a workout tracker.

This is NOT a calorie counter.

This is NOT a coaching marketplace.

Those features may come later.

Focus only on V1.

Launch: nationally available; seeding + marketing focus on dense metros first. See location.md.

---

# V1 CORE FEATURES

## Feature 1: Authentication

Users can register using:

### Google Sign In

- Android
- iOS

### Email & Password

Fields:

- full name
- username
- email
- password

Requirements:

- JWT/session authentication
- secure password hashing
- forgot password
- email verification
- account deletion

---

## Feature 2: User Profile

Every user has:

- profile photo
- name
- username
- bio
- gym association
- city
- join date

Profile should display:

- followers
- following
- posts

Future fields can be added later.

Do not overcomplicate V1.

---

## Feature 3: Gym System

A user belongs to a gym.

Gym contains:

- name
- location
- latitude
- longitude
- city
- state
- country

Gym profile should show:

- total members
- active members
- recent posts

Users should be able to:

- search gym
- join gym
- change gym

---

## Feature 4: Live Gym Presence

This is one of the most important features.

The app should estimate how many Gymily users are currently present in a gym.

Requirements:

- user can check in
- automatic checkout after inactivity
- active status timeout
- realtime count updates

Gym card should show:

> "23 people currently training"

Design scalable architecture for this.

Consider:

- WebSockets
- Supabase Realtime
- Firebase
- Redis

Explain tradeoffs.

---

## Feature 5: Map Screen

Main discovery experience.

Display gyms on a map.

Each gym marker should display:

- gym name
- active member count

Map should support:

- zoom
- clustering
- current location

When user taps a gym:

Open gym detail page.

Technology suggestions are welcome.

---

## Feature 6: Social Feed

Users can create posts.

Post types:

- image
- text
- gym update
- progress picture

Users can:

- like
- comment

Feed should support:

- pagination
- infinite scroll

Do not implement stories in V1.

Stories can be Phase 2.

---

## Feature 7: Follow System

Users can:

- follow users
- unfollow users

Feed should prioritize:

- followed users
- same gym users

---

## Feature 8: Buddy Up

Find someone to train with at the same gym.

- tap "Buddy Up" on a person checked in at your gym
- they get a notification (accept or reject)
- if accepted, you're connected for the session

Same gym only. Requests expire after the session. No spam (one pending per person).

See docs/buddy-up.md.

---

# TECH STACK (FINALIZED — see docs/phase-1-architecture.md)

## Frontend

- React Native
- Expo + EAS
- TypeScript
- Expo Router (navigation)
- TanStack Query (server state)

## Backend

- Fastify (Node.js) + TypeScript — thin API for custom logic
- Supabase platform (Postgres + Auth + Realtime)

## Database

- PostgreSQL + PostGIS (Supabase)

## Maps

- Mapbox — renders map, markers, clustering
- Google Places API — gym search + seed data

## Storage

- Cloudflare R2 — image storage only (avatars, posts)

## Realtime

- Supabase Realtime (presence, live counts); Redis added at scale

## Authentication

- Supabase Auth (GoTrue): Google OAuth + email/password, email verification, password reset, JWT sessions

## Analytics

- Google Analytics — basic event tracking

---

# DEVELOPMENT PHASES

Design the project in the following phases.

---

## Phase 1 — Product & Architecture Planning (incl. Auth)

Deliver:

- architecture diagram
- database design
- folder structure
- API design
- development roadmap
- authentication design (Supabase Auth: Google + email/password, email verification, forgot password, session management, account deletion)

No coding yet. See docs/phase-1-architecture.md.

---

## Phase 2 — Mobile App & Screen Flow

Deliver:

- React Native + Expo app structure
- high-level screen flow (Map / Feed / Profile, Gym Detail, etc.)

See docs/phase-2-flow.md.

---

## Phase 3 — User Profiles & Gym System

Deliver:

- schema
- APIs
- screens
- implementation

Features:

- user profiles
- gym creation
- gym search
- join gym
- change gym

---

## Phase 4 — Realtime Gym Presence

Deliver:

- architecture
- scaling strategy
- implementation

Features:

- gym check-in
- gym checkout
- inactivity timeout
- active member count
- realtime updates

Explain how this scales to:

- 10,000 users
- 100,000 users
- 1,000,000 users

---

## Phase 5 — Map Experience

Deliver:

- map integration
- gym markers
- clustering
- gym detail pages

Features:

- current location
- nearby gyms
- active gym count
- gym details

---

## Phase 6 — Social Feed

Deliver:

- post creation
- image uploads
- likes
- comments

Features:

- image posts
- text posts
- gym updates
- infinite scroll
- pagination

---

## Phase 7 — Following System

Deliver:

- follow relationships
- feed ranking
- recommendations

Features:

- follow users
- unfollow users
- followers list
- following list
- personalized feed

---

## Phase 8 — Production Readiness

Deliver:

- security review
- rate limiting
- analytics
- monitoring
- crash reporting
- CI/CD
- App Store deployment
- Play Store deployment

Include:

- logging
- backups
- database migrations
- observability
- performance monitoring

---

# SCALABILITY REQUIREMENTS

Assume the application reaches:

## Stage 1

10,000 users

## Stage 2

100,000 users

## Stage 3

1,000,000 users

For every major feature explain:

- bottlenecks
- database indexing
- caching strategy
- realtime strategy
- storage strategy
- cost implications

Provide migration plans between each scale level.

---

# NON-FUNCTIONAL REQUIREMENTS

The application should be designed for:

- maintainability
- scalability
- security
- developer experience
- rapid startup iteration

Prioritize shipping quickly without sacrificing future scalability.

Avoid premature optimization.

Explain where technical debt is acceptable for V1.

---

# PRODUCT PRINCIPLES

The core value proposition is:

1. Gym-based identity
2. Real-time gym activity
3. Local discovery
4. Social interaction

This is not:

- a workout tracker
- a calorie tracker
- a coaching marketplace
- a supplement marketplace

Keep V1 focused.

If a feature does not directly support:

- gym identity
- gym presence
- social discovery

it should be postponed.

---

# OUTPUT FORMAT

For each phase provide:

## 1. Goals

What is being built.

## 2. Architecture

Technical design decisions.

## 3. Database Changes

Schemas, tables, relationships.

## 4. API Endpoints

REST or RPC endpoints.

## 5. Mobile Screens

Required UI screens.

## 6. Folder Structure

Project organization.

## 7. Development Tasks

Step-by-step implementation plan.

## 8. Testing Strategy

Unit, integration, and E2E tests.

## 9. Risks

Potential issues and mitigation plans.

## 10. Implementation

Actual production-quality code only after planning is approved.

---

# IMPORTANT

Do not skip planning.

Do not jump directly into coding.

Act as a CTO building a venture-backed startup.

Start with **Phase 1 only**.

Wait for approval before moving to Phase 2.

Provide extremely detailed architecture and planning output.
