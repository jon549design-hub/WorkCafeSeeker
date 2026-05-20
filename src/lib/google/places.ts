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
  };
}
