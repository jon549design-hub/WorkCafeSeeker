"use client";

import { useRef, useState } from "react";
import imageCompression from "browser-image-compression";

type Props = {
  files: File[];
  onChange: (next: File[]) => void;
};

export default function PhotoUploader({ files, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [working, setWorking] = useState(false);

  async function handle(e: React.ChangeEvent<HTMLInputElement>) {
    const list = Array.from(e.target.files ?? []);
    if (!list.length) return;
    setWorking(true);
    try {
      const compressed: File[] = [];
      for (const f of list) {
        const out = await imageCompression(f, {
          maxSizeMB: 1,
          maxWidthOrHeight: 1200,
          useWebWorker: true,
          fileType: "image/jpeg",
        });
        compressed.push(
          new File([out], f.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" }),
        );
      }
      onChange([...files, ...compressed]);
    } finally {
      setWorking(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function remove(i: number) {
    const next = files.slice();
    next.splice(i, 1);
    onChange(next);
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {files.map((f, i) => {
          const url = URL.createObjectURL(f);
          return (
            <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => remove(i)}
                className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 text-white text-xs"
                aria-label="Remove photo"
              >
                ×
              </button>
            </div>
          );
        })}
        <label className="aspect-square rounded-lg border-2 border-dashed border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-sm text-zinc-500 cursor-pointer">
          {working ? "…" : "+ Photo"}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            onChange={handle}
            className="sr-only"
          />
        </label>
      </div>
    </div>
  );
}
