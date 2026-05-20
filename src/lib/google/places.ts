"use client";

import { configureMaps, importLibrary } from "./loader";

export type NearbyPlace = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  rating: number | null;
  userRatingCount: number | null;
  primaryTypeLabel: string | null;
  photo: string | null;
  isOpen: boolean | null;
};

export type PlaceDetails = {
  id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  rating: number | null;
  userRatingCount: number | null;
  isOpen: boolean | null;
  weekdayText: string[];
  photos: string[];
  primaryTypeLabel: string | null;
};

export async function fetchPlaceDetails(placeId: string): Promise<PlaceDetails> {
  configureMaps();
  const { Place } = await importLibrary("places");
  const place = new Place({ id: placeId, requestedLanguage: "en" });
  await place.fetchFields({
    fields: [
      "displayName",
      "formattedAddress",
      "location",
      "rating",
      "userRatingCount",
      "regularOpeningHours",
      "photos",
      "primaryTypeDisplayName",
    ],
  });

  const loc = place.location;
  const lat = typeof loc?.lat === "function" ? loc.lat() : 0;
  const lng = typeof loc?.lng === "function" ? loc.lng() : 0;

  const photos: string[] = (place.photos ?? [])
    .slice(0, 6)
    .map((p: google.maps.places.Photo) =>
      p.getURI({ maxWidth: 800, maxHeight: 600 }),
    );

  let isOpen: boolean | null = null;
  if (place.regularOpeningHours && typeof place.isOpen === "function") {
    try {
      const v = await place.isOpen();
      isOpen = typeof v === "boolean" ? v : null;
    } catch {
      isOpen = null;
    }
  }

  // primaryTypeDisplayName is a localized human label like "Cafe",
  // "Delicatessen", "Bakery". Display it to help the user understand
  // what kind of place it is at a glance.
  const placeWithType = place as unknown as {
    primaryTypeDisplayName?: { text?: string } | string | null;
  };
  let primaryTypeLabel: string | null = null;
  const raw = placeWithType.primaryTypeDisplayName;
  if (typeof raw === "string") primaryTypeLabel = raw;
  else if (raw && typeof raw === "object" && raw.text) primaryTypeLabel = raw.text;

  return {
    id: placeId,
    name: place.displayName ?? "Unknown",
    address: place.formattedAddress ?? null,
    lat,
    lng,
    rating: place.rating ?? null,
    userRatingCount: place.userRatingCount ?? null,
    isOpen,
    weekdayText: place.regularOpeningHours?.weekdayDescriptions ?? [],
    photos,
    primaryTypeLabel,
  };
}

// Narrow set of canonical work-friendly types for *recommendations*.
// Full restaurants/fast-food are excluded — too noisy. Users can still
// search for those by name via the autocomplete in MapView.
const WORK_SPOT_TYPES = ["cafe", "coffee_shop", "bakery", "tea_house"];

/**
 * Google Places Nearby Search — work-spot types near a point.
 * Used by the dashboard to surface "nearby open right now" recs
 * without requiring the user to have logged any visits.
 */
export async function fetchNearbyPlaces(
  center: { lat: number; lng: number },
  radiusMeters: number = 1500,
  maxResults: number = 8,
): Promise<NearbyPlace[]> {
  configureMaps();
  const placesLib = (await importLibrary("places")) as unknown as {
    Place: {
      searchNearby: (req: unknown) => Promise<{ places: unknown[] }>;
    };
  };
  const Place = placesLib.Place;
  if (!Place || typeof Place.searchNearby !== "function") return [];

  const { places } = await Place.searchNearby({
    fields: [
      "id",
      "displayName",
      "location",
      "rating",
      "userRatingCount",
      "photos",
      "primaryTypeDisplayName",
      "regularOpeningHours",
    ],
    locationRestriction: {
      center,
      radius: radiusMeters,
    },
    includedPrimaryTypes: WORK_SPOT_TYPES,
    maxResultCount: maxResults,
    rankPreference: "DISTANCE",
  });

  const results: NearbyPlace[] = [];
  for (const raw of places) {
    const p = raw as unknown as {
      id: string;
      displayName?: string;
      location?: { lat: () => number; lng: () => number };
      rating?: number;
      userRatingCount?: number;
      photos?: { getURI: (opts: { maxWidth: number; maxHeight: number }) => string }[];
      primaryTypeDisplayName?: { text?: string } | string | null;
      regularOpeningHours?: unknown;
      isOpen?: () => Promise<boolean | undefined>;
    };
    const loc = p.location;
    const lat = typeof loc?.lat === "function" ? loc.lat() : 0;
    const lng = typeof loc?.lng === "function" ? loc.lng() : 0;

    let typeLabel: string | null = null;
    const raw2 = p.primaryTypeDisplayName;
    if (typeof raw2 === "string") typeLabel = raw2;
    else if (raw2 && typeof raw2 === "object" && raw2.text)
      typeLabel = raw2.text;

    const photo =
      p.photos && p.photos.length > 0
        ? p.photos[0].getURI({ maxWidth: 600, maxHeight: 400 })
        : null;

    let isOpen: boolean | null = null;
    if (p.regularOpeningHours && typeof p.isOpen === "function") {
      try {
        const v = await p.isOpen();
        isOpen = typeof v === "boolean" ? v : null;
      } catch {
        isOpen = null;
      }
    }

    results.push({
      id: p.id,
      name: p.displayName ?? "Unknown",
      lat,
      lng,
      rating: p.rating ?? null,
      userRatingCount: p.userRatingCount ?? null,
      primaryTypeLabel: typeLabel,
      photo,
      isOpen,
    });
  }
  return results;
}
