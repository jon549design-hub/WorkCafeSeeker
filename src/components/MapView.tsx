"use client";

import "leaflet/dist/leaflet.css";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ensureSession } from "@/lib/supabase/session";
import {
  BAY_AREA_BOUNDS,
  configureMaps,
  importLibrary,
} from "@/lib/google/loader";
import { fetchNearbyPlaces } from "@/lib/google/places";
import {
  getCurrentLocation,
  haversineKm,
  formatMiles,
  type LatLng,
} from "@/lib/location";
import { getRegular, subscribeRegular } from "@/lib/preferences";
import { findStyle, getMapStyleId, setMapStyleId, type MapStyleId } from "@/lib/mapStyles";
import FilterChips, { DEFAULT_FILTERS, type SignalFilters } from "./FilterChips";
import MapStylePicker from "./MapStylePicker";

const SF_CENTER: [number, number] = [37.7749, -122.4194];

type CafePin = {
  google_place_id: string;
  name: string;
  lat: number;
  lng: number;
  has_wifi: boolean | null;
  has_outlets: boolean | null;
  // true if this pin came from Google Places nearby search rather than
  // the user's own visits. Renders as a "new" (green) marker.
  isNew?: boolean;
  isOpen?: boolean | null;
};

export default function MapView() {
  const router = useRouter();
  const mapEl = useRef<HTMLDivElement | null>(null);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const tileLayerRef = useRef<import("leaflet").TileLayer | null>(null);

  const [filters, setFilters] = useState<SignalFilters>(DEFAULT_FILTERS);
  const [styleId, setStyleIdState] = useState<MapStyleId>("streets");
  const [userLoc, setUserLoc] = useState<LatLng | null>(null);
  const [regularId, setRegularId] = useState<string | null>(null);
  const [pins, setPins] = useState<CafePin[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await ensureSession();
      const supabase = createSupabaseBrowserClient();
      const currentRegular = getRegular();
      const { data, error } = await supabase
        .from("visits")
        .select(
          "has_wifi, has_outlets, cafe:cafes(google_place_id, name, lat, lng)",
        )
        .order("visited_at", { ascending: false })
        .limit(500);
      if (cancelled) return;
      if (error) {
        console.warn("Could not load visited cafes:", error.message);
        return;
      }
      const byPlaceId = new Map<string, CafePin>();
      for (const v of (data ?? []) as unknown as {
        has_wifi: boolean | null;
        has_outlets: boolean | null;
        cafe: {
          google_place_id: string;
          name: string;
          lat: number;
          lng: number;
        } | null;
      }[]) {
        const c = v.cafe;
        if (!c) continue;
        if (!byPlaceId.has(c.google_place_id)) {
          byPlaceId.set(c.google_place_id, {
            google_place_id: c.google_place_id,
            name: c.name,
            lat: c.lat,
            lng: c.lng,
            has_wifi: v.has_wifi,
            has_outlets: v.has_outlets,
          });
        }
      }

      // Also pull the user's regular cafe (even without a logged visit).
      if (currentRegular && !byPlaceId.has(currentRegular)) {
        const { data: regularRow } = await supabase
          .from("cafes")
          .select("google_place_id, name, lat, lng")
          .eq("google_place_id", currentRegular)
          .maybeSingle();
        if (regularRow) {
          byPlaceId.set(regularRow.google_place_id as string, {
            google_place_id: regularRow.google_place_id as string,
            name: regularRow.name as string,
            lat: regularRow.lat as number,
            lng: regularRow.lng as number,
            has_wifi: null,
            has_outlets: null,
          });
        }
      }

      setPins([...byPlaceId.values()]);
    })();

    setStyleIdState(getMapStyleId());
    setRegularId(getRegular());
    getCurrentLocation().then(async (loc) => {
      if (cancelled) return;
      setUserLoc(loc);
      // Pull nearby work-spot places from Google and render them as
      // "new" (green) pins so the map isn't empty when the user has
      // few/no visits.
      try {
        const nearby = await fetchNearbyPlaces(loc, 1500, 12);
        if (cancelled) return;
        setPins((prev) => {
          const have = new Set(prev.map((p) => p.google_place_id));
          const additions: CafePin[] = [];
          for (const p of nearby) {
            if (have.has(p.id)) continue;
            additions.push({
              google_place_id: p.id,
              name: p.name,
              lat: p.lat,
              lng: p.lng,
              has_wifi: null,
              has_outlets: null,
              isNew: true,
              isOpen: p.isOpen,
            });
          }
          return [...prev, ...additions];
        });
      } catch (e) {
        console.warn("Could not fetch nearby places for map:", e);
      }
    });
    const unsub = subscribeRegular(() => setRegularId(getRegular()));
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  function handleStyleChange(id: MapStyleId) {
    setStyleIdState(id);
    setMapStyleId(id);
  }

  const filteredPins = useMemo(() => {
    return pins.filter((p) => {
      // Wifi / outlets filters only apply to confirmed-good visited
      // cafes. New pins (no user data) are excluded when filtering.
      if (filters.has_wifi && p.has_wifi !== true) return false;
      if (filters.has_outlets && p.has_outlets !== true) return false;
      // "Open now" only applies to new pins (we have Google's isOpen
      // for them). Visited cafes don't store hours, so they're always
      // shown — better than hiding history.
      if (filters.open_now && p.isNew && p.isOpen === false) return false;
      return true;
    });
  }, [pins, filters]);

  // Mount the Leaflet map + draw markers.
  useEffect(() => {
    let cancelled = false;
    let map: import("leaflet").Map | null = null;
    let markerLayer: import("leaflet").LayerGroup | null = null;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !mapEl.current) return;

      map = L.map(mapEl.current, {
        center: SF_CENTER,
        zoom: 13,
        zoomControl: false,
        attributionControl: false,
      });
      mapRef.current = map;

      const style = findStyle(styleId);
      const tile = L.tileLayer(style.url, {
        attribution: style.attribution,
        maxZoom: style.maxZoom,
      }).addTo(map);
      tileLayerRef.current = tile;

      requestAnimationFrame(() => map?.invalidateSize());

      markerLayer = L.layerGroup().addTo(map);
      drawMarkers(L, markerLayer, filteredPins);
    })();

    function drawMarkers(
      L: typeof import("leaflet"),
      layer: import("leaflet").LayerGroup,
      cafes: CafePin[],
    ) {
      layer.clearLayers();

      if (userLoc) {
        const youIcon = L.divIcon({
          className: "",
          html: `<div style="
            width:14px;height:14px;border-radius:9999px;
            background:#1a1a1a;
            border:3px solid #fbf6eb;
            box-shadow:0 0 0 4px rgba(26,26,26,.15),0 1px 4px rgba(0,0,0,.4);
          "></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });
        L.marker([userLoc.lat, userLoc.lng], {
          icon: youIcon,
          interactive: false,
        })
          .bindTooltip("You", { direction: "top", offset: [0, -8] })
          .addTo(layer);
      }

      for (const c of cafes) {
        const isRegular = regularId === c.google_place_id;
        const isNew = !isRegular && c.isNew === true;
        // Regular = blue, New = green, Visited = beige.
        const color = isRegular
          ? "#5b85b8"
          : isNew
            ? "#6e9d72"
            : "#b89866";
        const size = isRegular ? 22 : 18;
        const inner = isRegular
          ? `<div style="
                background:${color};
                width:${size}px;height:${size}px;border-radius:9999px;
                border:3px solid #fbf6eb;
                box-shadow:0 2px 6px rgba(26,26,26,.25);
                display:flex;align-items:center;justify-content:center;
                color:white;font-size:11px;font-weight:700;
              ">★</div>`
          : `<div style="
                background:${color};
                width:${size}px;height:${size}px;border-radius:9999px;
                border:3px solid #fbf6eb;
                box-shadow:0 2px 6px rgba(26,26,26,.25);
              "></div>`;
        const icon = L.divIcon({
          className: "",
          html: inner,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });
        const marker = L.marker([c.lat, c.lng], { icon });
        const distStr =
          userLoc != null
            ? formatMiles(haversineKm(userLoc, { lat: c.lat, lng: c.lng }))
            : "";
        marker.bindTooltip(
          `<strong>${c.name}</strong>${distStr ? `<br/><span style="color:#6b6b6b">${distStr}</span>` : ""}`,
          { direction: "top", offset: [0, -8] },
        );
        marker.on("click", () => router.push(`/cafe/${c.google_place_id}`));
        marker.addTo(layer);
      }
    }

    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredPins, userLoc, regularId]);

  // Swap tile layer when style cycles.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const map = mapRef.current;
      if (!map) return;
      const L = (await import("leaflet")).default;
      if (cancelled) return;
      const style = findStyle(styleId);
      const next = L.tileLayer(style.url, {
        attribution: style.attribution,
        maxZoom: style.maxZoom,
      });
      next.addTo(map);
      const prev = tileLayerRef.current;
      tileLayerRef.current = next;
      setTimeout(() => prev?.remove(), 200);
    })();
    return () => {
      cancelled = true;
    };
  }, [styleId]);

  // Mount Google PlaceAutocompleteElement for search.
  useEffect(() => {
    let cancelled = false;
    let autocompleteEl: HTMLElement | null = null;

    (async () => {
      try {
        configureMaps();
        const places = (await importLibrary("places")) as unknown as {
          PlaceAutocompleteElement: new (opts?: unknown) => HTMLElement;
        };
        if (cancelled || !searchContainerRef.current || !places.PlaceAutocompleteElement) {
          return;
        }
        autocompleteEl = new places.PlaceAutocompleteElement({
          locationBias: BAY_AREA_BOUNDS,
          includedPrimaryTypes: [
            "cafe",
            "coffee_shop",
            "bakery",
            "restaurant",
            "meal_takeaway",
          ],
        } as unknown as Record<string, unknown>);
        // Style the Google element to match the cream / pill aesthetic.
        // PlaceAutocompleteElement exposes a handful of CSS custom props
        // that pass through its shadow DOM.
        autocompleteEl.style.cssText = `
          width: 100%;
          color-scheme: light;
          --gmpx-color-surface: #ffffff;
          --gmpx-color-on-surface: #1a1a1a;
          --gmpx-color-on-surface-variant: #6b6b6b;
          --gmpx-color-primary: #1a1a1a;
          --gmpx-color-outline: #e3dccc;
          --gmpx-font-family-base: var(--font-sans);
          --gmpx-font-size-base: 14px;
        `;
        searchContainerRef.current.innerHTML = "";
        searchContainerRef.current.appendChild(autocompleteEl);

        autocompleteEl.addEventListener("gmp-select", async (evt: Event) => {
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
      } catch (err) {
        console.warn("Could not load Google Places autocomplete:", err);
      }
    })();

    return () => {
      cancelled = true;
      autocompleteEl?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const styleLabel = findStyle(styleId).label;

  return (
    <div className="flex-1 flex flex-col">
      <div className="relative flex-1 min-h-[calc(100dvh-9rem)]">
        <div className="absolute top-3 inset-x-3 z-[500] space-y-2">
          <div ref={searchContainerRef} className="w-full" />
          <FilterChips value={filters} onChange={setFilters} />
        </div>

        <div ref={mapEl} className="absolute inset-0" />

        <div className="absolute bottom-3 right-3 z-[500]">
          <MapStylePicker value={styleId} onChange={handleStyleChange} />
        </div>

        <div className="absolute bottom-3 left-3 z-[500] text-[11px] bg-background/95 border border-border px-3 py-2 rounded-2xl shadow-sm flex flex-col gap-1.5">
          <LegendDot color="#5b85b8" label="Regular" />
          <LegendDot color="#b89866" label="Visited" />
          <LegendDot color="#6e9d72" label="New" />
          <p className="text-[9px] text-subtle border-t border-border pt-1 mt-1">
            Map © OSM, {styleLabel === "Streets" ? "OpenStreetMap" : "CARTO"}
          </p>
        </div>
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="inline-block w-3 h-3 rounded-full border-2 border-background shrink-0"
        style={{ background: color }}
      />
      <span className="text-foreground">{label}</span>
    </span>
  );
}
