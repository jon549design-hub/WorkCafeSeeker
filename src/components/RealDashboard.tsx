"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ensureSession } from "@/lib/supabase/session";
import {
  getCurrentLocation,
  haversineKm,
  formatMiles,
  type LatLng,
} from "@/lib/location";
import { getRegular, subscribeRegular } from "@/lib/preferences";
import { fetchNearbyPlaces, type NearbyPlace } from "@/lib/google/places";

type CafeRow = {
  id: string;
  google_place_id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  google_rating: number | null;
};

type VisitRow = {
  visited_at: string;
  cafe: CafeRow | null;
};

export default function RealDashboard() {
  const [userLoc, setUserLoc] = useState<LatLng | null>(null);
  const [regularId, setRegularId] = useState<string | null>(null);
  const [cafes, setCafes] = useState<CafeRow[]>([]);
  const [nearby, setNearby] = useState<NearbyPlace[]>([]);
  const [loadingVisits, setLoadingVisits] = useState(true);
  const [loadingNearby, setLoadingNearby] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      await ensureSession();
      const supabase = createSupabaseBrowserClient();
      const currentRegular = getRegular();
      setRegularId(currentRegular);

      // Fetch all the user's visited cafes (deduped).
      const { data, error } = await supabase
        .from("visits")
        .select(
          "visited_at, cafe:cafes(id, google_place_id, name, address, lat, lng, google_rating)",
        )
        .order("visited_at", { ascending: false })
        .limit(500);
      if (cancelled) return;
      const list: CafeRow[] = [];
      if (!error && data) {
        const seen = new Set<string>();
        for (const v of data as unknown as VisitRow[]) {
          const c = v.cafe;
          if (c && !seen.has(c.id)) {
            seen.add(c.id);
            list.push(c);
          }
        }
      }

      // If the user's marked-regular cafe isn't already in the visits
      // list (they marked it as a regular without logging a visit yet),
      // fetch it directly from the cafes table so it still shows up on
      // home as "Your regular".
      if (
        currentRegular &&
        !list.some((c) => c.google_place_id === currentRegular)
      ) {
        const { data: regularRow } = await supabase
          .from("cafes")
          .select("id, google_place_id, name, address, lat, lng, google_rating")
          .eq("google_place_id", currentRegular)
          .maybeSingle();
        if (!cancelled && regularRow) {
          list.unshift(regularRow as CafeRow);
        }
      }

      if (!cancelled) setCafes(list);
      setLoadingVisits(false);
    })();

    getCurrentLocation().then(async (loc) => {
      if (cancelled) return;
      setUserLoc(loc);
      // Fetch nearby work spots from Google Places.
      try {
        const results = await fetchNearbyPlaces(loc, 1500, 10);
        if (!cancelled) setNearby(results);
      } catch (e) {
        console.warn("Could not fetch nearby places:", e);
      } finally {
        if (!cancelled) setLoadingNearby(false);
      }
    });

    const unsub = subscribeRegular(() => setRegularId(getRegular()));
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  const regularCafe = useMemo(
    () => cafes.find((c) => c.google_place_id === regularId) ?? null,
    [cafes, regularId],
  );

  const visitedIds = useMemo(
    () => new Set(cafes.map((c) => c.google_place_id)),
    [cafes],
  );

  // Try something new = a single closest open nearby cafe that the user
  // hasn't visited and isn't their regular. Must have a photo because the
  // card is a big hero — a placeholder looks broken at that size.
  const newToTry = useMemo(() => {
    return nearby.find(
      (p) =>
        p.isOpen !== false &&
        !visitedIds.has(p.id) &&
        p.id !== regularId &&
        p.photo !== null,
    );
  }, [nearby, visitedIds, regularId]);

  // Nearby carousel = open spots near you, excluding the regular + the
  // try-something-new pick (so they're not duplicated). Photo required so
  // the carousel doesn't have visually empty tiles mixed in.
  const nearbyCarousel = useMemo(() => {
    return nearby
      .filter(
        (p) =>
          p.isOpen !== false &&
          p.id !== regularId &&
          p.id !== newToTry?.id &&
          p.photo !== null,
      )
      .slice(0, 6);
  }, [nearby, regularId, newToTry]);

  const hasAnyContent =
    regularCafe || cafes.length > 0 || nearby.length > 0;

  return (
    <div className="flex-1 flex flex-col">
      <header className="px-5 pt-6 pb-4">
        <p className="text-[11px] uppercase tracking-[0.18em] text-subtle">
          {formatDateKicker()}
        </p>
        <h1 className="font-script italic text-5xl leading-tight mt-1">
          A good spot.
        </h1>
      </header>

      <div className="px-5 pb-6 space-y-7">
        {/* Your regular */}
        <section>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-subtle mb-3">
            Your regular
          </h2>
          {regularCafe ? (
            <CafeRowCard cafe={regularCafe} userLoc={userLoc} isRegular />
          ) : (
            <div className="rounded-3xl border border-dashed border-border bg-surface/60 p-4 text-sm text-subtle">
              No regular yet. Open a cafe and tap the ★ on the detail page to mark one.
            </div>
          )}
        </section>

        {/* Try something new — single hero card */}
        {newToTry && (
          <section>
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-subtle">
                Try something new
              </h2>
              <span className="text-[11px] text-subtle italic">
                Bored of your regular?
              </span>
            </div>
            <NearbyHeroCard place={newToTry} userLoc={userLoc} />
          </section>
        )}

        {/* Your visits */}
        {cafes.filter((c) => c.google_place_id !== regularId).length > 0 && (
          <section>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-subtle mb-3">
              Your visits
            </h2>
            <div className="space-y-3">
              {cafes
                .filter((c) => c.google_place_id !== regularId)
                .slice(0, 5)
                .map((c) => (
                  <CafeRowCard key={c.id} cafe={c} userLoc={userLoc} />
                ))}
            </div>
          </section>
        )}

        {/* Nearby open right now — horizontal carousel */}
        {nearbyCarousel.length > 0 && (
          <section>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-subtle mb-3">
              Nearby open right now
            </h2>
            <div className="-mx-5 px-5 overflow-x-auto pb-2">
              <div className="flex gap-3 snap-x snap-mandatory">
                {nearbyCarousel.map((p) => (
                  <div
                    key={p.id}
                    className="snap-start shrink-0 w-[70%]"
                  >
                    <NearbyTile place={p} userLoc={userLoc} isVisited={visitedIds.has(p.id)} />
                  </div>
                ))}
                <div className="shrink-0 w-1" />
              </div>
            </div>
          </section>
        )}

        {!loadingVisits && !loadingNearby && !hasAnyContent && (
          <div className="rounded-3xl border border-dashed border-border bg-surface/60 p-6 text-sm text-subtle text-center space-y-2">
            <p className="text-base font-semibold text-foreground">
              Nothing nearby yet
            </p>
            <p>
              Allow location access in your browser to see suggestions, or open
              the Map tab to search for a specific spot.
            </p>
          </div>
        )}

        <Link
          href="/map"
          className="block w-full text-center h-12 leading-[3rem] rounded-full bg-accent text-accent-fg font-medium tracking-wide"
        >
          Explore the map
        </Link>
      </div>
    </div>
  );
}

