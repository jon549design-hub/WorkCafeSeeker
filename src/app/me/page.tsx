export default function MePage() {
  return (
    <div className="flex-1 flex flex-col">
      <header className="sticky top-0 z-10 bg-white/95 dark:bg-zinc-950/95 backdrop-blur border-b border-zinc-200 dark:border-zinc-800">
        <div className="px-4 h-14 flex items-center">
          <h1 className="font-semibold">Me</h1>
        </div>
      </header>
      <div className="p-6 text-sm text-zinc-500">
        Settings and tag management coming next.
      </div>
    </div>
  );
}
