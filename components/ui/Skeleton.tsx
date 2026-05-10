import { cn } from "../../lib/utils";

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  /** Tailwind rounded-* class. Default rounded-md. */
  rounded?: string;
}

/**
 * Pulsing placeholder block. Use for loading states.
 *
 *   <Skeleton className="h-4 w-24" />
 *   <Skeleton className="h-40 w-full" rounded="rounded-xl" />
 */
export default function Skeleton({
  className,
  rounded = "rounded-md",
  ...rest
}: Props) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-pulse bg-gradient-to-br from-zinc-200/80 via-zinc-100 to-zinc-200/80",
        rounded,
        className,
      )}
      {...rest}
    />
  );
}
