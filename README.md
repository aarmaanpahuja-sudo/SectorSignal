# SectorSignal

A real-time neighborhood safety platform where neighbors report and track local incidents — open garage doors, unattended packages, lost pets, vandalism, suspicious activity, and safe-walk requests. Built for communities to stay informed and look out for each other.

Website: https://sector-safe.vercel.app

## Features

- **Live incident feed** — Browse active, resolved, or all alerts filtered by your watch zones
- **Interactive live map** — Real-time map of active incidents with category-colored pins, coordinates on click, and one-tap resolve
- **File a report** — Two steps: pick a category, add details, capture GPS (zip is auto-filled from location when available), and post to your community
- **Watch zones** — Monitor any US zip code. Filter the feed and map to only show what matters to you
- **Zip-aware map** — Selecting a watch-zone zip recenters the map on that community using real zip centers
- **Smart location** — Capture GPS when filing a report; zip code is auto-detected from your coordinates (you can still edit it)
- **Neighbor karma** — Earn +10 karma for every report you file. Your score is saved with your account
- **Community verification** — Neighbors can verify reports and mark them as resolved
- **Comments & updates** — Threaded updates on each incident to coordinate with neighbors
- **Analytics dashboard** — Breakdown of reports by category and zip code
- **Real-time sync** — New reports, comments, and status changes appear instantly across all devices via Supabase Realtime
- **Optional accounts** — Use the app anonymously (browser-based) or sign up with email/password to save your profile across devices
- **Installable PWA** — Add SectorSignal to your phone home screen for a full-screen, app-like experience (no App Store required)
- **Push notifications** — Optional alerts when a new incident is filed in a zip code you watch (enable on the Install page)

## Incident Categories

| Category | Description |
|----------|-------------|
| Open Garage Door | Garage left open, possible security concern |
| Unattended Package | Delivery left out, at risk of theft |
| Lost / Found Pet | Missing or found animals in the area |
| Property Vandalism | Damage to property, graffiti, break-ins |
| Suspicious Activity | Unusual or concerning behavior |
| Safe Walk Request | Request a walking companion for safety |

## Tech Stack

- **Frontend:** React + TypeScript + Vite
- **Styling:** Tailwind CSS
- **Maps:** Leaflet + Esri World Dark Gray basemap (OpenStreetMap data still used for community/context)
- **Backend:** Supabase (Postgres + Realtime + Auth + Edge Functions)
- **Icons:** Lucide React
- **PWA:** Web App Manifest + Service Worker (installable, push-capable)
- **Push:** Web Push (VAPID) via Supabase Edge Function
- **Geocoding:** Zippopotam.us (zip → coordinates) + BigDataCloud (coordinates → zip)

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project (or run the included migrations against your own)

### Install

    npm install

### Configure

Create a `.env` file with your Supabase credentials:

    VITE_SUPABASE_URL=your-project-url
    VITE_SUPABASE_ANON_KEY=your-anon-key

### Run the dev server

    npm run dev

### Build for production

    npm run build

## Progressive Web App & Notifications

SectorSignal can be installed to a phone home screen from the **Install** page in the app.

Optional push notifications:

1. Open the **Install** page
2. Tap **Enable Notifications** and allow permission
3. When a new incident is filed in a zip you watch, subscribed devices receive a push

Push delivery uses a Supabase Edge Function (`send-incident-push`) and browser/OS push services. Notifications are optional and limited to your watch zones.

## Database

The schema and RLS policies are defined in `supabase/migrations/`. The app uses two identity paths:

- **Anonymous mode** — A browser-generated `client_id` (UUID) keys the user's profile, zones, and reports
- **Authenticated mode** — Email/password sign-up creates a `profiles` row keyed by `user_id` (Supabase Auth)

Both paths coexist via dual-path Row Level Security policies that check either `auth.uid() = user_id` or `client_id` match.

### Key tables

- `incidents` — Reports filed by neighbors (category, title, description, location, zip, status, verifications)
- `comments` — Threaded updates on incidents
- `watch_zones` — Zip codes a user monitors
- `profiles` — Display name and karma score
- `push_subscriptions` — Browser push endpoints for optional incident alerts (tied to `client_id` / `user_id`)

## Project Structure

    public/
    ├── manifest.webmanifest     # PWA install metadata
    ├── sw.js                    # Service worker (push + notification click)
    └── icons/                   # App icons (192, 512, apple-touch)

    src/
    ├── components/
    │   ├── AuthModal.tsx        # Sign in / sign up modal
    │   ├── IncidentCard.tsx     # Feed card with comments + inline mini-map
    │   ├── InstallPage.tsx      # Install to home screen + enable notifications
    │   ├── MapView.tsx          # Full live incident map (zip recenter + pins)
    │   ├── MiniMap.tsx          # Inline map for incident detail / report form
    │   ├── ReportModal.tsx      # Report flow with GPS + reverse-geocoded zip
    │   └── ...
    ├── lib/
    │   ├── categories.ts        # Category metadata (icons, colors, labels)
    │   ├── clientId.ts          # Anonymous browser identity
    │   ├── geo.ts               # Zip centers, forward/reverse geocoding, time helpers
    │   ├── supabase.ts          # Client + types
    │   ├── useAuth.ts           # Auth hook (sign in/up/out, session)
    │   └── useWatchTowerData.ts # Incidents, zones, comments, profile; triggers push on new reports
    └── App.tsx                  # Main app shell with nav + views
