import Skeleton from "../../../components/ui/Skeleton";

export default function UserLoading() {
  return (
    <div className="space-y-5">
      {/* Centered header skeleton */}
      <section className="pb-1">
        <div className="flex flex-col items-center gap-2.5 pt-2">
          <Skeleton className="h-28 w-28" rounded="rounded-full" />
          <Skeleton className="h-5 w-32" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-[#e4ece8] bg-white p-5 space-y-2">
        <Skeleton className="h-8 w-40 mb-3" rounded="rounded-full" />
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-16 w-full" rounded="rounded-2xl" />
        ))}
      </section>
    </div>
  );
}
