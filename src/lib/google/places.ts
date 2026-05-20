"use client";

import { configureMaps, importLibrary } from "./loader";

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
