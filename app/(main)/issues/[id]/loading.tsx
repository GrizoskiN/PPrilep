import Skeleton from "../../../../components/ui/Skeleton";

export default function IssueDetailLoading() {
  return (
      <div>
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-14" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="-mx-4 h-72 md:h-80" rounded="rounded-none md:rounded-lg" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-6" rounded="rounded-full" />
            <Skeleton className="h-3 w-32" />
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2">
            <Skeleton className="h-10" rounded="rounded-xl" />
            <Skeleton className="h-10" rounded="rounded-xl" />
          </div>
        </div>
      </div>
  );
}
