"use client";

// Lightweight client-side preferences:
// - the "regular" cafe (one fave you fall back to)
// - onboarding answers (priorities → personalized recs)

const REGULAR_KEY = "wcs.regularPlaceId.v1";
const PREFS_KEY = "wcs.userPrefs.v1";

// --- Regular cafe ---

export function getRegular(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(REGULAR_KEY);
}

export function setRegular(placeId: string | null): void {
  if (typeof window === "undefined") return;
  if (placeId) window.localStorage.setItem(REGULAR_KEY, placeId);
  else window.localStorage.removeItem(REGULAR_KEY);
  window.dispatchEvent(new Event("wcs:regular-changed"));
}

export function subscribeRegular(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("wcs:regular-changed", cb);
  return () => window.removeEventListener("wcs:regular-changed", cb);
}

// --- Onboarding preferences ---

export type MustHave = "wifi" | "outlets" | "quiet" | "seating";
export type DistanceTier = "walking" | "short" | "anywhere";
export type SessionLength = "quick" | "session" | "all_day";
export type Adventurous = "regular" | "mostly_regular" | "mix";

export type UserPreferences = {
  mustHaves: MustHave[];
  distance: DistanceTier;
  session: SessionLength;
  adventurous: Adventurous;
  completedAt: string;
};

export const DISTANCE_LIMITS_MI: Record<DistanceTier, number> = {
  walking: 0.6,
  short: 1.8,
  anywhere: Number.POSITIVE_INFINITY,
};

export const MUST_HAVE_LABELS: Record<MustHave, string> = {
  wifi: "Wifi",
  outlets: "Outlets",
  quiet: "Quiet vibe",
  seating: "Lots of seating",
};

export function getPreferences(): UserPreferences | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserPreferences;
  } catch {
    return null;
  }
}

export function setPreferences(prefs: UserPreferences): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  window.dispatchEvent(new Event("wcs:prefs-changed"));
}

export function clearPreferences(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PREFS_KEY);
  window.dispatchEvent(new Event("wcs:prefs-changed"));
}

export function subscribePreferences(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("wcs:prefs-changed", cb);
  return () => window.removeEventListener("wcs:prefs-changed", cb);
}
