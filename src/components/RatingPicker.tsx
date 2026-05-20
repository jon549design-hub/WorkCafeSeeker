"use client";

type Props = {
  label: string;
  value: number | null;
  onChange: (v: number) => void;
};

export default function RatingPicker({ label, value, onChange }: Props) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => {
          const active = value !== null && n <= value;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className={`h-9 w-9 rounded-full border text-sm font-medium transition ${
                active
                  ? "bg-emerald-600 border-emerald-600 text-white"
                  : "bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300"
              }`}
              aria-label={`${label} rating ${n}`}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}
