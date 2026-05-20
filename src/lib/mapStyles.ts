"use client";

export type MapStyleId = "streets" | "light" | "dark";

export type MapStyle = {
  id: MapStyleId;
  label: string;
  url: string;
  attribution: string;
  maxZoom: number;
  // CSS background color for the popover swatch.
  swatch: string;
};

export const MAP_STYLES: MapStyle[] = [
  {
    id: "streets",
    label: "Streets",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "© OpenStreetMap contributors",
    maxZoom: 19,
    swatch: "#dde6c3",
  },
  {
    id: "light",
    label: "Clean",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
    attribution: "© OpenStreetMap, © CARTO",
    maxZoom: 19,
    swatch: "#e9e6df",
  },
  {
    id: "dark",
    label: "Dark",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
    attribution: "© OpenStreetMap, © CARTO",
    maxZoom: 19,
    swatch: "#1a1d22",
  },
];

const KEY = "wcs.mapStyleId.v1";

export function getMapStyleId(): MapStyleId {
  if (typeof window === "undefined") return "streets";
  const v = window.localStorage.getItem(KEY) as MapStyleId | null;
  if (v && MAP_STYLES.some((s) => s.id === v)) return v;
  return "streets";
}

export function setMapStyleId(id: MapStyleId): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, id);
}

export function findStyle(id: MapStyleId): MapStyle {
  return MAP_STYLES.find((s) => s.id === id) ?? MAP_STYLES[0];
}
