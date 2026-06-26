# Social Media App Architecture Blueprint

This technical blueprint outlines the architecture, technology stack, and additional structural components required to build a high-performance, cost-effective cross-platform social media application.

---

## 1. Core Stack Reference

Your chosen core stack provides an excellent foundation balancing cutting-edge developer velocity with minimal operational overhead:

- **Frontend:** React Native + Expo (Managed Workflow, Expo Router, EAS)
- **Authentication & Database:** Supabase (PostgreSQL, Auth, Realtime)
- **Media Storage:** Cloudflare R2 (S3-compatible, zero egress fees)
- **Backend Layer:** Fastify (Ultra-lightweight, high-performance Node.js framework)

---

## 2. Required Supplementary Technologies

To transform this base stack into a production-grade social media platform capable of handling real-time chat, seamless infinite feeds, media optimization, and instant re-engagement, you must integrate the following components:

### A. Frontend / Client Utilities (Expo Mobile)

- **`@tanstack/react-query` (React Query):** Mandatory for managing server state, infinite scroll pagination caching, automatic background re-fetching, and optimistic updates (e.g., toggling a "like" or "bookmark" button instantly on the UI before the network request resolves).
- **`@shopify/flash-list`:** A highly optimized drop-in replacement for React Native's native `FlatList`. It recycles native views aggressively, avoiding frame drops during fast scrolling through media-heavy feeds.
- **`expo-video`:** Expo's modern, native video player implementation optimized for low latency and smooth performance in scrolling list contexts (e.g., short-form video feeds or video posts).
- **`expo-notifications`:** The standardized abstraction layer to process incoming remote push notifications on iOS and Android.

### B. Media Processing Pipelines

Raw uploads from smartphone cameras (4K images, 60fps videos) are prohibitively large to stream directly to other users. You must compress and optimize them before they hit Cloudflare R2.

- **Image Optimization:** **`sharp`** (integrated into Fastify or executed via Cloudflare Workers) to strip metadata, compress, resize, and convert images into modern web formats like `.webp`.
- **Video Transcoding:** **`fluent-ffmpeg` / FFmpeg** to transcode uploaded videos to segmented streams (HLS/DASH) for modern adaptive streaming.
- _Alternative:_ If budget permits, **Cloudflare Stream** and **Cloudflare Images** provide turn-key processing pipelines that automate this directly on top of your storage layer.

### C. Backend Layer Enhancements (Fastify)

- **`fastify-websocket` or `socket.io`:** Necessary for handling low-latency persistent connections required for typing indicators, online/offline presence tracking, and real-time Direct Messaging (DMs).
- **`@fastify/redis` / Redis Instance (e.g., Upstash or Redis Labs):** Used to solve the **"Fan-out-on-write"** feed paradigm. Fetching an algorithmic or chronological feed by executing complex SQL joins across millions of rows on every app open will quickly bottleneck PostgreSQL. Instead, use Redis to store pre-computed arrays of Post IDs for each user's timeline.

### D. Push Notification Infrastructure

- **Firebase Cloud Messaging (FCM) & Apple Push Notification service (APNs):** Credentials must be configured inside your Apple and Google Developer accounts and linked to your **Expo Developer Dashboard**. Fastify will send an API payload to Expo's Push Service, which securely handles routing through FCM/APNs to wake up the end-user's device.

---

## 3. System Architecture & Data Flow

```
[ Client: Expo Mobile ]
    │
    ├─── (Direct) ────────► [ Supabase Auth & Realtime ] (Signups, Sessions, Row-level Security)
    │
    ├─── (REST / WS) ─────► [ Backend: Fastify ]
                                │
                                ├─── (Cache / Feeds) ──► [ Redis ]
                                ├─── (Relational) ─────► [ Supabase PostgreSQL ]
                                └─── (Media Tasks) ────► [ Sharp / FFmpeg ] ──► [ Cloudflare R2 ]
```

### End-to-End Media Upload Lifecycle:

1. **Initiate:** The Expo client requests a secure pre-signed upload URL from the Fastify backend.
2. **Transfer:** The client uploads the raw video/image file directly to a temporary, sandboxed bucket in **Cloudflare R2** (minimizing backend bandwidth load).
3. **Trigger & Process:** A webhook triggers your Fastify worker (or a Cloudflare Worker) to download the raw asset, process/compress it via **Sharp/FFmpeg**, write the final web-ready output back to the public R2 bucket, and clear the raw file.
4. **Persist:** Fastify writes the public asset URL into your **Supabase PostgreSQL** database and pushes the new Post ID to the **Redis** feed caches of all active followers.

---

## 4. Summary Package Matrix

Ensure your dependency trees include these exact core utilities:

| Layer            | Technology                | Primary Use-case                                      |
| :--------------- | :------------------------ | :---------------------------------------------------- |
| **Mobile Core**  | `@shopify/flash-list`     | 60 FPS scrolling feed performance                     |
| **Mobile State** | `@tanstack/react-query`   | Cache synchronization, pagination, optimistic updates |
| **Mobile Media** | `expo-video`              | Native media rendering                                |
| **Backend Core** | `fastify`                 | Ultra-fast JSON API router                            |
| **Real-time**    | `fastify-websocket`       | Chat, presence, and live messaging layer              |
| **Asset Engine** | `sharp` & `fluent-ffmpeg` | Image/Video compression and streaming prep            |
| **Caching/Feed** | `redis`                   | In-memory time-line fan-out execution                 |
| **Push Core**    | `expo-notifications`      | Push notification delivery infrastructure             |
