"use client";

import { useState } from "react";

export default function DemoBanner() {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return (
    <div className="bg-surface-muted border-b border-border text-foreground/80 text-xs px-4 py-2 flex items-center justify-between gap-3">
      <span>
        <strong className="font-semibold">Demo mode.</strong> Fake SF cafes, no
        cloud setup. Your visits save in this browser only.
      </span>
      <button
        onClick={() => setOpen(false)}
        aria-label="Dismiss"
        className="shrink-0 text-subtle"
      >
        ×
      </button>
    </div>
  );
}
