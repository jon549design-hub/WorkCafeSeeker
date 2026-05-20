"use client";

import { formatMiles, haversineKm, type LatLng } from "@/lib/location";
import type { DemoCafe } from "@/lib/demo";

type Variant = "hero" | "tile";

type Props = {
  cafe: DemoCafe;
  userLoc: LatLng | null;
  variant?: Variant;
  isRegular?: boolean;
  isVisited?: boolean;
  hasWifi?: boolean | null;
  hasOutlets?: boolean | null;
  onClick: () => void;
};

export default function CafeTile({
  cafe,
  userLoc,
  variant = "tile",
  isRegular,
  isVisited,
  hasWifi,
  hasOutlets,
  onClick,
}: Props) {
  const dist = userLoc
    ? formatMiles(haversineKm(userLoc, { lat: cafe.lat, lng: cafe.lng }))
    : null;

  const imageAspect = variant === "hero" ? "aspect-[4/3]" : "aspect-[5/4]";

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-3xl overflow-hidden bg-surface border border-border shadow-[0_4px_16px_rgba(26,26,26,0.04)] hover:shadow-[0_8px_24px_rgba(26,26,26,0.08)] transition"
    >
      <div className={`relative ${imageAspect} bg-surface-muted overflow-hidden`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={cafe.hero_image}
          alt={cafe.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute top-3 left-3">
          {isRegular ? (
            <span className="text-[10px] px-2 py-1 rounded-full bg-amber-warm text-white font-semibold">
              ★ Regular
            </span>
          ) : isVisited ? (
            <span className="text-[10px] px-2 py-1 rounded-full bg-sage text-white font-semibold">
              Visited
            </span>
          ) : (
            <span className="text-[10px] px-2 py-1 rounded-full bg-rose text-white font-semibold">
              New
            </span>
          )}
        </div>
        <div className="absolute bottom-3 right-3">
          {cafe.open_now ? (
            <span className="text-[11px] px-2 py-1 rounded-full bg-background/95 text-foreground font-medium">
              Open now
            </span>
          ) : (
            <span className="text-[11px] px-2 py-1 rounded-full bg-background/95 text-rose font-medium">
              Closed
            </span>
          )}
        </div>
      </div>
      <div className={variant === "hero" ? "p-4" : "p-3.5"}>
        <div className="flex items-baseline justify-between gap-2">
          <span
            className={`font-semibold truncate ${variant === "hero" ? "text-lg" : ""}`}
          >
            {cafe.name}
          </span>
        </div>
        <p className="text-xs text-subtle mt-0.5 truncate">
          {cafe.neighborhood}
          {dist ? ` · ${dist}` : ""}
        </p>
        {(hasWifi !== null && hasWifi !== undefined) ||
        (hasOutlets !== null && hasOutlets !== undefined) ? (
          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
            <SignalPill label="Wifi" value={hasWifi ?? null} />
            <SignalPill label="Outlets" value={hasOutlets ?? null} />
          </div>
        ) : null}
      </div>
    </button>
  );
}

function SignalPill({ label, value }: { label: string; value: boolean | null }) {
  if (value === null) return null;
  return (
    <span
      className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
        value
          ? "bg-surface-muted text-foreground"
          : "bg-surface-muted text-subtle line-through"
      }`}
    >
      {label}
    </span>
  );
}
