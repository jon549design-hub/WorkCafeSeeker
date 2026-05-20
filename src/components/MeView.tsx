"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ensureSession } from "@/lib/supabase/session";
import {
  clearPreferences,
  getPreferences,
  getRegular,
  setRegular,
  subscribePreferences,
  subscribeRegular,
  MUST_HAVE_LABELS,
  type UserPreferences,
} from "@/lib/preferences";

type Stats = {
  totalVisits: number;
  uniqueCafes: number;
  tags: string[];
  regularCafeName: string | null;
};

export default function MeView() {
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await ensureSession();
      await loadStats();
      if (cancelled) return;
      setPrefs(getPreferences());
      setLoading(false);
    })();
    const unsubP = subscribePreferences(() => setPrefs(getPreferences()));
    const unsubR = subscribeRegular(() => loadStats());
    return () => {
      cancelled = true;
      unsubP();
      unsubR();
    };
  }, []);

  async function loadStats() {
    const supabase = createSupabaseBrowserClient();
    const regularId = getRegular();

    const { data: visits } = await supabase
      .from("visits")
      .select("cafe_id, cafe:cafes(google_place_id, name)")
      .limit(1000);

    let regularName: string | null = null;
    const uniqueCafes = new Set<string>();
    if (visits) {
      for (const v of visits as unknown as {
        cafe: { google_place_id: string; name: string } | null;
      }[]) {
        if (!v.cafe) continue;
        uniqueCafes.add(v.cafe.google_place_id);
        if (v.cafe.google_place_id === regularId) regularName = v.cafe.name;
      }
    }

    const { data: tags } = await supabase
      .from("tags")
      .select("label")
      .order("label");

    setStats({
      totalVisits: visits?.length ?? 0,
      uniqueCafes: uniqueCafes.size,
      tags: (tags ?? []).map((t) => t.label as string),
      regularCafeName: regularName,
    });
  }

  async function doReset() {
    setResetting(true);
    try {
      clearPreferences();
      setRegular(null);
      window.localStorage.removeItem("wcs.demo.visits.v2");
      window.localStorage.removeItem("wcs.demo.visits.v1");
      window.localStorage.removeItem("wcs.userLocation.v1");
      window.localStorage.removeItem("wcs.mapStyleId.v1");
      // Note: Supabase data (visits, photos, tags) is intentionally NOT
      // wiped — that's the user's history, kept until they actively delete.
      setResetOpen(false);
      setPrefs(null);
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col">
      <header className="px-5 pt-6 pb-3">
        <p className="text-[11px] uppercase tracking-[0.18em] text-subtle">
          Settings
        </p>
        <h1 className="font-script italic text-5xl leading-tight mt-1">Me</h1>
      </header>

      <div className="px-5 pb-28 space-y-7">
        {/* Preferences */}
        <section>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-subtle mb-3">
            Recommendation preferences
          </h2>
          {prefs ? (
            <div className="rounded-3xl bg-surface border border-border p-4 space-y-3 shadow-[0_4px_16px_rgba(26,26,26,0.04)]">
              <PrefRow
                label="Must-haves"
                value={
                  prefs.mustHaves.length === 0
                    ? "None"
                    : prefs.mustHaves.map((m) => MUST_HAVE_LABELS[m]).join(", ")
                }
              />
              <PrefRow label="Distance" value={distanceLabel(prefs.distance)} />
              <PrefRow label="Session" value={sessionLabel(prefs.session)} />
              <PrefRow
                label="Adventurous"
                value={adventurousLabel(prefs.adventurous)}
              />
              <div className="pt-2">
                <Link
                  href="/onboarding"
                  className="block w-full text-center h-11 leading-[2.75rem] rounded-full bg-accent text-accent-fg text-sm font-medium"
                >
                  Change preferences
                </Link>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-border bg-surface/60 p-4 text-sm text-subtle space-y-3">
              <p>You haven&rsquo;t set any preferences yet.</p>
              <Link
                href="/onboarding"
                className="inline-block h-10 leading-[2.5rem] px-5 rounded-full bg-accent text-accent-fg text-sm font-medium"
              >
                Take the 30-second survey
              </Link>
            </div>
          )}
        </section>

        {/* Stats */}
        <section>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-subtle mb-3">
            Your stats
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Visits" value={loading ? "…" : String(stats?.totalVisits ?? 0)} />
            <StatCard label="Places" value={loading ? "…" : String(stats?.uniqueCafes ?? 0)} />
          </div>
          {stats?.regularCafeName && (
            <div className="mt-3 rounded-3xl bg-surface border border-border p-4 shadow-[0_4px_16px_rgba(26,26,26,0.04)]">
              <p className="text-[11px] uppercase tracking-[0.15em] text-subtle">
                Your regular
              </p>
              <p className="text-sm font-semibold mt-0.5">
                ★ {stats.regularCafeName}
              </p>
            </div>
          )}
        </section>

        {/* Tags */}
        <section>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-subtle mb-3">
            Your tags
          </h2>
          {stats && stats.tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {stats.tags.map((t) => (
                <span
                  key={t}
                  className="text-sm px-3 py-1.5 rounded-full bg-surface border border-border"
                >
                  {t}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-subtle">
              No tags yet. Add them when you log a visit (e.g., &ldquo;morning
              spot&rdquo;, &ldquo;deep work&rdquo;).
            </p>
          )}
        </section>

        {/* Danger zone */}
        <section>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-subtle mb-3">
            Reset
          </h2>
          {resetOpen ? (
            <div className="rounded-3xl bg-surface border border-border p-4 space-y-3 shadow-[0_4px_16px_rgba(26,26,26,0.04)]">
              <p className="text-sm">
                This clears your preferences, regular cafe, and saved location
                from this device. <strong>Your visits and photos stay</strong> —
                they live on the server and follow your account.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setResetOpen(false)}
                  className="flex-1 h-11 rounded-full bg-surface-muted text-foreground text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={doReset}
                  disabled={resetting}
                  className="flex-1 h-11 rounded-full bg-rose text-white text-sm font-medium disabled:opacity-60"
                >
                  {resetting ? "Resetting…" : "Reset settings"}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setResetOpen(true)}
              className="text-sm text-subtle underline underline-offset-2"
            >
              Reset settings on this device
            </button>
          )}
        </section>
      </div>
    </div>
  );
}

function PrefRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-subtle text-[11px] uppercase tracking-[0.15em]">
        {label}
      </span>
      <span className="text-right">{value}</span>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl bg-surface border border-border p-4 shadow-[0_4px_16px_rgba(26,26,26,0.04)]">
      <p className="text-[11px] uppercase tracking-[0.15em] text-subtle">
        {label}
      </p>
      <p className="font-script italic text-4xl leading-none mt-1">{value}</p>
    </div>
  );
}

function distanceLabel(d: UserPreferences["distance"]): string {
  if (d === "walking") return "Walking distance (≤ 0.6 mi)";
  if (d === "short") return "Quick trip (≤ 1.8 mi)";
  return "Anywhere worth it";
}

function sessionLabel(s: UserPreferences["session"]): string {
  if (s === "quick") return "Quick stop (≤ 1 hr)";
  if (s === "session") return "Solid session (2–4 hrs)";
  return "All day";
}

function adventurousLabel(a: UserPreferences["adventurous"]): string {
  if (a === "regular") return "Stick to my regular";
  if (a === "mostly_regular") return "Mostly my regular";
  return "Mix it up";
}
