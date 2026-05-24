import Shell from "../components/layout/Shell";
import Skeleton from "../components/ui/Skeleton";

export default function HomeLoading() {
  return (
    <Shell>
      <div className="mx-auto max-w-156 py-2 lg:py-6 lg:px-3">
        <div className="px-3 lg:px-0 space-y-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="bg-gray-100 p-2 lg:p-6 rounded-2xl lg:rounded-3xl mt-6 lg:mt-8 space-y-4">
          {[0, 1, 2].map((i) => (
            <section
              key={i}
              className="rounded-3xl border border-[#e4ece8] bg-white p-4 space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-14" />
              </div>
              <Skeleton className="h-12 w-full" rounded="rounded-2xl" />
              <Skeleton className="h-12 w-full" rounded="rounded-2xl" />
              <Skeleton className="h-12 w-full" rounded="rounded-2xl" />
            </section>
          ))}
        </div>
      </div>
    </Shell>
  );
}
