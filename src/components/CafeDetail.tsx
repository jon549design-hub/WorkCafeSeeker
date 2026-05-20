"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ensureSession } from "@/lib/supabase/session";
import { fetchPlaceDetails, type PlaceDetails } from "@/lib/google/places";
import {
  BOOL_SIGNALS,
  RATING_SIGNALS,
  SIGNAL_LABELS,
  type BoolSignal,
  type RatingSignal,
  type Visit,
} from "@/lib/types";
import { getRegular, setRegular } from "@/lib/preferences";

type Props = { placeId: string };

export default function CafeDetail({ placeId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [place, setPlace] = useState<PlaceDetails | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [hoursOpen, setHoursOpen] = useState(false);
  const [isRegular, setIsRegular] = useState(false);

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

        setIsRegular(getRegular() === placeId);
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
    const out: Record<RatingSignal, number | null> = {
      seating: null,
      busy: null,
    };
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

  function toggleRegular() {
    if (!place) return;
    if (isRegular) {
      setRegular(null);
      setIsRegular(false);
    } else {
      setRegular(placeId);
      setIsRegular(true);
    }
  }

  if (loading) {
    return <div className="p-6 text-subtle">Loading…</div>;
  }
  if (error || !place) {
    return <div className="p-6 text-rose">{error ?? "Not found."}</div>;
  }

  const hasHero = place.photos.length > 0;

  return (
    <div className="flex-1 flex flex-col">
      {hasHero ? (
        <div className="relative aspect-[16/10] bg-surface-muted overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={place.photos[0]}
            alt={place.name}
            className="w-full h-full object-cover"
          />
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Go back"
            className="absolute top-4 left-4 h-10 w-10 rounded-full bg-background/95 backdrop-blur flex items-center justify-center text-base shadow-md"
          >
            ←
          </button>
          <button
            type="button"
            onClick={toggleRegular}
            aria-label={isRegular ? "Remove as regular" : "Mark as regular"}
            aria-pressed={isRegular}
            className={`absolute top-4 right-4 h-10 w-10 rounded-full backdrop-blur flex items-center justify-center text-base shadow-md ${
              isRegular
                ? "bg-amber-warm text-white"
                : "bg-background/95 text-foreground"
            }`}
          >
            ★
          </button>
        </div>
      ) : (
        <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
          <div className="px-4 h-14 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="Go back"
              className="h-9 w-9 rounded-full bg-surface-muted text-foreground flex items-center justify-center text-base shrink-0"
            >
              ←
            </button>
            <button
              type="button"
              onClick={toggleRegular}
              aria-label={isRegular ? "Remove as regular" : "Mark as regular"}
              aria-pressed={isRegular}
              className={`h-9 w-9 rounded-full text-base flex items-center justify-center shrink-0 ${
                isRegular
                  ? "bg-amber-warm text-white"
                  : "bg-surface-muted text-subtle"
              }`}
            >
              ★
            </button>
          </div>
        </header>
      )}

      <div className="flex-1 px-5 pt-5 pb-24 space-y-6">
        <div>
          {place.primaryTypeLabel && (
            <p className="text-[11px] uppercase tracking-[0.18em] text-subtle">
              {place.primaryTypeLabel}
            </p>
          )}
          <h1 className="font-script italic text-4xl leading-tight mt-1">
            {place.name}
          </h1>
          {place.address && (
            <p className="text-sm text-subtle mt-1.5">{place.address}</p>
          )}
          <div className="mt-2 text-sm flex items-center gap-2 flex-wrap">
            {place.isOpen === true && (
              <span className="text-sage font-semibold">Open now</span>
            )}
            {place.isOpen === false && (
              <span className="text-rose font-semibold">Closed</span>
            )}
            {place.rating !== null && (
              <>
                {place.isOpen !== null && <span className="text-subtle">·</span>}
                <span className="text-subtle">
                  ★ {place.rating.toFixed(1)} ({place.userRatingCount ?? 0})
                </span>
              </>
            )}
            {isRegular && (
              <>
                <span className="text-subtle">·</span>
                <span className="inline-flex text-[10px] px-2 py-0.5 rounded-full bg-amber-soft text-amber-warm font-semibold">
                  ★ Regular
                </span>
              </>
            )}
          </div>
        </div>

        <Link
          href={`/cafe/${placeId}/visit`}
          className="block w-full text-center h-12 leading-[3rem] rounded-full bg-accent text-accent-fg font-medium tracking-wide"
        >
          Log a visit
        </Link>

        {visits.length > 0 && (
          <section>
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-subtle mb-2">
              Work signals
            </h3>
            <div className="grid grid-cols-4 gap-2">
              {BOOL_SIGNALS.map((s) => (
                <Stat key={s} label={SIGNAL_LABELS[s]}>
                  <BoolPill value={latestBools[s]} />
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
          </section>
        )}

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
                  {v.note_text && (
                    <p className="mt-1.5 text-sm">{v.note_text}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {place.weekdayText.length > 0 && (
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
                {place.isOpen === true
                  ? "Open now"
                  : place.isOpen === false
                    ? "Closed"
                    : "—"}
                <span
                  className={`transition-transform ${
                    hoursOpen ? "rotate-180" : ""
                  }`}
                >
                  ▾
                </span>
              </span>
            </button>
            {hoursOpen && (
              <ul className="mt-2 text-sm space-y-0.5">
                {place.weekdayText.map((line) => {
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
        )}

        {place.photos.length > 1 && (
          <section>
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-subtle mb-2">
              From Google
            </h3>
            <div className="flex gap-2 overflow-x-auto -mx-5 px-5 pb-1">
              {place.photos.slice(1).map((u, i) => (
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
      </div>
    </div>
  );
}

function Stat({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-surface border border-border p-2 text-center">
      <div className="text-[11px] text-subtle">{label}</div>
      <div className="mt-0.5">{children}</div>
    </div>
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
