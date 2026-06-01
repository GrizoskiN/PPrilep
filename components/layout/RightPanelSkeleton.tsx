// Neutral placeholder shown for routes that inject a custom right panel, until
// that panel mounts. Prevents a flash of the wrong (default) panel on refresh.
export default function RightPanelSkeleton() {
  return (
    <div className="space-y-4 py-4 animate-pulse" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-2xl border border-zinc-100 bg-white p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-full bg-zinc-100" />
            <div className="h-3 w-28 rounded-full bg-zinc-100" />
          </div>
          <div className="space-y-2">
            <div className="h-2.5 w-full rounded-full bg-zinc-100" />
            <div className="h-2.5 w-4/5 rounded-full bg-zinc-100" />
            {i === 1 && <div className="h-8 w-full rounded-xl bg-zinc-100" />}
            <div className="h-2.5 w-3/5 rounded-full bg-zinc-100" />
          </div>
        </div>
      ))}
    </div>
  );
}
