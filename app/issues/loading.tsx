import Shell from "../../components/layout/Shell";
import Skeleton from "../../components/ui/Skeleton";

export default function IssuesLoading() {
  return (
    <Shell>
      <div>
        {/* Filter bar skeleton */}
        <div className="mt-3 grid grid-cols-3 z-50 gap-1.5 px-2 md:px-0 lg:px-3 py-2 sticky top-0 bg-[#f2f4f7]">
          <Skeleton className="h-8 lg:h-9" rounded="rounded-lg" />
          <Skeleton className="h-8 lg:h-9" rounded="rounded-lg" />
          <Skeleton className="h-8 lg:h-9" rounded="rounded-lg" />
        </div>

        {/* Issue cards skeleton */}
        <div className="w-full space-y-3 px-0 lg:px-3 py-3 lg:py-5">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="overflow-hidden rounded-none lg:rounded-xl border-y lg:border border-zinc-200 bg-white p-4">
              <div className="flex items-center gap-2 mb-3">
                <Skeleton className="h-4 w-14" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="-mx-4 h-72 w-auto md:h-80" rounded="rounded-none md:rounded-lg" />
              <div className="mt-3 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Skeleton className="h-10" rounded="rounded-xl" />
                <Skeleton className="h-10" rounded="rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}
