
export default function KindergartenLoading() {
  return (
      <div className="p-4 lg:p-6 space-y-5 max-w-2xl mx-auto animate-pulse">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-zinc-100 shrink-0" />
          <div className="space-y-1.5">
            <div className="h-4 w-44 rounded bg-zinc-200" />
            <div className="h-3 w-32 rounded bg-zinc-100" />
          </div>
        </div>
        <div className="flex gap-2">
          {[80, 60, 72, 68, 88].map((w, i) => (
            <div key={i} className="h-7 rounded-full bg-zinc-100" style={{ width: w }} />
          ))}
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-zinc-100 bg-zinc-50 p-4 space-y-2">
            <div className="h-4 w-3/4 rounded bg-zinc-200" />
            <div className="h-3 w-full rounded bg-zinc-100" />
            <div className="h-3 w-2/3 rounded bg-zinc-100" />
          </div>
        ))}
      </div>
  );
}
