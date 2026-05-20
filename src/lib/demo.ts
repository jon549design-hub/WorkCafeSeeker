// Demo mode — runs without Supabase or Google Cloud keys.
// Auto-enabled when env vars are missing (so dev with no .env.local "just works").

export function isDemoMode(): boolean {
  // Treat as demo whenever the Supabase URL or Google Maps key is missing/stub.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const gkey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  if (!url || url.includes("YOUR-PROJECT") || url === "demo") return true;
  if (!gkey || gkey.includes("YOUR-") || gkey === "demo") return true;
  return false;
}

export type DemoCafe = {
  google_place_id: string;
  name: string;
  address: string;
  neighborhood: string;
  lat: number;
  lng: number;
  google_rating: number;
  user_rating_count: number;
  open_now: boolean;
  weekday_text: string[];
  google_photos: string[]; // remote URLs ok for demo
  hero_image: string; // hero banner shown on cards/sheet
};

const HRS_STANDARD = [
  "Monday: 7:00 AM – 6:00 PM",
  "Tuesday: 7:00 AM – 6:00 PM",
  "Wednesday: 7:00 AM – 6:00 PM",
  "Thursday: 7:00 AM – 6:00 PM",
  "Friday: 7:00 AM – 6:00 PM",
  "Saturday: 8:00 AM – 5:00 PM",
  "Sunday: 8:00 AM – 5:00 PM",
];

// Real SF places, approximate coords. Fake demo data only.
// Includes a boba shop and a co-working-friendly lounge so it's not cafe-only.
export const DEMO_CAFES: DemoCafe[] = [
  {
    google_place_id: "demo-sightglass",
    name: "Sightglass Coffee",
    address: "270 7th St, San Francisco, CA",
    neighborhood: "SoMa",
    lat: 37.7780,
    lng: -122.4082,
    google_rating: 4.5,
    user_rating_count: 1820,
    open_now: true,
    weekday_text: HRS_STANDARD,
    google_photos: [],
    hero_image: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&q=80",
  },
  {
    google_place_id: "demo-ritual",
    name: "Ritual Coffee Roasters",
    address: "1026 Valencia St, San Francisco, CA",
    neighborhood: "Mission",
    lat: 37.7561,
    lng: -122.4214,
    google_rating: 4.4,
    user_rating_count: 1140,
    open_now: true,
    weekday_text: HRS_STANDARD,
    google_photos: [],
    hero_image: "https://images.unsplash.com/photo-1453614512568-c4024d13c247?w=800&q=80",
  },
  {
    google_place_id: "demo-the-mill",
    name: "The Mill",
    address: "736 Divisadero St, San Francisco, CA",
    neighborhood: "NoPa",
    lat: 37.7766,
    lng: -122.4376,
    google_rating: 4.4,
    user_rating_count: 990,
    open_now: true,
    weekday_text: HRS_STANDARD,
    google_photos: [],
    hero_image: "https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=800&q=80",
  },
  {
    google_place_id: "demo-saint-frank",
    name: "Saint Frank Coffee",
    address: "2340 Polk St, San Francisco, CA",
    neighborhood: "Russian Hill",
    lat: 37.7993,
    lng: -122.4198,
    google_rating: 4.6,
    user_rating_count: 720,
    open_now: true,
    weekday_text: HRS_STANDARD,
    google_photos: [],
    hero_image: "https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=800&q=80",
  },
  {
    google_place_id: "demo-andytown",
    name: "Andytown Coffee Roasters",
    address: "3655 Lawton St, San Francisco, CA",
    neighborhood: "Outer Sunset",
    lat: 37.7559,
    lng: -122.5025,
    google_rating: 4.7,
    user_rating_count: 1310,
    open_now: false,
    weekday_text: HRS_STANDARD,
    google_photos: [],
    hero_image: "https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=800&q=80",
  },
  {
    google_place_id: "demo-wrecking-ball",
    name: "Wrecking Ball Coffee Roasters",
    address: "2271 Union St, San Francisco, CA",
    neighborhood: "Cow Hollow",
    lat: 37.7973,
    lng: -122.4346,
    google_rating: 4.5,
    user_rating_count: 540,
    open_now: true,
    weekday_text: HRS_STANDARD,
    google_photos: [],
    hero_image: "https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=800&q=80",
  },
  {
    google_place_id: "demo-verve",
    name: "Verve Coffee Roasters",
    address: "528 Divisadero St, San Francisco, CA",
    neighborhood: "NoPa",
    lat: 37.7760,
    lng: -122.4376,
    google_rating: 4.4,
    user_rating_count: 660,
    open_now: true,
    weekday_text: HRS_STANDARD,
    google_photos: [],
    hero_image: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=800&q=80",
  },
  {
    google_place_id: "demo-reveille",
    name: "Réveille Coffee Co.",
    address: "4076 18th St, San Francisco, CA",
    neighborhood: "Castro",
    lat: 37.7616,
    lng: -122.4338,
    google_rating: 4.4,
    user_rating_count: 480,
    open_now: true,
    weekday_text: HRS_STANDARD,
    google_photos: [],
    hero_image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80",
  },
  {
    google_place_id: "demo-boba-guys",
    name: "Boba Guys (Mission)",
    address: "3491 19th St, San Francisco, CA",
    neighborhood: "Mission",
    lat: 37.7604,
    lng: -122.4218,
    google_rating: 4.3,
    user_rating_count: 920,
    open_now: true,
    weekday_text: [
      "Monday: 11:00 AM – 9:00 PM",
      "Tuesday: 11:00 AM – 9:00 PM",
      "Wednesday: 11:00 AM – 9:00 PM",
      "Thursday: 11:00 AM – 9:00 PM",
      "Friday: 11:00 AM – 10:00 PM",
      "Saturday: 11:00 AM – 10:00 PM",
      "Sunday: 11:00 AM – 9:00 PM",
    ],
    google_photos: [],
    hero_image: "https://images.unsplash.com/photo-1497515114629-f71d768fd07c?w=800&q=80",
  },
  {
    google_place_id: "demo-faze-lounge",
    name: "Faze Lounge & Café",
    address: "455 Hayes St, San Francisco, CA",
    neighborhood: "Hayes Valley",
    lat: 37.7765,
    lng: -122.4254,
    google_rating: 4.2,
    user_rating_count: 280,
    open_now: true,
    weekday_text: [
      "Monday: 8:00 AM – 10:00 PM",
      "Tuesday: 8:00 AM – 10:00 PM",
      "Wednesday: 8:00 AM – 10:00 PM",
      "Thursday: 8:00 AM – 10:00 PM",
      "Friday: 8:00 AM – 11:00 PM",
      "Saturday: 9:00 AM – 11:00 PM",
      "Sunday: 9:00 AM – 9:00 PM",
    ],
    google_photos: [],
    hero_image: "https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=800&q=80",
  },
];

export function findDemoCafe(placeId: string): DemoCafe | undefined {
  return DEMO_CAFES.find((c) => c.google_place_id === placeId);
}
