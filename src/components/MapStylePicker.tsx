"use client";

import { MAP_STYLES, type MapStyleId } from "@/lib/mapStyles";

type Props = {
  value: MapStyleId;
  onChange: (id: MapStyleId) => void;
};

// Click to cycle through styles: Streets → Clean → Dark → Streets.
function nextStyle(current: MapStyleId): MapStyleId {
  const order = MAP_STYLES.map((s) => s.id);
  const i = order.indexOf(current);
  return order[(i + 1) % order.length];
}

export default function MapStylePicker({ value, onChange }: Props) {
  const current = MAP_STYLES.find((s) => s.id === value) ?? MAP_STYLES[0];
  const upcoming = MAP_STYLES.find((s) => s.id === nextStyle(value)) ?? MAP_STYLES[0];

  return (
    <button
      type="button"
      onClick={() => onChange(nextStyle(value))}
      aria-label={`Map style: ${current.label}. Tap to switch to ${upcoming.label}.`}
      title={`Switch to ${upcoming.label}`}
      className="flex items-center gap-2 h-9 px-3 rounded-full bg-background/95 border border-border shadow-sm text-xs font-medium"
    >
      <span
        className="inline-block w-3.5 h-3.5 rounded-sm border border-border/70"
        style={{ background: current.swatch }}
        aria-hidden
      />
      {current.label}
    </button>
  );
}
