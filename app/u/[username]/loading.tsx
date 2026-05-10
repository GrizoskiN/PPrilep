import Shell from "../../../components/layout/Shell";
import Skeleton from "../../../components/ui/Skeleton";

export default function UserLoading() {
  return (
    <Shell>
      <div className="mx-auto w-full max-w-4xl px-4 py-6 space-y-5">
        <section className="rounded-3xl border border-[#e4ece8] bg-white p-5">
          <div className="flex items-center gap-4">
            <Skeleton className="h-18 w-18" rounded="rounded-2xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-24" />
              <div className="mt-1.5 flex items-center gap-3">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-[#e4ece8] bg-white p-5 space-y-2">
          <Skeleton className="h-4 w-20 mb-3" />
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-14 w-full" rounded="rounded-2xl" />
          ))}
        </section>
      </div>
    </Shell>
  );
}
