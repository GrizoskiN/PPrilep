export default function IssueCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-[0_6px_16px_rgba(15,23,42,0.08)] animate-pulse">
      {/* photo placeholder */}
      <div className="h-48 w-full bg-zinc-100" />
      <div className="p-3 space-y-3">
        {/* title */}
        <div className="h-4 w-3/4 rounded bg-zinc-100" />
        {/* meta row */}
        <div className="flex gap-2">
          <div className="h-3 w-16 rounded bg-zinc-100" />
          <div className="h-3 w-12 rounded bg-zinc-100" />
          <div className="h-3 w-20 rounded bg-zinc-100" />
        </div>
        {/* action buttons */}
        <div className="flex gap-2 pt-1">
          <div className="h-9 flex-1 rounded-xl bg-zinc-100" />
          <div className="h-9 flex-1 rounded-xl bg-zinc-100" />
          <div className="h-9 w-9 rounded-xl bg-zinc-100" />
        </div>
      </div>
    </div>
  );
}
