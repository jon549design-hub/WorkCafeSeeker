"use client";

import { useState } from "react";

type Props = {
  available: string[];
  selected: string[];
  onChange: (next: string[]) => void;
};

export default function TagChips({ available, selected, onChange }: Props) {
  const [draft, setDraft] = useState("");

  function toggle(tag: string) {
    if (selected.includes(tag)) onChange(selected.filter((t) => t !== tag));
    else onChange([...selected, tag]);
  }

  function addDraft() {
    const t = draft.trim();
    if (!t) return;
    if (!selected.includes(t)) onChange([...selected, t]);
    setDraft("");
  }

  const merged = Array.from(new Set([...available, ...selected]));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {merged.map((t) => {
          const active = selected.includes(t);
          return (
            <button
              key={t}
              type="button"
              onClick={() => toggle(t)}
              className={`text-sm px-3 py-1.5 rounded-full border transition ${
                active
                  ? "bg-zinc-900 border-zinc-900 text-white dark:bg-white dark:border-white dark:text-zinc-900"
                  : "bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700"
              }`}
            >
              {t}
            </button>
          );
        })}
      </div>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addDraft();
            }
          }}
          placeholder="Add a tag (e.g. morning spot)"
          className="flex-1 h-10 px-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <button
          type="button"
          onClick={addDraft}
          className="h-10 px-4 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-medium"
        >
          Add
        </button>
      </div>
    </div>
  );
}
