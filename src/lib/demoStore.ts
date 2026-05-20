"use client";

// Client-side localStorage store for demo mode.
// Persists across reloads but lives only in this browser.

export type DemoVisit = {
  id: string;
  placeId: string;
  visited_at: string;
  has_wifi: boolean | null;
  has_outlets: boolean | null;
  rating_seating: number | null;
  rating_busy: number | null;
  note_text: string | null;
  tags: string[];
  photoDataUrls: string[]; // base64 data URLs for demo persistence
};

const KEY = "wcs.demo.visits.v2";
const LEGACY_KEY = "wcs.demo.visits.v1";

type LegacyVisit = DemoVisit & {
  rating_wifi?: number | null;
  rating_outlets?: number | null;
};

function migrateLegacy(): void {
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem(KEY)) return;
  const raw = window.localStorage.getItem(LEGACY_KEY);
  if (!raw) return;
  try {
    const old = JSON.parse(raw) as LegacyVisit[];
    const migrated: DemoVisit[] = old.map((v) => ({
      id: v.id,
      placeId: v.placeId,
      visited_at: v.visited_at,
      has_wifi:
        v.has_wifi ??
        (typeof v.rating_wifi === "number" ? v.rating_wifi >= 3 : null),
      has_outlets:
        v.has_outlets ??
        (typeof v.rating_outlets === "number" ? v.rating_outlets >= 3 : null),
      rating_seating: v.rating_seating ?? null,
      rating_busy: v.rating_busy ?? null,
      note_text: v.note_text ?? null,
      tags: v.tags ?? [],
      photoDataUrls: v.photoDataUrls ?? [],
    }));
    window.localStorage.setItem(KEY, JSON.stringify(migrated));
  } catch {
    // Ignore — user can re-seed via console if needed.
  }
}

function readAll(): DemoVisit[] {
  if (typeof window === "undefined") return [];
  migrateLegacy();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as DemoVisit[];
  } catch {
    return [];
  }
}

function writeAll(visits: DemoVisit[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(visits));
}

export function listVisits(): DemoVisit[] {
  return readAll().sort(
    (a, b) => new Date(b.visited_at).getTime() - new Date(a.visited_at).getTime(),
  );
}

export function listVisitsByPlaceId(placeId: string): DemoVisit[] {
  return listVisits().filter((v) => v.placeId === placeId);
}

export function saveVisit(
  visit: Omit<DemoVisit, "id" | "visited_at"> & { visited_at?: string },
): DemoVisit {
  const all = readAll();
  const fresh: DemoVisit = {
    ...visit,
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2),
    visited_at: visit.visited_at ?? new Date().toISOString(),
  };
  all.push(fresh);
  writeAll(all);
  return fresh;
}

export function listAllTags(): string[] {
  const set = new Set<string>();
  for (const v of readAll()) for (const t of v.tags) set.add(t);
  return [...set].sort();
}

export function resetDemo(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
  window.localStorage.removeItem(LEGACY_KEY);
}
