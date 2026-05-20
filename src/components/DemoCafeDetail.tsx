"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { findDemoCafe } from "@/lib/demo";
import { listVisitsByPlaceId } from "@/lib/demoStore";
import {
  BOOL_SIGNALS,
  RATING_SIGNALS,
  SIGNAL_LABELS,
  type BoolSignal,
  type RatingSignal,
} from "@/lib/types";
import DemoBanner from "./DemoBanner";

type Props = { placeId: string };

export default function DemoCafeDetail({ placeId }: Props) {
  const router = useRouter();
  const cafe = findDemoCafe(placeId);
  const visits = useMemo(() => listVisitsByPlaceId(placeId), [placeId]);

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

  if (!cafe) {
    return <div className="p-6 text-zinc-500">Cafe not found in demo data.</div>;
  }

  return (
    <div className="flex-1 flex flex-col">
      <DemoBanner />
      <header className="sticky top-0 z-10 bg-white/95 dark:bg-zinc-950/95 backdrop-blur border-b border-zinc-200 dark:border-zinc-800">
        <div className="px-4 h-14 flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
          >
            ← Back
          </button>
          <h1 className="font-semibold truncate">{cafe.name}</h1>
        </div>
      </header>

      <div className="p-4 space-y-6 pb-24">
        <div>
          <div className="text-sm text-zinc-500">
            {cafe.neighborhood} · {cafe.address}
          </div>
          <div className="mt-1 text-sm">
            {cafe.open_now ? (
              <span className="text-emerald-600 font-medium">Open now</span>
            ) : (
              <span className="text-red-600 font-medium">Closed now</span>
            )}
            <span className="ml-2 text-zinc-500">
              ★ {cafe.google_rating.toFixed(1)} ({cafe.user_rating_count})
            </span>
          </div>
        </div>

        <Link
          href={`/cafe/${placeId}/visit`}
          className="block w-full text-center h-12 leading-[3rem] rounded-full bg-emerald-600 text-white font-medium"
        >
          Log a visit
        </Link>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 mb-3">
              Mine
            </h2>
            {visits.length === 0 ? (
              <p className="text-sm text-zinc-500">
                No visits yet. Log your first one above.
              </p>
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
                    {photoUrls.slice(0, 6).map((u, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={i}
                        src={u}
                        alt=""
                        className="aspect-square rounded-md object-cover"
                      />
                    ))}
                  </div>
                )}

                <div className="mt-4 space-y-3">
                  {visits.slice(0, 3).map((v) => (
                    <div key={v.id} className="text-sm">
                      <div className="text-xs text-zinc-500">
                        {new Date(v.visited_at).toLocaleString()}
                      </div>
                      {v.tags.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {v.tags.map((t) => (
                            <span
                              key={t}
                              className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                      {v.note_text && <p className="mt-1">{v.note_text}</p>}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 mb-3">
              Google
            </h2>
            <ul className="text-sm space-y-1">
              {cafe.weekday_text.map((line) => (
                <li key={line} className="flex justify-between gap-3">
                  <span className="text-zinc-500">{line.split(": ")[0]}</span>
                  <span>{line.split(": ").slice(1).join(": ")}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
