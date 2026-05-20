"use client";

type Props = {
  label: string;
  value: boolean | null;
  onChange: (v: boolean) => void;
};

export default function YesNoPicker({ label, value, onChange }: Props) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex gap-1.5">
        {[
          { v: true, l: "Yes" },
          { v: false, l: "No" },
        ].map(({ v, l }) => {
          const active = value === v;
          const yesStyle = v
            ? "bg-emerald-600 border-emerald-600 text-white"
            : "bg-zinc-700 border-zinc-700 text-white";
          return (
            <button
              key={l}
              type="button"
              onClick={() => onChange(v)}
              className={`h-9 px-4 rounded-full border text-sm font-medium transition ${
                active
                  ? yesStyle
                  : "bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300"
              }`}
              aria-pressed={active}
            >
              {l}
            </button>
          );
        })}
      </div>
    </div>
  );
}
