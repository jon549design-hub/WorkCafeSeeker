"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import RatingPicker from "./RatingPicker";
import YesNoPicker from "./YesNoPicker";
import TagChips from "./TagChips";
import PhotoUploader from "./PhotoUploader";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ensureSession } from "@/lib/supabase/session";
import { fetchPlaceDetails } from "@/lib/google/places";
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

export default function VisitForm({ placeId }: Props) {
  const router = useRouter();
  const [bools, setBools] = useState<Bools>({ wifi: null, outlets: null });
  const [ratings, setRatings] = useState<Ratings>({ seating: null, busy: null });
  const [tags, setTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      await ensureSession();
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase.from("tags").select("label").order("label");
      if (data) setAvailableTags(data.map((t) => t.label as string));
    })();
  }, []);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const session = await ensureSession();
      if (!session?.user) throw new Error("No session");
      const userId = session.user.id;
      const supabase = createSupabaseBrowserClient();

      const details = await fetchPlaceDetails(placeId);
      const { data: cafe, error: cafeErr } = await supabase
        .from("cafes")
        .upsert(
          {
            google_place_id: placeId,
            name: details.name,
            address: details.address,
            lat: details.lat,
            lng: details.lng,
            google_rating: details.rating,
            hours_json: { weekday_text: details.weekdayText },
            last_synced_at: new Date().toISOString(),
          },
          { onConflict: "google_place_id" },
        )
        .select("id")
        .single();
      if (cafeErr || !cafe) throw cafeErr ?? new Error("Cafe upsert failed");

      const { data: visit, error: visitErr } = await supabase
        .from("visits")
        .insert({
          user_id: userId,
          cafe_id: cafe.id,
          has_wifi: bools.wifi,
          has_outlets: bools.outlets,
          rating_seating: ratings.seating,
          rating_busy: ratings.busy,
          note_text: note || null,
        })
        .select("id")
        .single();
      if (visitErr || !visit) throw visitErr ?? new Error("Visit insert failed");

      if (tags.length) {
        const existing = await supabase
          .from("tags")
          .select("id, label")
          .in("label", tags);
        const have = new Map<string, string>(
          (existing.data ?? []).map((t) => [t.label as string, t.id as string]),
        );
        const toCreate = tags.filter((t) => !have.has(t));
        if (toCreate.length) {
          const created = await supabase
            .from("tags")
            .insert(toCreate.map((label) => ({ user_id: userId, label })))
            .select("id, label");
          for (const t of created.data ?? []) have.set(t.label as string, t.id as string);
        }
        const links = tags.map((label) => ({
          visit_id: visit.id,
          tag_id: have.get(label)!,
        }));
        if (links.length) await supabase.from("visit_tags").insert(links);
      }

      for (const file of photos) {
        const path = `${userId}/${visit.id}/${crypto.randomUUID()}.jpg`;
        const up = await supabase.storage
          .from("cafe-photos")
          .upload(path, file, { contentType: "image/jpeg", upsert: false });
        if (up.error) throw up.error;
        const row = await supabase.from("visit_photos").insert({
          visit_id: visit.id,
          user_id: userId,
          storage_path: path,
        });
        if (row.error) throw row.error;
      }

      router.replace(`/cafe/${placeId}`);
      router.refresh();
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Could not save visit");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col">
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
          <h1 className="font-semibold">Log a visit</h1>
        </div>
      </header>

      <div className="p-5 space-y-6 pb-24">
        <section>
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-subtle mb-2">
            Quick check
          </h2>
          <div className="rounded-2xl bg-surface border border-border p-3 divide-y divide-border">
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
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-subtle mb-2">
            Tags
          </h2>
          <TagChips available={availableTags} selected={tags} onChange={setTags} />
        </section>

        <section>
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-subtle mb-2">
            Photos
          </h2>
          <PhotoUploader files={photos} onChange={setPhotos} />
        </section>

        <section>
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-subtle mb-2">
            Notes
          </h2>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            placeholder="sat by the window, wifi solid, barista was chill…"
            className="w-full rounded-2xl border border-border bg-surface p-3 outline-none focus:ring-2 focus:ring-foreground/15"
          />
        </section>

        {error && <p className="text-sm text-rose">{error}</p>}

        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="w-full h-12 rounded-full bg-accent text-accent-fg font-medium disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save visit"}
        </button>
      </div>
    </div>
  );
}