function CafeRowCard({
  cafe,
  userLoc,
  isRegular,
}: {
  cafe: CafeRow;
  userLoc: LatLng | null;
  isRegular?: boolean;
}) {
  const dist = userLoc
    ? formatMiles(haversineKm(userLoc, { lat: cafe.lat, lng: cafe.lng }))
    : null;
  return (
    <Link
      href={`/cafe/${cafe.google_place_id}`}
      className="block rounded-3xl bg-surface border border-border p-4 shadow-[0_4px_16px_rgba(26,26,26,0.04)] hover:shadow-[0_8px_24px_rgba(26,26,26,0.08)] transition"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold truncate">{cafe.name}</span>
            {isRegular && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-regular-soft text-regular font-semibold shrink-0">
                ★ Regular
              </span>
            )}
          </div>
          {cafe.address && (
            <p className="text-xs text-subtle mt-0.5 truncate">
              {cafe.address}
              {dist ? ` · ${dist}` : ""}
            </p>
          )}
        </div>
        <span className="text-subtle text-lg shrink-0 -mr-1">›</span>
      </div>
    </Link>
  );
}

function NearbyHeroCard({
  place,
  userLoc,
}: {
  place: NearbyPlace;
  userLoc: LatLng | null;
}) {
  const dist = userLoc
    ? formatMiles(haversineKm(userLoc, { lat: place.lat, lng: place.lng }))
    : null;
  return (
    <Link
      href={`/cafe/${place.id}`}
      className="block rounded-3xl overflow-hidden bg-surface border border-border shadow-[0_4px_16px_rgba(26,26,26,0.04)] hover:shadow-[0_8px_24px_rgba(26,26,26,0.08)] transition"
    >
      {place.photo && (
        <div className="relative aspect-[4/3] bg-surface-muted overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={place.photo}
            alt={place.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-3 left-3">
            <span className="text-[10px] px-2 py-1 rounded-full bg-new text-white font-semibold">
              New
            </span>
          </div>
          <div className="absolute bottom-3 right-3">
            <span className="text-[11px] px-2 py-1 rounded-full bg-background/95 text-foreground font-medium">
              {place.isOpen === false ? "Closed" : "Open now"}
            </span>
          </div>
        </div>
      )}
      <div className="p-4">
        {place.primaryTypeLabel && (
          <p className="text-[11px] uppercase tracking-[0.15em] text-subtle">
            {place.primaryTypeLabel}
          </p>
        )}
        <div className="font-semibold text-lg truncate mt-0.5">{place.name}</div>
        <p className="text-xs text-subtle mt-0.5 truncate">
          {dist ? `${dist} · ` : ""}★ {place.rating?.toFixed(1) ?? "—"}
        </p>
      </div>
    </Link>
  );
}

function NearbyTile({
  place,
  userLoc,
  isVisited,
}: {
  place: NearbyPlace;
  userLoc: LatLng | null;
  isVisited?: boolean;
}) {
  const dist = userLoc
    ? formatMiles(haversineKm(userLoc, { lat: place.lat, lng: place.lng }))
    : null;
  return (
    <Link
      href={`/cafe/${place.id}`}
      className="block rounded-3xl overflow-hidden bg-surface border border-border shadow-[0_4px_16px_rgba(26,26,26,0.04)] hover:shadow-[0_8px_24px_rgba(26,26,26,0.08)] transition"
    >
      <div className="relative aspect-[5/4] bg-surface-muted overflow-hidden">
        {place.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={place.photo}
            alt={place.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-subtle text-3xl">
            ☕
          </div>
        )}
        <div className="absolute top-3 left-3">
          <span
            className={`text-[10px] px-2 py-1 rounded-full font-semibold ${
              isVisited ? "bg-visited text-white" : "bg-new text-white"
            }`}
          >
            {isVisited ? "Visited" : "New"}
          </span>
        </div>
        <div className="absolute bottom-3 right-3">
          <span className="text-[11px] px-2 py-1 rounded-full bg-background/95 text-foreground font-medium">
            {place.isOpen === false ? "Closed" : "Open now"}
          </span>
        </div>
      </div>
      <div className="p-3.5">
        <div className="font-semibold truncate">{place.name}</div>
        <p className="text-xs text-subtle mt-0.5 truncate">
          {place.primaryTypeLabel ? `${place.primaryTypeLabel} · ` : ""}
          {dist ?? ""}
        </p>
      </div>
    </Link>
  );
}

function formatDateKicker(): string {
  const d = new Date();
  const weekday = d.toLocaleDateString("en-US", { weekday: "short" });
  const month = d.toLocaleDateString("en-US", { month: "short" });
  return `${weekday} · ${month} ${d.getDate()}`;
}
