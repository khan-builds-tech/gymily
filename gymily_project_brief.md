# Project Brief: Gymily Mobile V1

## 1. Overview
Gymily is a human-centric social network for gym-goers designed to bridge the gap between digital connection and physical training. The platform facilitates "Buddying Up" — finding training partners in real-time within a specific gym location to improve motivation, safety, and community.

## 2. Target Audience
- **The Solo Lifter:** Individuals looking for a spot or motivation.
- **The Community Seeker:** Users new to a gym or city wanting to find their "pack."
- **Performance Athletes:** People looking for training partners with similar intensity and schedules.

## 3. Core Experience Pillars
- **Atmospheric & Grounded:** Moving away from "digital-only" aesthetics toward a cinematic, human-centric design using authentic photography and editorial typography (Serif/Sans-serif balance).
- **Proximity-First:** High-density, scannable interfaces that prioritize what is happening *now* at the user's specific location.
- **Low Friction:** 44px minimum tap targets and zero-pressure social interactions ("Buddy Up" requests).

## 4. Key Features & User Flows

### A. Discovery & Authentication
- **Onboarding:** Atmospheric welcome screen leading into focused Sign-In/Sign-Up forms.
- **Gym Locator:** Integrated Google Maps-style interface to precisely identify and select a training ground from a proximity-based list.

### B. The "Buddy Up" Flow
- **Gym Presence:** A live directory of members currently checked into the user's gym.
- **Live Metrics:** Real-time indicators (e.g., "3 Training Now") with pulsating visual cues.
- **Buddy Requests:** Seamless invitation system via a non-intrusive bottom sheet.
- **Active Sync:** A dedicated session view connecting buddies with "Sync Intensity" effort overlays and proximity alerts (e.g., "Find Aman near the Free Weights").

## 5. Visual Identity (Kinetic Dark)
- **Primary Palette:** Deep Slate (#0F172A), Dark Slate Blue (#1E293B).
- **Activational Accents:** Emerald Green (#10B981) for primary actions and live states.
- **Typography:** Characterful serif for editorial headers; Inter (Sans-serif) for functional UI and high-density data.
- **Surface Treatment:** Matte finishes, subtle grain, and organic shadows.

## 6. Technical Constraints
- **Device:** Mobile-first (Portrait).
- **Context Awareness:** Requires Geofencing/Location services for gym check-ins and proximity alerts.
- **Real-time:** Webhook-driven status updates for buddy requests and "Sync" states.