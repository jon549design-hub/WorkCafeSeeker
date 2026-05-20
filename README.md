# WorkCafeSeeker

A mobile-friendly web app for finding work-friendly cafes in the SF Bay Area. Personal use for now, designed so it can scale to a community version later.

**Stack:** Next.js (App Router) · Supabase (Postgres / Auth / Storage) · Google Maps + Places · Tailwind CSS

## Features

- Map of nearby cafes, centered on your location (Bay Area)
- Hybrid data: Google Places for discovery, your own notes/photos/ratings layered on top
- Per-cafe ratings on the signals that matter: wifi, outlets, seating, busyness
- Photos (compressed client-side before upload)
- Free-text notes + reusable tags ("morning spot", "deep work")
- Filters: open now, visited / not visited, has outlets / good wifi

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://app.supabase.com)
2. In the dashboard go to **Authentication -> Providers** and enable **Anonymous Sign-Ins**
3. Open **SQL Editor** and run the contents of `supabase/schema.sql`
4. Go to **Storage**, create a new bucket called `cafe-photos` (public read is fine for MVP)
5. From **Project Settings -> API**, copy your Project URL and `anon` key

### 3. Set up Google Maps + Places

1. Create a project in [Google Cloud Console](https://console.cloud.google.com)
2. Enable the **Maps JavaScript API** and **Places API (New)**
3. Create an API key, then under "Application restrictions" select **HTTP referrers** and add `localhost:*` and your production domain
4. Under "API restrictions", limit the key to just those two APIs
5. In **APIs & Services -> Quotas**, set a daily limit (e.g. 1000 requests/day) to stay safe

### 4. Configure environment

```bash
cp .env.local.example .env.local
# fill in the values
```

### 5. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) on your phone or desktop browser.

## Project structure

```
src/
  app/
    page.tsx                       # Map home screen
    cafe/[placeId]/page.tsx        # Cafe detail (Mine vs Google panels)
    cafe/[placeId]/visit/page.tsx  # Visit capture form
    saved/page.tsx                 # Saved cafes list
    layout.tsx                     # Root layout + bottom nav
  components/                      # Reusable UI
  lib/
    supabase/                      # Supabase client + session helpers
    google/                        # Google Maps loader + map constants
    types.ts                       # Shared TS types
supabase/
  schema.sql                       # Database schema
```

## Data model (overview)

- `cafes` — shared global table keyed by `google_place_id`
- `visits` — your visits, per-user, with ratings + note
- `visit_photos` — photos attached to a visit
- `tags` + `visit_tags` — your reusable tags

All per-user tables enforce RLS so `auth.uid() = user_id`. Anonymous sign-in is used today; swapping to email/social auth later is non-breaking.

## Notes

- **Live "how busy now"** is not in MVP — Google's official Places API doesn't expose live populartimes. Hours and "open now" come from `hours_json` on the cafe record. Adding live busyness is a future enhancement.
- **Photos** are compressed client-side (max ~1200px) before uploading to Supabase Storage to stay within free tier limits.
- The Node engine warning for Next.js 16 wants 20.19+ — if you hit issues, upgrade Node.
