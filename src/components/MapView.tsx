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
  id: string;
  google_place_id: string;
  name: string;
  lat: number;
  lng: number;
  has_wifi: boolean | null;
  has_outlets: boolean | null;
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
      const { data, error } = await supabase
        .from("visits")
        .select(
          "has_wifi, has_outlets, cafe:cafes(id, google_place_id, name, lat, lng)",
        )
        .order("visited_at", { ascending: false })
        .limit(500);
      if (cancelled) return;
      if (error) {
        console.warn("Could not load visited cafes:", error.message);
        return;
      }
      const byCafe = new Map<string, CafePin>();
      for (const v of (data ?? []) as unknown as {
        has_wifi: boolean | null;
        has_outlets: boolean | null;
        cafe: {
          id: string;
          google_place_id: string;
          name: string;
          lat: number;
          lng: number;
        } | null;
      }[]) {
        const c = v.cafe;
        if (!c) continue;
        // Newest visit wins for the boolean signals.
        if (!byCafe.has(c.id)) {
          byCafe.set(c.id, {
            id: c.id,
            google_place_id: c.google_place_id,
            name: c.name,
            lat: c.lat,
            lng: c.lng,
            has_wifi: v.has_wifi,
            has_outlets: v.has_outlets,
          });
        }
      }
      setPins([...byCafe.values()]);
    })();

    setStyleIdState(getMapStyleId());
    setRegularId(getRegular());
    getCurrentLocation().then((loc) => {
      if (!cancelled) setUserLoc(loc);
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
      if (filters.has_wifi && p.has_wifi !== true) return false;
      if (filters.has_outlets && p.has_outlets !== true) return false;
      // open_now filter would need live hours parsing — out of scope here.
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
        // Regular = blue, Visited = beige. (No "new" pin here — those
        // would be Google Places nearby, surfaced on the dashboard, not
        // pre-rendered on this map.)
        const color = isRegular ? "#5b85b8" : "#b89866";
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
        autocompleteEl.style.width = "100%";
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
