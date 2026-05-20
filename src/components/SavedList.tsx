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
        {loading ? (
          <div className="text-sm text-subtle">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-surface/60 p-5 text-sm text-subtle space-y-2">
            <p>No saved places match your filters.</p>
            <p>
              Open the <strong>Map</strong> tab, search for a spot, and tap{" "}
              <strong>Log a visit</strong>.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map((r) => (
              <li key={r.cafe_id}>
                <Link
                  href={`/cafe/${r.google_place_id}`}
                  className="block rounded-3xl bg-surface border border-border p-4 shadow-[0_4px_16px_rgba(26,26,26,0.04)] hover:shadow-[0_8px_24px_rgba(26,26,26,0.08)] transition"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{r.name}</div>
                      {r.address && (
                        <div className="text-xs text-subtle truncate mt-0.5">
                          {r.address}
                        </div>
                      )}
                      <div className="text-xs text-subtle mt-1">
                        {r.visits} visit{r.visits === 1 ? "" : "s"} · last{" "}
                        {new Date(r.last_visited_at).toLocaleDateString()}
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
            ))}
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
