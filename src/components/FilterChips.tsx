"use client";

export type SignalFilters = {
  open_now: boolean;
  has_wifi: boolean;
  has_outlets: boolean;
};

export const EMPTY_FILTERS: SignalFilters = {
  open_now: false,
  has_wifi: false,
  has_outlets: false,
};

export const DEFAULT_FILTERS: SignalFilters = {
  open_now: true,
  has_wifi: false,
  has_outlets: false,
};

type Props = {
  value: SignalFilters;
  onChange: (next: SignalFilters) => void;
  className?: string;
};

export default function FilterChips({ value, onChange, className }: Props) {
  const items: { key: keyof SignalFilters; label: string }[] = [
    { key: "open_now", label: "Open now" },
    { key: "has_wifi", label: "Has wifi" },
    { key: "has_outlets", label: "Has outlets" },
  ];

  return (
    <div className={`flex gap-2 overflow-x-auto ${className ?? ""}`}>
      {items.map(({ key, label }) => {
        const active = value[key];
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange({ ...value, [key]: !active })}
            className={`shrink-0 text-sm px-3.5 py-1.5 rounded-full border transition ${
              active
                ? "bg-accent border-accent text-accent-fg"
                : "bg-surface border-border text-foreground"
            }`}
            aria-pressed={active}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
