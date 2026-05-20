"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DEMO_CAFES, findDemoCafe, type DemoCafe } from "@/lib/demo";
import { listVisits } from "@/lib/demoStore";
import {
  getCurrentLocation,
  haversineKm,
  type LatLng,
} from "@/lib/location";
import {
  DISTANCE_LIMITS_MI,
  getPreferences,
  getRegular,
  subscribePreferences,
  subscribeRegular,
  type UserPreferences,
} from "@/lib/preferences";
import DemoBanner from "./DemoBanner";
import DemoCafeInfoSheet from "./DemoCafeInfoSheet";
import CafeTile from "./CafeTile";
import RegularExpandCard from "./RegularExpandCard";

type Snapshot = {
  has_wifi: boolean | null;
  has_outlets: boolean | null;
  rating_seating: number | null;
  rating_busy: number | null;
  lastVisitedAt: string;
};

const KM_PER_MI = 1.60934;

export default function DemoDashboard() {
  const [userLoc, setUserLoc] = useState<LatLng | null>(null);
  const [regularId, setRegularId] = useState<string | null>(null);
  const [snapshots, setSnapshots] = useState<Record<string, Snapshot>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);

  useEffect(() => {
    rebuildSnapshots();
    setRegularId(getRegular());
    setPrefs(getPreferences());
    const unsubR = subscribeRegular(() => setRegularId(getRegular()));
    const unsubP = subscribePreferences(() => setPrefs(getPreferences()));
    getCurrentLocation().then(setUserLoc);
    return () => {
      unsubR();
      unsubP();
    };
  }, []);

  function rebuildSnapshots() {
    const visits = listVisits();
    const map: Record<string, Snapshot> = {};
    for (const v of visits) {
      if (!map[v.placeId]) {
        map[v.placeId] = {
          has_wifi: v.has_wifi,
          has_outlets: v.has_outlets,
          rating_seating: v.rating_seating,
          rating_busy: v.rating_busy,
          lastVisitedAt: v.visited_at,
        };
      }
    }
    setSnapshots(map);
  }

  const regularCafe = regularId ? findDemoCafe(regularId) : null;
  const visitedIds = useMemo(() => new Set(Object.keys(snapshots)), [snapshots]);

  const radiusMiles = prefs
    ? DISTANCE_LIMITS_MI[prefs.distance]
    : Number.POSITIVE_INFINITY;

  function passesMustHaves(c: DemoCafe): boolean {
    if (!prefs) return true;
    const snap = snapshots[c.google_place_id];
    if (prefs.mustHaves.includes("wifi") && snap?.has_wifi === false) return false;
    if (prefs.mustHaves.includes("outlets") && snap?.has_outlets === false) return false;
    if (prefs.mustHaves.includes("quiet") && snap && snap.rating_busy !== null && snap.rating_busy >= 4)
      return false;
    if (prefs.mustHaves.includes("seating") && snap && snap.rating_seating !== null && snap.rating_seating < 3)
      return false;
    return true;
  }

  const openNearby = useMemo(() => {
    const list = DEMO_CAFES.filter((c) => c.open_now);
    const withDistance = list.map((c) => ({
      c,
      km: userLoc ? haversineKm(userLoc, { lat: c.lat, lng: c.lng }) : null,
    }));
    return withDistance
      .filter(({ km }) => km === null || km / KM_PER_MI <= radiusMiles)
      .sort((a, b) => (a.km ?? 0) - (b.km ?? 0))
      .map(({ c }) => c)
      .filter(passesMustHaves);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLoc, radiusMiles, prefs, snapshots]);

  // Always pick a single "try something new" spot — the closest unvisited match.
  const newToTry = useMemo(() => {
    return openNearby
      .filter(
        (c) =>
          !visitedIds.has(c.google_place_id) && c.google_place_id !== regularId,
      )
      .slice(0, 1);
  }, [openNearby, visitedIds, regularId]);

  const nearbyCarousel = useMemo(() => {
    const newIds = new Set(newToTry.map((c) => c.google_place_id));
    return openNearby
      .filter(
        (c) => c.google_place_id !== regularId && !newIds.has(c.google_place_id),
      )
      .slice(0, 6);
  }, [openNearby, regularId, newToTry]);

  function handleSheetClose() {
    setSelectedId(null);
    rebuildSnapshots();
  }

  return (
    <div className="flex-1 flex flex-col">
      <DemoBanner />
      <header className="px-5 pt-6 pb-4">
        <p className="text-[11px] uppercase tracking-[0.18em] text-subtle">
          {formatDateKicker()}
        </p>
        <h1 className="font-script italic text-5xl leading-tight mt-1">
          A good spot.
        </h1>
      </header>

      <div className="px-5 pb-6 space-y-7">
        {!prefs && (
          <Link
            href="/onboarding"
            className="block rounded-3xl bg-surface border border-border p-4 shadow-[0_4px_16px_rgba(26,26,26,0.04)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">
                  Get smarter recs — 30 seconds
                </div>
                <p className="text-xs text-subtle mt-1">
                  Tell us what matters (wifi, distance, vibe) and we&rsquo;ll
                  rank places for you.
                </p>
              </div>
              <span className="text-subtle text-lg shrink-0">›</span>
            </div>
          </Link>
        )}

        {prefs && (
          <div className="text-xs text-subtle -mt-3">
            Tuned for {labelPrefs(prefs)} ·{" "}
            <Link
              href="/onboarding"
              className="text-foreground underline underline-offset-2"
            >
              change preference
            </Link>
          </div>
        )}

        {/* Quick reference up top — expands in place */}
        <section>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-subtle mb-3">
            Your regular
          </h2>
          {regularCafe ? (
            <RegularExpandCard
              cafe={regularCafe}
              userLoc={userLoc}
              hasWifi={snapshots[regularCafe.google_place_id]?.has_wifi ?? null}
              hasOutlets={snapshots[regularCafe.google_place_id]?.has_outlets ?? null}
              onSeeMore={() => setSelectedId(regularCafe.google_place_id)}
            />
          ) : (
            <div className="rounded-3xl border border-dashed border-border bg-surface/60 p-4 text-sm text-subtle">
              No regular yet. Open a cafe and tap the ★ to set one.
            </div>
          )}
        </section>

        {/* Primary visual — big hero card */}
        {newToTry.length > 0 && (
          <section>
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-subtle">
                Try something new
              </h2>
              <span className="text-[11px] text-subtle italic">
                Bored of your regular?
              </span>
            </div>
            <div className="space-y-3">
              {newToTry.map((c) => (
                <CafeTile
                  key={c.google_place_id}
                  cafe={c}
                  userLoc={userLoc}
                  variant="hero"
                  isVisited={false}
                  hasWifi={null}
                  hasOutlets={null}
                  onClick={() => setSelectedId(c.google_place_id)}
                />
              ))}
            </div>
          </section>
        )}

        {/* TERTIARY — Nearby open right now (carousel) */}
        {nearbyCarousel.length > 0 && (
          <section>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-subtle mb-3">
              Nearby open right now
            </h2>
            <div className="-mx-5 px-5 overflow-x-auto pb-2">
              <div className="flex gap-3 snap-x snap-mandatory">
                {nearbyCarousel.map((c) => (
                  <div
                    key={c.google_place_id}
                    className="snap-start shrink-0 w-[70%]"
                  >
                    <CafeTile
                      cafe={c}
                      userLoc={userLoc}
                      isVisited={visitedIds.has(c.google_place_id)}
                      hasWifi={snapshots[c.google_place_id]?.has_wifi ?? null}
                      hasOutlets={snapshots[c.google_place_id]?.has_outlets ?? null}
                      onClick={() => setSelectedId(c.google_place_id)}
                    />
                  </div>
                ))}
                <div className="shrink-0 w-1" />
              </div>
            </div>
          </section>
        )}

        <Link
          href="/map"
          className="block w-full text-center h-12 leading-[3rem] rounded-full bg-accent text-accent-fg font-medium tracking-wide"
        >
          Explore the map
        </Link>
      </div>

      <DemoCafeInfoSheet
        placeId={selectedId}
        onClose={handleSheetClose}
        userLoc={userLoc}
      />
    </div>
  );
}

function formatDateKicker(): string {
  // e.g. "Mon · May 19"
  const d = new Date();
  const weekday = d.toLocaleDateString("en-US", { weekday: "short" });
  const month = d.toLocaleDateString("en-US", { month: "short" });
  return `${weekday} · ${month} ${d.getDate()}`;
}

function labelPrefs(p: UserPreferences): string {
  const parts: string[] = [];
  if (p.mustHaves.length) {
    parts.push(p.mustHaves.map((m) => m).join(" + "));
  }
  const distLabel =
    p.distance === "walking"
      ? "walking distance"
      : p.distance === "short"
        ? "≤ 1.8 mi"
        : "any distance";
  parts.push(distLabel);
  return parts.join(", ");
}
