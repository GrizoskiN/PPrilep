import Skeleton from "../../../components/ui/Skeleton";

export default function CommunitiesLoading() {
  return (
      <div className="mx-auto max-w-156 py-4 lg:py-6 px-3 space-y-3">
        <Skeleton className="h-7 w-32 mb-4" />
        <div className="grid grid-cols-2 gap-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-2 w-full" rounded="rounded-full" />
            </div>
          ))}
        </div>
      </div>
  );
}
