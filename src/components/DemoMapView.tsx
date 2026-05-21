"use client";

import "leaflet/dist/leaflet.css";

import { useEffect, useMemo, useRef, useState } from "react";
import { DEMO_CAFES, type DemoCafe } from "@/lib/demo";
import { listVisits } from "@/lib/demoStore";
import {
  getCurrentLocation,
  haversineKm,
  formatMiles,
  type LatLng,
} from "@/lib/location";
import { getRegular, subscribeRegular } from "@/lib/preferences";
import { findStyle, getMapStyleId, setMapStyleId, type MapStyleId } from "@/lib/mapStyles";
import DemoBanner from "./DemoBanner";
import DemoCafeInfoSheet from "./DemoCafeInfoSheet";
import FilterChips, { DEFAULT_FILTERS, type SignalFilters } from "./FilterChips";
import MapStylePicker from "./MapStylePicker";

const SF_CENTER: [number, number] = [37.7749, -122.4194];

type Snapshot = {
  has_wifi: boolean | null;
  has_outlets: boolean | null;
};

export default function DemoMapView() {
  const mapEl = useRef<HTMLDivElement | null>(null);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<SignalFilters>(DEFAULT_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [, setReady] = useState(false);
  const [userLoc, setUserLoc] = useState<LatLng | null>(null);
  const [regularId, setRegularId] = useState<string | null>(null);
  const [styleId, setStyleIdState] = useState<MapStyleId>("streets");

  const [snapshots, setSnapshots] = useState<Record<string, Snapshot>>({});
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const tileLayerRef = useRef<import("leaflet").TileLayer | null>(null);

  useEffect(() => {
    rebuildSnapshots();
    setRegularId(getRegular());
    setStyleIdState(getMapStyleId());
    const unsub = subscribeRegular(() => setRegularId(getRegular()));
    getCurrentLocation().then(setUserLoc);
    return unsub;
  }, []);

  function handleStyleChange(id: MapStyleId) {
    setStyleIdState(id);
    setMapStyleId(id);
  }

  function rebuildSnapshots() {
    const visits = listVisits();
    const map: Record<string, Snapshot> = {};
    for (const v of visits) {
      if (!map[v.placeId]) {
        map[v.placeId] = {
          has_wifi: v.has_wifi,
          has_outlets: v.has_outlets,
        };
      }
    }
    setSnapshots(map);
  }

  const filteredCafes: DemoCafe[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    return DEMO_CAFES.filter((c) => {
      if (q) {
        const hit =
          c.name.toLowerCase().includes(q) ||
          c.neighborhood.toLowerCase().includes(q) ||
          c.address.toLowerCase().includes(q);
        if (!hit) return false;
      }
      const snap = snapshots[c.google_place_id];
      if (filters.open_now && !c.open_now) return false;
      if (filters.has_wifi && snap?.has_wifi !== true) return false;
      if (filters.has_outlets && snap?.has_outlets !== true) return false;
      return true;
    });
  }, [query, filters, snapshots]);

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
      setReady(true);
      drawMarkers(L, markerLayer, filteredCafes);
    })();

    function drawMarkers(
      L: typeof import("leaflet"),
      layer: import("leaflet").LayerGroup,
      cafes: DemoCafe[],
    ) {
      layer.clearLayers();
      const visited = new Set(Object.keys(snapshots));

      if (userLoc) {
        const youIcon = L.divIcon({
          className: "",
          html: `<div style="
            width:14px;height:14px;border-radius:9999px;
            background:#1a1a1a;
            border:3px solid #f5efe6;
            box-shadow:0 0 0 4px rgba(26,26,26,.15),0 1px 4px rgba(0,0,0,.4);
          "></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });
        L.marker([userLoc.lat, userLoc.lng], { icon: youIcon, interactive: false })
          .bindTooltip("You", { direction: "top", offset: [0, -8] })
          .addTo(layer);
      }

      for (const c of cafes) {
        const isVisited = visited.has(c.google_place_id);
        const isRegular = regularId === c.google_place_id;
        // Regular = blue, Visited = beige, New = green
        const color = isRegular ? "#5b85b8" : isVisited ? "#b89866" : "#6e9d72";
        const size = isRegular ? 22 : 18;
        const inner = isRegular
          ? `<div style="
                background:${color};
                width:${size}px;height:${size}px;border-radius:9999px;
                border:3px solid #f5efe6;
                box-shadow:0 2px 6px rgba(26,26,26,.25);
                display:flex;align-items:center;justify-content:center;
                color:white;font-size:11px;font-weight:700;
              ">★</div>`
          : `<div style="
                background:${color};
                width:${size}px;height:${size}px;border-radius:9999px;
                border:3px solid #f5efe6;
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
          `<strong>${c.name}</strong><br/>
          <span style="color:#6b6b6b">${c.neighborhood}${distStr ? " · " + distStr : ""}</span>`,
          { direction: "top", offset: [0, -8] },
        );
        marker.on("click", () => setSelectedId(c.google_place_id));
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
  }, [filteredCafes, userLoc, regularId]);

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

  function handleSheetClose() {
    setSelectedId(null);
    rebuildSnapshots();
  }

  const styleLabel = findStyle(styleId).label;

  return (
    <div className="flex-1 flex flex-col">
      <DemoBanner />
      <div className="relative flex-1 min-h-[calc(100dvh-9rem)]">
        <div className="absolute top-3 inset-x-3 z-[500] space-y-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search demo spots…"
            className="w-full h-11 px-4 rounded-full bg-background/95 border border-border shadow-[0_4px_16px_rgba(26,26,26,0.06)] outline-none focus:ring-2 focus:ring-foreground/20"
          />
          <FilterChips value={filters} onChange={setFilters} />
        </div>

        <div ref={mapEl} className="absolute inset-0" />

        {/* Style cycle button in the bottom-right corner. */}
        <div className="absolute bottom-3 right-3 z-[500]">
          <MapStylePicker value={styleId} onChange={handleStyleChange} />
        </div>

        {/* Vertical legend (bottom-left). Tiny tile attribution lives here too. */}
        <div className="absolute bottom-3 left-3 z-[500] text-[11px] bg-background/95 border border-border px-3 py-2 rounded-2xl shadow-sm flex flex-col gap-1.5">
          <LegendDot color="#5b85b8" label="Regular" />
          <LegendDot color="#b89866" label="Visited" />
          <LegendDot color="#6e9d72" label="New" />
          <p className="text-[9px] text-subtle border-t border-border pt-1 mt-1">
            Map © OSM, {styleLabel === "Streets" ? "OpenStreetMap" : "CARTO"}
          </p>
        </div>
      </div>
      <DemoCafeInfoSheet
        placeId={selectedId}
        onClose={handleSheetClose}
        userLoc={userLoc}
      />
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
