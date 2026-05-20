"use client";

import { formatMiles, haversineKm, type LatLng } from "@/lib/location";
import type { DemoCafe } from "@/lib/demo";

type Props = {
  cafe: DemoCafe;
  userLoc: LatLng | null;
  isRegular?: boolean;
  isVisited?: boolean;
  hasWifi?: boolean | null;
  hasOutlets?: boolean | null;
  onClick: () => void;
};

export default function CafeCard({
  cafe,
  userLoc,
  isRegular,
  isVisited,
  hasWifi,
  hasOutlets,
  onClick,
}: Props) {
  const dist = userLoc
    ? formatMiles(haversineKm(userLoc, { lat: cafe.lat, lng: cafe.lng }))
    : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-3xl bg-surface border border-border p-4 shadow-[0_4px_16px_rgba(26,26,26,0.04)] hover:shadow-[0_8px_24px_rgba(26,26,26,0.08)] transition"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold truncate">{cafe.name}</span>
            {isRegular ? (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-soft text-amber-warm font-semibold shrink-0">
                ★ Regular
              </span>
            ) : isVisited ? (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-sage-soft text-sage font-semibold shrink-0">
                Visited
              </span>
            ) : (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-soft text-rose font-semibold shrink-0">
                New
              </span>
            )}
          </div>
          <p className="text-xs text-subtle mt-0.5 truncate">
            {cafe.neighborhood}
            {dist ? ` · ${dist}` : ""}
          </p>
          <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
            {cafe.open_now ? (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-sage-soft text-sage font-medium">
                Open now
              </span>
            ) : (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-soft text-rose font-medium">
                Closed
              </span>
            )}
            <Signal label="Wifi" value={hasWifi} />
            <Signal label="Outlets" value={hasOutlets} />
          </div>
        </div>
        <span className="text-subtle text-lg shrink-0 -mr-1">›</span>
      </div>
    </button>
  );
}

function Signal({ label, value }: { label: string; value: boolean | null | undefined }) {
  if (value === null || value === undefined) return null;
  const cls = value
    ? "bg-surface-muted text-foreground"
    : "bg-surface-muted text-subtle line-through";
  return (
    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${cls}`}>
      {label}
    </span>
  );
}
