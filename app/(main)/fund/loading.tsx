import Skeleton from "../../../components/ui/Skeleton";

export default function FundLoading() {
  return (
      <div className="space-y-3">
        <Skeleton className="h-7 w-32 mb-4" />
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-3">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-2 w-full" rounded="rounded-full" />
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-8 w-24" rounded="rounded-lg" />
            </div>
          </div>
        ))}
      </div>
  );
}
