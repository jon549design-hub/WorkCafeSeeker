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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await ensureSession();
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("visits")
        .select("visited_at, cafe:cafes(id, google_place_id, name, address, lat, lng, google_rating)")
        .order("visited_at", { ascending: false })
        .limit(500);
      if (cancelled) return;
      if (!error && data) {
        const seen = new Set<string>();
        const list: CafeRow[] = [];
        for (const v of data as unknown as VisitRow[]) {
          const c = v.cafe;
          if (c && !seen.has(c.id)) {
            seen.add(c.id);
            list.push(c);
          }
        }
        setCafes(list);
      }
      setLoading(false);
      setRegularId(getRegular());
    })();

    getCurrentLocation().then((loc) => {
      if (!cancelled) setUserLoc(loc);
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

  const otherCafes = useMemo(() => {
    if (!regularId) return cafes;
    return cafes.filter((c) => c.google_place_id !== regularId);
  }, [cafes, regularId]);

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
        <section>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-subtle mb-3">
            Your regular
          </h2>
          {regularCafe ? (
            <CafeRowCard cafe={regularCafe} userLoc={userLoc} isRegular />
          ) : (
            <div className="rounded-3xl border border-dashed border-border bg-surface/60 p-4 text-sm text-subtle">
              No regular yet. Open the Map tab, tap a pin, and use the ★ in the
              cafe sheet to mark one.
            </div>
          )}
        </section>

        {otherCafes.length > 0 && (
          <section>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-subtle mb-3">
              Your visits
            </h2>
            <div className="space-y-3">
              {otherCafes.slice(0, 8).map((c) => (
                <CafeRowCard key={c.id} cafe={c} userLoc={userLoc} />
              ))}
            </div>
          </section>
        )}

        {!loading && cafes.length === 0 && !regularCafe && (
          <div className="rounded-3xl border border-dashed border-border bg-surface/60 p-6 text-sm text-subtle text-center space-y-2">
            <p className="text-base font-semibold text-foreground">
              No visits yet
            </p>
            <p>
              Open the Map tab, search for a cafe, and tap{" "}
              <strong>Log a visit</strong>. Your spots will show up here.
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
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-soft text-amber-warm font-semibold shrink-0">
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

function formatDateKicker(): string {
  const d = new Date();
  const weekday = d.toLocaleDateString("en-US", { weekday: "short" });
  const month = d.toLocaleDateString("en-US", { month: "short" });
  return `${weekday} · ${month} ${d.getDate()}`;
}
