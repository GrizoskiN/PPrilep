import Shell from "../../components/layout/Shell";
import Skeleton from "../../components/ui/Skeleton";

export default function HeroesLoading() {
  return (
    <Shell>
      <div className="mx-auto max-w-156 py-4 lg:py-6 px-3 space-y-3">
        <Skeleton className="h-7 w-32 mb-4" />
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-3">
            <Skeleton className="h-6 w-6 shrink-0" rounded="rounded-md" />
            <Skeleton className="h-10 w-10 shrink-0" rounded="rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-7 w-12" rounded="rounded-full" />
          </div>
        ))}
      </div>
    </Shell>
  );
}
