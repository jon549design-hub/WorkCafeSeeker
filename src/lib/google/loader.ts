"use client";

import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

let configured = false;

export function configureMaps() {
  if (configured) return;
  setOptions({
    key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!,
    v: "weekly",
    libraries: ["places", "marker"],
  });
  configured = true;
}

export { importLibrary };

// Bay Area bounding box — used to bias Places searches.
export const BAY_AREA_BOUNDS = {
  north: 38.32,
  south: 37.18,
  east: -121.65,
  west: -122.80,
};

// Default map center: roughly downtown SF.
export const DEFAULT_CENTER = { lat: 37.7749, lng: -122.4194 };
