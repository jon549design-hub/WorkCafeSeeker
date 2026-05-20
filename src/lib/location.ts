"use client";

export type LatLng = { lat: number; lng: number };

const SESSION_KEY = "wcs.userLocation.v1";
const TTL_MS = 15 * 60 * 1000;

// On LAN IPs / non-HTTPS contexts, mobile browsers block geolocation.
// We fall back to a fixed downtown SF location so demo distances still vary.
export const FALLBACK_LOCATION: LatLng = { lat: 37.7793, lng: -122.4192 }; // ~Union Square

export async function getCurrentLocation(): Promise<LatLng> {
  if (typeof window === "undefined") return FALLBACK_LOCATION;

  // Cached for the session — no repeated permission prompts.
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (raw) {
      const { at, loc } = JSON.parse(raw) as { at: number; loc: LatLng };
      if (Date.now() - at < TTL_MS) return loc;
    }
  } catch {
    // fall through
  }

  if (!navigator.geolocation) return FALLBACK_LOCATION;

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const loc = { lat: p.coords.latitude, lng: p.coords.longitude };
        try {
          window.sessionStorage.setItem(
            SESSION_KEY,
            JSON.stringify({ at: Date.now(), loc }),
          );
        } catch {
          // ignore
        }
        resolve(loc);
      },
      () => resolve(FALLBACK_LOCATION),
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 6000 },
    );
  });
}

export function haversineKm(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371; // earth radius km
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export function formatMiles(km: number): string {
  const mi = km * 0.621371;
  if (mi < 0.1) return "<0.1 mi";
  if (mi < 10) return `${mi.toFixed(1)} mi`;
  return `${Math.round(mi)} mi`;
}
