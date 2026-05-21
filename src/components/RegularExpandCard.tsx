"use client";

import { useState } from "react";
import Link from "next/link";
import { formatMiles, haversineKm, type LatLng } from "@/lib/location";
import type { DemoCafe } from "@/lib/demo";
import { listVisitsByPlaceId } from "@/lib/demoStore";
import {
  BOOL_SIGNALS,
  RATING_SIGNALS,
  SIGNAL_LABELS,
  type BoolSignal,
  type RatingSignal,
} from "@/lib/types";

type Props = {
  cafe: DemoCafe;
  userLoc: LatLng | null;
  hasWifi: boolean | null;
  hasOutlets: boolean | null;
  onSeeMore: () => void;
};

export default function RegularExpandCard({
  cafe,
  userLoc,
  hasWifi,
  hasOutlets,
  onSeeMore,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  const dist = userLoc
    ? formatMiles(haversineKm(userLoc, { lat: cafe.lat, lng: cafe.lng }))
    : null;

  const visits = expanded ? listVisitsByPlaceId(cafe.google_place_id) : [];
  const latestBools: Record<BoolSignal, boolean | null> = {
    wifi: visits[0]?.has_wifi ?? hasWifi,
    outlets: visits[0]?.has_outlets ?? hasOutlets,
  };
  const averages: Record<RatingSignal, number | null> = {
    seating: avgRating(visits, "rating_seating"),
    busy: avgRating(visits, "rating_busy"),
  };
  const lastVisit = visits[0];
  const lastPhotos = lastVisit?.photoDataUrls ?? [];

  return (
    <div className="rounded-3xl bg-surface border border-border shadow-[0_4px_16px_rgba(26,26,26,0.04)]">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        className="w-full text-left p-4 flex items-center justify-between gap-3"
      >
        <div className="min-w-0">
          <div className="font-semibold truncate">{cafe.name}</div>
          <p className="text-xs text-subtle mt-0.5 truncate">
            {cafe.neighborhood}
            {dist ? ` · ${dist}` : ""}
          </p>
        </div>
        <span
          className={`text-subtle text-lg shrink-0 -mr-1 transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
          aria-hidden
        >
          ▾
        </span>
      </button>

      {expanded && (
        <div className="border-t border-border px-4 pt-3 pb-4 space-y-4">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-regular-soft text-regular font-semibold">
              ★ Regular
            </span>
            {cafe.open_now ? (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-sage-soft text-sage font-medium">
                Open now
              </span>
            ) : (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-soft text-rose font-medium">
                Closed
              </span>
            )}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {BOOL_SIGNALS.map((s) => (
              <Stat key={s} label={SIGNAL_LABELS[s]}>
                <BoolPillLarge value={latestBools[s]} />
              </Stat>
            ))}
            {RATING_SIGNALS.map((s) => (
              <Stat key={s} label={SIGNAL_LABELS[s]}>
                <span className="text-base font-semibold">
                  {averages[s] !== null ? averages[s] : "—"}
                  {averages[s] !== null && (
                    <span className="text-xs text-subtle">/5</span>
                  )}
                </span>
              </Stat>
            ))}
          </div>

          {lastPhotos.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto -mx-4 px-4">
              {lastPhotos.slice(0, 6).map((u, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={u}
                  alt=""
                  className="h-20 w-20 rounded-xl object-cover shrink-0 border border-border"
                />
              ))}
            </div>
          )}

          {lastVisit?.note_text && (
            <div className="text-sm">
              <div className="text-[11px] uppercase tracking-[0.15em] text-subtle mb-1">
                Last visit
              </div>
              {lastVisit.tags.length > 0 && (
                <div className="mb-1.5 flex flex-wrap gap-1">
                  {lastVisit.tags.map((t) => (
                    <span
                      key={t}
                      className="text-[11px] px-2 py-0.5 rounded-full bg-surface-muted text-foreground"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
              <p className="text-foreground/90">{lastVisit.note_text}</p>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Link
              href={`/cafe/${cafe.google_place_id}/visit`}
              className="flex-1 text-center h-11 leading-[2.75rem] rounded-full bg-accent text-accent-fg text-sm font-medium"
            >
              Log a visit
            </Link>
            <button
              type="button"
              onClick={onSeeMore}
              className="h-11 px-4 rounded-full bg-surface-muted text-foreground text-sm font-medium"
            >
              See more
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-background border border-border p-2 text-center">
      <div className="text-[11px] text-subtle">{label}</div>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}

function BoolPillLarge({ value }: { value: boolean | null }) {
  if (value === null) {
    return <span className="text-base font-semibold text-subtle">—</span>;
  }
  if (value) {
    return (
      <span className="inline-flex items-center justify-center h-6 px-2 rounded-full bg-sage-soft text-sage text-xs font-semibold">
        Yes
      </span>
    );
  }
  return (
    <span className="inline-flex items-center justify-center h-6 px-2 rounded-full bg-rose-soft text-rose text-xs font-semibold">
      No
    </span>
  );
}

function avgRating(
  visits: ReturnType<typeof listVisitsByPlaceId>,
  key: "rating_seating" | "rating_busy",
): number | null {
  const nums = visits.map((v) => v[key]).filter((n): n is number => typeof n === "number");
  if (!nums.length) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}
