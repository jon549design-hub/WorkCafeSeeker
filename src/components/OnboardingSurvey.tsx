"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  type Adventurous,
  type DistanceTier,
  type MustHave,
  type SessionLength,
  MUST_HAVE_LABELS,
  setPreferences,
} from "@/lib/preferences";

const MUST_HAVES: MustHave[] = ["wifi", "outlets", "quiet", "seating"];

const DISTANCE_OPTIONS: { value: DistanceTier; label: string; sub: string }[] = [
  { value: "walking", label: "Walking distance", sub: "≤ 0.6 mi from me" },
  { value: "short", label: "Quick trip", sub: "≤ 1.8 mi — bike or transit ok" },
  { value: "anywhere", label: "Anywhere worth it", sub: "I'll go for the right spot" },
];

const SESSION_OPTIONS: { value: SessionLength; label: string; sub: string }[] = [
  { value: "quick", label: "Quick stop", sub: "≤ 1 hour, in and out" },
  { value: "session", label: "Solid session", sub: "2–4 hours, get real work done" },
  { value: "all_day", label: "All day", sub: "I'll camp out from morning to evening" },
];

const ADVENTUROUS_OPTIONS: { value: Adventurous; label: string; sub: string }[] = [
  { value: "regular", label: "I have a regular", sub: "Just remind me of my usual" },
  { value: "mostly_regular", label: "Mostly my regular", sub: "Open to the occasional new spot" },
  { value: "mix", label: "Mix it up", sub: "Recommend new places — I get bored" },
];

export default function OnboardingSurvey() {
  const router = useRouter();
  const [mustHaves, setMustHaves] = useState<MustHave[]>(["wifi"]);
  const [distance, setDistance] = useState<DistanceTier>("short");
  const [session, setSession] = useState<SessionLength>("session");
  const [adventurous, setAdventurous] = useState<Adventurous>("mostly_regular");
  const [saving, setSaving] = useState(false);

  function toggleMust(m: MustHave) {
    setMustHaves((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m],
    );
  }

  function save() {
    setSaving(true);
    setPreferences({
      mustHaves,
      distance,
      session,
      adventurous,
      completedAt: new Date().toISOString(),
    });
    router.replace("/");
  }

  return (
    <div className="flex-1 flex flex-col">
      <header className="px-5 pt-7 pb-3">
        <p className="text-[11px] uppercase tracking-[0.18em] text-subtle">
          Personalize your recs
        </p>
        <h1 className="font-script italic text-5xl leading-tight mt-1">
          A few quick questions
        </h1>
        <p className="text-sm text-subtle mt-2">
          We&rsquo;ll use these to rank places for you. ~30 seconds — change them
          anytime.
        </p>
      </header>

      <div className="px-5 pb-36 space-y-7">
        <section>
          <h2 className="text-sm font-semibold mb-1">
            What&rsquo;s non-negotiable?
          </h2>
          <p className="text-xs text-subtle mb-3">
            Pick anything that&rsquo;s a deal-breaker.
          </p>
          <div className="flex flex-wrap gap-2">
            {MUST_HAVES.map((m) => {
              const active = mustHaves.includes(m);
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => toggleMust(m)}
                  aria-pressed={active}
                  className={`text-sm px-4 py-2 rounded-full border transition ${
                    active
                      ? "bg-accent border-accent text-accent-fg"
                      : "bg-surface border-border text-foreground"
                  }`}
                >
                  {MUST_HAVE_LABELS[m]}
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold mb-3">
            How far are you willing to go?
          </h2>
          <RadioCards
            options={DISTANCE_OPTIONS}
            value={distance}
            onChange={setDistance}
          />
        </section>

        <section>
          <h2 className="text-sm font-semibold mb-3">How long do you stay?</h2>
          <RadioCards
            options={SESSION_OPTIONS}
            value={session}
            onChange={setSession}
          />
        </section>

        <section>
          <h2 className="text-sm font-semibold mb-3">Adventurous?</h2>
          <RadioCards
            options={ADVENTUROUS_OPTIONS}
            value={adventurous}
            onChange={setAdventurous}
          />
        </section>
      </div>

      <div className="fixed bottom-16 inset-x-0 px-5 pb-4 pt-3 bg-gradient-to-t from-background via-background to-transparent z-30">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => router.replace("/")}
            className="h-12 px-5 rounded-full text-sm font-medium text-subtle"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="flex-1 h-12 rounded-full bg-accent text-accent-fg font-medium disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save & continue"}
          </button>
        </div>
      </div>
    </div>
  );
}

function RadioCards<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; sub: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="space-y-2">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            className={`w-full text-left rounded-2xl border p-3.5 transition ${
              active
                ? "border-foreground bg-surface"
                : "border-border bg-surface"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">{opt.label}</div>
                <div className="text-xs text-subtle mt-0.5">{opt.sub}</div>
              </div>
              <span
                className={`h-5 w-5 rounded-full border-2 shrink-0 ${
                  active ? "border-foreground bg-foreground" : "border-border"
                }`}
              >
                {active && (
                  <span className="block w-2 h-2 rounded-full bg-background mx-auto mt-[5px]" />
                )}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
