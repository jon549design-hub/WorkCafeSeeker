"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BAY_AREA_BOUNDS,
  DEFAULT_CENTER,
  configureMaps,
  importLibrary,
} from "@/lib/google/loader";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ensureSession } from "@/lib/supabase/session";

type MyCafePin = {
  google_place_id: string;
  name: string;
  lat: number;
  lng: number;
};

export default function MapView() {
  const router = useRouter();
  const mapEl = useRef<HTMLDivElement | null>(null);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const [status, setStatus] = useState<string>("Loading map…");

  useEffect(() => {
    let cancelled = false;
    let autocompleteEl: HTMLElement | null = null;

    async function init() {
      try {
        await ensureSession();
        configureMaps();
        const { Map } = await importLibrary("maps");
        const places = (await importLibrary("places")) as unknown as {
          PlaceAutocompleteElement: new (opts?: unknown) => HTMLElement;
        };
        await importLibrary("marker");
        if (cancelled || !mapEl.current) return;

        const center = await getCurrentPosition().catch(() => DEFAULT_CENTER);

        const map = new Map(mapEl.current, {
          center,
          zoom: 14,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: "greedy",
          restriction: {
            latLngBounds: BAY_AREA_BOUNDS,
            strictBounds: false,
          },
        });
        mapRef.current = map;
        setStatus("");

        // New Places UI Kit: PlaceAutocompleteElement is a Web Component.
        // Mount it inside our styled search-bar container.
        if (searchContainerRef.current && places.PlaceAutocompleteElement) {
          // No `includedPrimaryTypes` filter — anywhere with wifi + seating
          // can be a work spot (delis, boba, lounges, libraries, etc.).
          autocompleteEl = new places.PlaceAutocompleteElement({
            locationBias: BAY_AREA_BOUNDS,
          } as unknown as Record<string, unknown>);
          // Make it fill the container.
          autocompleteEl.style.width = "100%";
          searchContainerRef.current.innerHTML = "";
          searchContainerRef.current.appendChild(autocompleteEl);

          autocompleteEl.addEventListener("gmp-select", async (evt: Event) => {
            // The select event carries a placePrediction with .toPlace()
            const ev = evt as unknown as {
              placePrediction?: {
                toPlace: () => google.maps.places.Place;
              };
            };
            const place = ev.placePrediction?.toPlace();
            if (!place) return;
            await place.fetchFields({ fields: ["id"] });
            if (place.id) router.push(`/cafe/${place.id}`);
          });
        }

        // Load the user's visited cafes from Supabase and pin them.
        const supabase = createSupabaseBrowserClient();
        const { data, error } = await supabase
          .from("visits")
          .select("cafe:cafes(google_place_id, name, lat, lng)")
          .limit(500);
        if (error) {
          console.warn("Could not load visited cafes:", error.message);
        } else {
          const cafes: MyCafePin[] = (data ?? [])
            .map((row) => row.cafe as unknown as MyCafePin)
            .filter(Boolean);
          const seen = new Set<string>();
          markersRef.current.forEach((m) => m.setMap(null));
          markersRef.current = [];
          for (const c of cafes) {
            if (seen.has(c.google_place_id)) continue;
            seen.add(c.google_place_id);
            const marker = new google.maps.Marker({
              map,
              position: { lat: c.lat, lng: c.lng },
              title: c.name,
            });
            marker.addListener("click", () =>
              router.push(`/cafe/${c.google_place_id}`),
            );
            markersRef.current.push(marker);
          }
        }
      } catch (err) {
        console.error(err);
        setStatus("Failed to load map. Check your Google Maps key and Supabase config.");
      }
    }

    init();
    return () => {
      cancelled = true;
      autocompleteEl?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative flex-1 flex flex-col">
      <div className="absolute top-3 inset-x-3 z-10">
        {/* PlaceAutocompleteElement renders its own styled input + dropdown.
            We give it a plain block container — no overflow-hidden, no
            competing border/background — so the dropdown can extend below. */}
        <div ref={searchContainerRef} className="w-full" />
      </div>
      <div ref={mapEl} className="flex-1" />
      {status && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="px-4 py-2 rounded-md bg-black/60 text-white text-sm">
            {status}
          </div>
        </div>
      )}
    </div>
  );
}

function getCurrentPosition(): Promise<google.maps.LatLngLiteral> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("no geolocation"));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 8000 },
    );
  });
}
