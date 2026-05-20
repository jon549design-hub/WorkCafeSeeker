"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ensureSession } from "@/lib/supabase/session";
import FilterChips, { EMPTY_FILTERS, type SignalFilters } from "./FilterChips";

type Row = {
  cafe_id: string;
  google_place_id: string;
  name: string;
  address: string | null;
  hours_json: { weekday_text?: string[] } | null;
  visits: number;
  has_wifi: boolean | null;
  has_outlets: boolean | null;
  avg_seating: number | null;
  last_visited_at: string;
};

type RawVisitRow = {
  visited_at: string;
  has_wifi: boolean | null;
  has_outlets: boolean | null;
  rating_seating: number | null;
  cafe: {
    id: string;
    google_place_id: string;
    name: string;
    address: string | null;
    hours_json: Row["hours_json"];
  } | null;
};

export default function SavedList() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<SignalFilters>(EMPTY_FILTERS);

  useEffect(() => {
    (async () => {
      await ensureSession();
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("visits")
        .select(
          "visited_at, has_wifi, has_outlets, rating_seating, cafe:cafes(id, google_place_id, name, address, hours_json)",
        )
        .order("visited_at", { ascending: false })
        .limit(500);
      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }
      const byCafe = new Map<string, Row>();
      // data is newest-first → first row encountered for each cafe is the latest visit.
      for (const v of (data ?? []) as unknown as RawVisitRow[]) {
        const c = v.cafe;
        if (!c) continue;
        const existing = byCafe.get(c.id);
        if (!existing) {
          byCafe.set(c.id, {
            cafe_id: c.id,
            google_place_id: c.google_place_id,
            name: c.name,
            address: c.address,
            hours_json: c.hours_json,
            visits: 1,
            has_wifi: v.has_wifi,
            has_outlets: v.has_outlets,
            avg_seating: v.rating_seating,
            last_visited_at: v.visited_at,
          });
        } else {
          existing.visits += 1;
          existing.avg_seating = avg(existing.avg_seating, v.rating_seating);
        }
      }
      setRows([...byCafe.values()]);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (filters.has_wifi && r.has_wifi !== true) return false;
      if (filters.has_outlets && r.has_outlets !== true) return false;
      // "Open now" would need a live parse of hours_json — out of scope for MVP.
      return true;
    });
  }, [rows, filters]);

  return (
    <div className="flex-1 flex flex-col">
      <header className="sticky top-0 z-10 bg-white/95 dark:bg-zinc-950/95 backdrop-blur border-b border-zinc-200 dark:border-zinc-800">
        <div className="px-4 h-14 flex items-center">
          <h1 className="font-semibold">Saved cafes</h1>
        </div>
        <FilterChips value={filters} onChange={setFilters} className="px-4 pb-3" />
      </header>

      {loading ? (
        <div className="p-6 text-sm text-zinc-500">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="p-6 text-sm text-zinc-500">
          No saved cafes yet. Find one on the map and log your first visit.
        </div>
      ) : (
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {filtered.map((r) => (
            <li key={r.cafe_id}>
              <Link
                href={`/cafe/${r.google_place_id}`}
                className="flex items-start gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{r.name}</div>
                  {r.address && (
                    <div className="text-xs text-zinc-500 truncate">{r.address}</div>
                  )}
                  <div className="text-xs text-zinc-500 mt-1">
                    {r.visits} visit{r.visits === 1 ? "" : "s"} · last{" "}
                    {new Date(r.last_visited_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-right text-xs space-y-0.5 shrink-0">
                  <BoolRow label="Wifi" value={r.has_wifi} />
                  <BoolRow label="Outlets" value={r.has_outlets} />
                  <div className="text-zinc-500">
                    Seating {r.avg_seating ?? "—"}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BoolRow({ label, value }: { label: string; value: boolean | null }) {
  const text =
    value === true ? (
      <span className="text-emerald-600 font-medium">Yes</span>
    ) : value === false ? (
      <span className="text-zinc-500">No</span>
    ) : (
      <span className="text-zinc-500">—</span>
    );
  return (
    <div className="text-zinc-500">
      {label} {text}
    </div>
  );
}

function avg(prev: number | null, next: number | null) {
  if (prev === null) return next;
  if (next === null) return prev;
  return Math.round(((prev + next) / 2) * 10) / 10;
}
