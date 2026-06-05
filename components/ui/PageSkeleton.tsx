import Skeleton from "./Skeleton";

type Variant = "list" | "grid" | "article";

interface Props {
  /** Layout shape of the destination page. Default "list". */
  variant?: Variant;
  /** Number of placeholder cards. */
  count?: number;
  /** Show the filter-pills row under the header. */
  filters?: boolean;
}

/**
 * Generic route-level loading fallback. Rendered by each segment's loading.tsx
 * so the content area shows an instant skeleton while the server component for
 * the next route streams in — complements the top NavigationProgress bar.
 */
export default function PageSkeleton({
  variant = "list",
  count = 6,
  filters = false,
}: Props) {
  const items = Array.from({ length: count });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 shrink-0" rounded="rounded-2xl" />
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>

      {/* Optional filter row */}
      {filters && (
        <div className="flex gap-2">
          {[88, 64, 76, 70].map((w, i) => (
            <Skeleton
              key={i}
              className="h-8"
              style={{ width: w }}
              rounded="rounded-full"
            />
          ))}
        </div>
      )}

      {variant === "article" ? (
        <div className="space-y-3">
          <Skeleton className="h-44 w-full" rounded="rounded-2xl" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      ) : variant === "grid" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((_, i) => (
            <div
              key={i}
              className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4">
              <Skeleton className="h-28 w-full" rounded="rounded-xl" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((_, i) => (
            <div
              key={i}
              className="space-y-2 rounded-2xl border border-zinc-200 bg-white p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 shrink-0" rounded="rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
