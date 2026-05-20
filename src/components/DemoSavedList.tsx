"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DEMO_CAFES, findDemoCafe } from "@/lib/demo";
import { listVisits, type DemoVisit } from "@/lib/demoStore";
import {
  getCurrentLocation,
  haversineKm,
  formatMiles,
  type LatLng,
} from "@/lib/location";
import { getRegular, subscribeRegular } from "@/lib/preferences";
import DemoBanner from "./DemoBanner";
import FilterChips, { DEFAULT_FILTERS, type SignalFilters } from "./FilterChips";

type Row = {
  google_place_id: string;
  name: string;
  address: string;
  neighborhood: string;
  visits: number;
  has_wifi: boolean | null;
  has_outlets: boolean | null;
  avg_seating: number | null;
  last_visited_at: string;
  open_now: boolean;
  lat: number;
  lng: number;
};

export default function DemoSavedList() {
  const [visits, setVisits] = useState<DemoVisit[]>([]);
  const [filters, setFilters] = useState<SignalFilters>(DEFAULT_FILTERS);
  const [userLoc, setUserLoc] = useState<LatLng | null>(null);
  const [regularId, setRegularId] = useState<string | null>(null);

  useEffect(() => {
    setVisits(listVisits());
    setRegularId(getRegular());
    const unsub = subscribeRegular(() => setRegularId(getRegular()));
    getCurrentLocation().then(setUserLoc);
    return unsub;
  }, []);

  const rows: Row[] = useMemo(() => {
    const byCafe = new Map<string, Row>();
    for (const v of visits) {
      const cafe = findDemoCafe(v.placeId);
      if (!cafe) continue;
      const existing = byCafe.get(v.placeId);
      if (!existing) {
        byCafe.set(v.placeId, {
          google_place_id: v.placeId,
          name: cafe.name,
          address: cafe.address,
          neighborhood: cafe.neighborhood,
          visits: 1,
          has_wifi: v.has_wifi,
          has_outlets: v.has_outlets,
          avg_seating: v.rating_seating,
          last_visited_at: v.visited_at,
          open_now: cafe.open_now,
          lat: cafe.lat,
          lng: cafe.lng,
        });
      } else {
        existing.visits += 1;
        existing.avg_seating = avg(existing.avg_seating, v.rating_seating);
      }
    }
    return [...byCafe.values()];
  }, [visits]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (filters.open_now && !r.open_now) return false;
      if (filters.has_wifi && r.has_wifi !== true) return false;
      if (filters.has_outlets && r.has_outlets !== true) return false;
      return true;
    });
  }, [rows, filters]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (a.google_place_id === regularId) return -1;
      if (b.google_place_id === regularId) return 1;
      if (userLoc) {
        const da = haversineKm(userLoc, { lat: a.lat, lng: a.lng });
        const db = haversineKm(userLoc, { lat: b.lat, lng: b.lng });
        return da - db;
      }
      return (
        new Date(b.last_visited_at).getTime() -
        new Date(a.last_visited_at).getTime()
      );
    });
  }, [filtered, regularId, userLoc]);

  return (
    <div className="flex-1 flex flex-col">
      <DemoBanner />
      <header className="px-5 pt-6 pb-3">
        <p className="text-[11px] uppercase tracking-[0.18em] text-subtle">
          My list
        </p>
        <h1 className="font-script italic text-5xl leading-tight mt-1">
          Saved places
        </h1>
        <div className="mt-4">
          <FilterChips value={filters} onChange={setFilters} />
        </div>
      </header>

      <div className="px-5 pb-28">
        {sorted.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-surface/60 p-5 text-sm text-subtle space-y-2">
            <p>No saved places match your filters.</p>
            <p>
              Try the Map tab, tap a pin (e.g.{" "}
              <Link
                href={`/cafe/${DEMO_CAFES[0].google_place_id}`}
                className="text-foreground underline"
              >
                {DEMO_CAFES[0].name}
              </Link>
              ), then tap <strong>Log a visit</strong>.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {sorted.map((r) => {
              const isRegular = r.google_place_id === regularId;
              const dist = userLoc
                ? formatMiles(haversineKm(userLoc, { lat: r.lat, lng: r.lng }))
                : null;
              return (
                <li key={r.google_place_id}>
                  <Link
                    href={`/cafe/${r.google_place_id}`}
                    className="block rounded-3xl bg-surface border border-border p-4 shadow-[0_4px_16px_rgba(26,26,26,0.04)] hover:shadow-[0_8px_24px_rgba(26,26,26,0.08)] transition"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold truncate">{r.name}</span>
                          {isRegular && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-soft text-amber-warm font-semibold shrink-0">
                              ★ Regular
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-subtle truncate mt-0.5">
                          {r.neighborhood} · {r.address}
                        </div>
                        <div className="text-xs text-subtle mt-1 flex items-center gap-2 flex-wrap">
                          {dist && <span>{dist}</span>}
                          {dist && <span>·</span>}
                          <span>
                            {r.visits} visit{r.visits === 1 ? "" : "s"}
                          </span>
                          <span>·</span>
                          <span>
                            last {new Date(r.last_visited_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="text-right text-xs space-y-0.5 shrink-0">
                        <BoolRow label="Wifi" value={r.has_wifi} />
                        <BoolRow label="Outlets" value={r.has_outlets} />
                        <div className="text-subtle">
                          Seating {r.avg_seating ?? "—"}
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function BoolRow({ label, value }: { label: string; value: boolean | null }) {
  const text =
    value === true ? (
      <span className="text-sage font-semibold">Yes</span>
    ) : value === false ? (
      <span className="text-subtle">No</span>
    ) : (
      <span className="text-subtle">—</span>
    );
  return (
    <div className="text-subtle">
      {label} {text}
    </div>
  );
}

function avg(prev: number | null, next: number | null) {
  if (prev === null) return next;
  if (next === null) return prev;
  return Math.round(((prev + next) / 2) * 10) / 10;
}
