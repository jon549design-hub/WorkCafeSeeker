"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import RatingPicker from "./RatingPicker";
import YesNoPicker from "./YesNoPicker";
import TagChips from "./TagChips";
import PhotoUploader from "./PhotoUploader";
import DemoBanner from "./DemoBanner";
import { findDemoCafe } from "@/lib/demo";
import { listAllTags, saveVisit } from "@/lib/demoStore";
import {
  BOOL_SIGNALS,
  RATING_SIGNALS,
  SIGNAL_LABELS,
  type BoolSignal,
  type RatingSignal,
} from "@/lib/types";

type Props = { placeId: string };

type Bools = Record<BoolSignal, boolean | null>;
type Ratings = Record<RatingSignal, number | null>;

export default function DemoVisitForm({ placeId }: Props) {
  const router = useRouter();
  const cafe = findDemoCafe(placeId);

  const [bools, setBools] = useState<Bools>({ wifi: null, outlets: null });
  const [ratings, setRatings] = useState<Ratings>({ seating: null, busy: null });
  const [tags, setTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAvailableTags(listAllTags());
  }, []);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const dataUrls: string[] = [];
      for (const f of photos) {
        dataUrls.push(await fileToDataURL(f));
      }
      saveVisit({
        placeId,
        has_wifi: bools.wifi,
        has_outlets: bools.outlets,
        rating_seating: ratings.seating,
        rating_busy: ratings.busy,
        note_text: note || null,
        tags,
        photoDataUrls: dataUrls,
      });
      router.replace(`/cafe/${placeId}`);
      router.refresh();
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  if (!cafe) {
    return <div className="p-6 text-zinc-500">Cafe not found in demo data.</div>;
  }

  return (
    <div className="flex-1 flex flex-col">
      <DemoBanner />
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="px-4 h-14 flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Go back"
            className="h-9 w-9 rounded-full bg-surface-muted text-foreground flex items-center justify-center text-base shrink-0"
          >
            ←
          </button>
          <div className="min-w-0">
            <h1 className="font-semibold truncate">Log a visit</h1>
            <p className="text-xs text-subtle truncate">{cafe.name}</p>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-6 pb-24">
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 mb-2">
            Quick check
          </h2>
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-3 divide-y divide-zinc-100 dark:divide-zinc-800">
            {BOOL_SIGNALS.map((s) => (
              <YesNoPicker
                key={s}
                label={SIGNAL_LABELS[s]}
                value={bools[s]}
                onChange={(v) => setBools((prev) => ({ ...prev, [s]: v }))}
              />
            ))}
            {RATING_SIGNALS.map((s) => (
              <RatingPicker
                key={s}
                label={SIGNAL_LABELS[s]}
                value={ratings[s]}
                onChange={(v) => setRatings((prev) => ({ ...prev, [s]: v }))}
              />
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 mb-2">
            Tags
          </h2>
          <TagChips available={availableTags} selected={tags} onChange={setTags} />
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 mb-2">
            Photos
          </h2>
          <PhotoUploader files={photos} onChange={setPhotos} />
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 mb-2">
            Notes
          </h2>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            placeholder="sat by the window, wifi solid, barista was chill…"
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-3 outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </section>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="w-full h-12 rounded-full bg-emerald-600 text-white font-medium disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save visit"}
        </button>
      </div>
    </div>
  );
}

function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}
