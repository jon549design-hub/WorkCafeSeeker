"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ensureSession } from "@/lib/supabase/session";
import { fetchPlaceDetails, type PlaceDetails } from "@/lib/google/places";
import type { Visit } from "@/lib/types";
import {
  BOOL_SIGNALS,
  RATING_SIGNALS,
  SIGNAL_LABELS,
  type BoolSignal,
  type RatingSignal,
} from "@/lib/types";

type Props = { placeId: string };

export default function CafeDetail({ placeId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [place, setPlace] = useState<PlaceDetails | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        await ensureSession();
        const supabase = createSupabaseBrowserClient();

        const details = await fetchPlaceDetails(placeId);
        if (cancelled) return;
        setPlace(details);

        const { data: cafe } = await supabase
          .from("cafes")
          .select("id")
          .eq("google_place_id", placeId)
          .maybeSingle();

        if (cafe?.id) {
          const { data: vs } = await supabase
            .from("visits")
            .select("*")
            .eq("cafe_id", cafe.id)
            .order("visited_at", { ascending: false });
          if (vs) setVisits(vs as Visit[]);

          const { data: photos } = await supabase
            .from("visit_photos")
            .select("storage_path, visit_id")
            .in("visit_id", (vs ?? []).map((v) => v.id));
          if (photos && photos.length) {
            const urls = photos.map((p) => {
              const { data } = supabase.storage
                .from("cafe-photos")
                .getPublicUrl(p.storage_path);
              return data.publicUrl;
            });
            setPhotoUrls(urls);
          }
        }
      } catch (e) {
        console.error(e);
        setError("Couldn't load this cafe. Check your API keys and try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [placeId]);

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
      const col = `rating_${s}` as const;
      const nums = visits
        .map((v) => v[col] as number | null)
        .filter((n): n is number => typeof n === "number");
      out[s] = nums.length
        ? Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10
        : null;
    }
    return out;
  }, [visits]);

  if (loading) {
    return <div className="p-6 text-zinc-500">Loading…</div>;
  }
  if (error || !place) {
    return <div className="p-6 text-red-600">{error ?? "Not found."}</div>;
  }

  return (
    <div className="flex-1 flex flex-col">
      <header className="sticky top-0 z-10 bg-white/95 dark:bg-zinc-950/95 backdrop-blur border-b border-zinc-200 dark:border-zinc-800">
        <div className="px-4 h-14 flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
          >
            ← Back
          </button>
          <h1 className="font-semibold truncate">{place.name}</h1>
        </div>
      </header>

      <div className="p-4 space-y-6 pb-24">
        <div>
          <div className="text-sm text-zinc-500">{place.address}</div>
          <div className="mt-1 text-sm">
            {place.isOpen === true && <span className="text-emerald-600 font-medium">Open now</span>}
            {place.isOpen === false && <span className="text-red-600 font-medium">Closed now</span>}
            {place.rating !== null && (
              <span className="ml-2 text-zinc-500">
                ★ {place.rating.toFixed(1)} ({place.userRatingCount ?? 0})
              </span>
            )}
          </div>
        </div>

        <Link
          href={`/cafe/${placeId}/visit`}
          className="block w-full text-center h-12 leading-[3rem] rounded-full bg-emerald-600 text-white font-medium"
        >
          Log a visit
        </Link>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* MINE */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 mb-3">
              Mine
            </h2>
            {visits.length === 0 ? (
              <p className="text-sm text-zinc-500">No visits yet. Log your first one above.</p>
            ) : (
              <>
                <dl className="space-y-1.5">
                  {BOOL_SIGNALS.map((s) => (
                    <div key={s} className="flex justify-between text-sm">
                      <dt className="text-zinc-500">{SIGNAL_LABELS[s]}</dt>
                      <dd className="font-medium">
                        {latestBools[s] === true
                          ? "Yes"
                          : latestBools[s] === false
                            ? "No"
                            : "—"}
                      </dd>
                    </div>
                  ))}
                  {RATING_SIGNALS.map((s) => (
                    <div key={s} className="flex justify-between text-sm">
                      <dt className="text-zinc-500">{SIGNAL_LABELS[s]}</dt>
                      <dd className="font-medium">
                        {averages[s] !== null ? `${averages[s]} / 5` : "—"}
                      </dd>
                    </div>
                  ))}
                </dl>

                {photoUrls.length > 0 && (
                  <div className="mt-4 grid grid-cols-3 gap-1.5">
                    {photoUrls.slice(0, 6).map((u) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={u} src={u} alt="" className="aspect-square rounded-md object-cover" />
                    ))}
                  </div>
                )}

                <div className="mt-4 space-y-3">
                  {visits.slice(0, 3).map((v) => (
                    <div key={v.id} className="text-sm">
                      <div className="text-xs text-zinc-500">
                        {new Date(v.visited_at).toLocaleString()}
                      </div>
                      {v.note_text && <p className="mt-0.5">{v.note_text}</p>}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* GOOGLE */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 mb-3">
              Google
            </h2>
            {place.weekdayText.length > 0 ? (
              <ul className="text-sm space-y-1">
                {place.weekdayText.map((line) => (
                  <li key={line} className="flex justify-between gap-3">
                    <span className="text-zinc-500">{line.split(": ")[0]}</span>
                    <span>{line.split(": ").slice(1).join(": ")}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-zinc-500">No hours available.</p>
            )}

            {place.photos.length > 0 && (
              <div className="mt-4 grid grid-cols-3 gap-1.5">
                {place.photos.slice(0, 6).map((u) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={u} src={u} alt="" className="aspect-square rounded-md object-cover" />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
