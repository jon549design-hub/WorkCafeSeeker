"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { findDemoCafe } from "@/lib/demo";
import { listVisitsByPlaceId } from "@/lib/demoStore";
import {
  getCurrentLocation,
  haversineKm,
  formatMiles,
  type LatLng,
} from "@/lib/location";
import { getRegular, setRegular } from "@/lib/preferences";
import {
  BOOL_SIGNALS,
  RATING_SIGNALS,
  SIGNAL_LABELS,
  type BoolSignal,
  type RatingSignal,
} from "@/lib/types";

type Props = {
  placeId: string | null;
  onClose: () => void;
  userLoc?: LatLng | null;
};

export default function DemoCafeInfoSheet({ placeId, onClose, userLoc }: Props) {
  const [lastPlaceId, setLastPlaceId] = useState<string | null>(null);
  const [hoursOpen, setHoursOpen] = useState(false);
  const [isRegular, setIsRegular] = useState(false);
  const [fallbackLoc, setFallbackLoc] = useState<LatLng | null>(null);

  useEffect(() => {
    if (placeId) {
      setLastPlaceId(placeId);
      setHoursOpen(false);
      setIsRegular(getRegular() === placeId);
    }
  }, [placeId]);

  useEffect(() => {
    if (userLoc) return;
    getCurrentLocation().then(setFallbackLoc);
  }, [userLoc]);

  const effectiveLoc = userLoc ?? fallbackLoc;

  useEffect(() => {
    if (!placeId) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [placeId, onClose]);

  const cafe = lastPlaceId ? findDemoCafe(lastPlaceId) : null;
  const visits = useMemo(
    () => (lastPlaceId ? listVisitsByPlaceId(lastPlaceId) : []),
    [lastPlaceId, placeId],
  );

  const distance = useMemo(() => {
    if (!cafe || !effectiveLoc) return null;
    return haversineKm(effectiveLoc, { lat: cafe.lat, lng: cafe.lng });
  }, [cafe, effectiveLoc]);

  const latestBools = useMemo(() => {
    const out: Record<BoolSignal, boolean | null> = { wifi: null, outlets: null };
    if (!visits.length) return out;
    out.wifi = visits[0].has_wifi;
    out.outlets = visits[0].has_outlets;
    return out;
  }, [visits]);

  const averages = useMemo(() => {
    const out: Record<RatingSignal, number | null> = { seating: null, busy: null };
    if (!visits.length) return out;
    for (const s of RATING_SIGNALS) {
      const key = `rating_${s}` as const;
      const nums = visits
        .map((v) => v[key])
        .filter((n): n is number => typeof n === "number");
      out[s] = nums.length
        ? Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10
        : null;
    }
    return out;
  }, [visits]);

  const photoUrls = visits.flatMap((v) => v.photoDataUrls);
  const isOpen = placeId !== null;

  function toggleRegular() {
    if (!cafe) return;
    if (isRegular) {
      setRegular(null);
      setIsRegular(false);
    } else {
      setRegular(cafe.google_place_id);
      setIsRegular(true);
    }
  }

  return (
    <>
      <div
        aria-hidden
        onClick={onClose}
        className={`fixed inset-0 z-[900] bg-foreground/30 transition-opacity duration-200 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={cafe?.name ?? "Cafe details"}
        className={`fixed bottom-0 inset-x-0 z-[1000] max-h-[88vh] flex flex-col rounded-t-[2rem] bg-background shadow-[0_-12px_40px_rgba(26,26,26,0.18)] transition-transform duration-300 ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-12 h-1.5 rounded-full bg-border" />
        </div>

        {cafe && (
          <>
            <div className="px-5 pt-1 pb-3 shrink-0">
              <div className="aspect-[16/9] rounded-2xl overflow-hidden bg-surface-muted border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cafe.hero_image}
                  alt={cafe.name}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div className="px-5 pb-3 flex items-start justify-between gap-3 shrink-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-script italic text-3xl leading-tight truncate">
                    {cafe.name}
                  </h2>
                </div>
                {isRegular && (
                  <span
                    title="Your regular"
                    className="inline-flex mt-1 text-[10px] px-2 py-0.5 rounded-full bg-regular-soft text-regular font-semibold"
                  >
                    ★ Regular
                  </span>
                )}
                <p className="text-xs text-subtle mt-1.5 truncate">
                  {cafe.neighborhood} · {cafe.address}
                </p>
                <div className="mt-1.5 text-xs flex items-center gap-2 flex-wrap">
                  {cafe.open_now ? (
                    <span className="text-sage font-semibold">Open now</span>
                  ) : (
                    <span className="text-rose font-semibold">Closed</span>
                  )}
                  <span className="text-subtle">·</span>
                  <span className="text-subtle">
                    ★ {cafe.google_rating.toFixed(1)} ({cafe.user_rating_count})
                  </span>
                  {distance !== null && (
                    <>
                      <span className="text-subtle">·</span>
                      <span className="text-subtle">
                        {formatMiles(distance)} away
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={toggleRegular}
                  aria-label={isRegular ? "Remove as regular" : "Mark as regular"}
                  aria-pressed={isRegular}
                  className={`h-9 w-9 rounded-full text-base flex items-center justify-center transition ${
                    isRegular
                      ? "bg-regular text-white"
                      : "bg-surface-muted text-subtle"
                  }`}
                >
                  ★
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="h-9 w-9 rounded-full bg-surface-muted text-subtle text-base"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="overflow-y-auto px-5 pb-2 space-y-5">
              <section>
                <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-subtle mb-2">
                  Work signals
                </h3>
                {visits.length === 0 ? (
                  <p className="text-sm text-subtle">
                    No visits yet. Log your first one to start rating.
                  </p>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {BOOL_SIGNALS.map((s) => (
                      <div
                        key={s}
                        className="rounded-2xl bg-surface border border-border p-2 text-center"
                      >
                        <div className="text-[11px] text-subtle">
                          {SIGNAL_LABELS[s]}
                        </div>
                        <div className="mt-0.5">
                          <BoolPill value={latestBools[s]} />
                        </div>
                      </div>
                    ))}
                    {RATING_SIGNALS.map((s) => (
                      <div
                        key={s}
                        className="rounded-2xl bg-surface border border-border p-2 text-center"
                      >
                        <div className="text-[11px] text-subtle">
                          {SIGNAL_LABELS[s]}
                        </div>
                        <div className="text-base font-semibold">
                          {averages[s] !== null ? averages[s] : "—"}
                          {averages[s] !== null && (
                            <span className="text-xs text-subtle">/5</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {photoUrls.length > 0 && (
                <section>
                  <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-subtle mb-2">
                    My photos
                  </h3>
                  <div className="flex gap-2 overflow-x-auto -mx-5 px-5 pb-1">
                    {photoUrls.map((u, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={i}
                        src={u}
                        alt=""
                        className="h-28 w-28 rounded-2xl object-cover shrink-0 border border-border"
                      />
                    ))}
                  </div>
                </section>
              )}

              {visits.length > 0 && (
                <section>
                  <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-subtle mb-2">
                    Recent visits
                  </h3>
                  <div className="space-y-2.5">
                    {visits.slice(0, 3).map((v) => (
                      <div
                        key={v.id}
                        className="rounded-2xl bg-surface border border-border p-3"
                      >
                        <div className="text-xs text-subtle">
                          {new Date(v.visited_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </div>
                        {v.tags.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {v.tags.map((t) => (
                              <span
                                key={t}
                                className="text-[11px] px-2 py-0.5 rounded-full bg-surface-muted text-foreground"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                        {v.note_text && (
                          <p className="mt-1.5 text-sm">{v.note_text}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section>
                <button
                  type="button"
                  onClick={() => setHoursOpen((o) => !o)}
                  className="w-full flex items-center justify-between py-1 text-left"
                  aria-expanded={hoursOpen}
                >
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-subtle">
                    Hours
                  </span>
                  <span className="text-xs text-subtle flex items-center gap-1">
                    {cafe.open_now ? "Open now" : "Closed"}
                    <span className={`transition-transform ${hoursOpen ? "rotate-180" : ""}`}>
                      ▾
                    </span>
                  </span>
                </button>
                {hoursOpen && (
                  <ul className="mt-2 text-sm space-y-0.5">
                    {cafe.weekday_text.map((line) => {
                      const [day, ...rest] = line.split(": ");
                      return (
                        <li key={line} className="flex justify-between gap-3">
                          <span className="text-subtle">{day}</span>
                          <span>{rest.join(": ")}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </div>

            <div className="px-5 pt-3 pb-5 border-t border-border shrink-0 bg-background">
              <Link
                href={`/cafe/${cafe.google_place_id}/visit`}
                onClick={onClose}
                className="block w-full text-center h-12 leading-[3rem] rounded-full bg-accent text-accent-fg font-medium"
              >
                Log a visit
              </Link>
            </div>
          </>
        )}
      </div>
    </>
  );
}

function BoolPill({ value }: { value: boolean | null }) {
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
