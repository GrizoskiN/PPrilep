import Skeleton from "../../../components/ui/Skeleton";

export default function IdeasLoading() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-7 w-28 mb-4" />
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
          <div className="flex items-center justify-between mt-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-16" rounded="rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
