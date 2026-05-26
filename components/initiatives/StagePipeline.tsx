"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Lightbulb, ThumbsUp, Coins, CircleCheck } from "lucide-react";
import { cn } from "../../lib/utils";

type Stage = "idea" | "voting" | "funding" | "completed";

interface Props {
  activeStage: Stage | null;
  counts: { idea: number; voting: number; funding: number; completed: number };
}

const STEPS: {
  value: Stage;
  label: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
}[] = [
  { value: "idea", label: "Идеја", Icon: Lightbulb },
  { value: "voting", label: "Поддршка", Icon: ThumbsUp },
  { value: "funding", label: "Финансирање", Icon: Coins },
  { value: "completed", label: "Реализирано", Icon: CircleCheck },
];

export default function StagePipeline({ activeStage, counts }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const activeIdx = activeStage
    ? STEPS.findIndex((s) => s.value === activeStage)
    : -1;

  function isFilled(idx: number): boolean {
    const step = STEPS[idx];
    return counts[step.value] > 0 || (activeIdx >= 0 && idx <= activeIdx);
  }

  function setStage(stage: Stage) {
    const next = new URLSearchParams(params.toString());
    if (activeStage === stage) {
      // Clicking active stage clears the filter
      next.delete("stage");
    } else {
      next.set("stage", stage);
    }
    next.delete("page");
    const qs = next.toString();
    startTransition(() => {
      router.push(qs ? `/initiatives?${qs}` : "/initiatives", {
        scroll: false,
      });
    });
  }

  return (
    <ol
      className={cn("grid w-full grid-cols-4 gap-4", pending && "opacity-70")}>
      {STEPS.map((step, i) => {
        const filled = isFilled(i);
        const isActive = step.value === activeStage;
        const lineFilled = i < STEPS.length - 1 && filled && isFilled(i + 1);
        const { Icon } = step;
        const count = counts[step.value];

        return (
          <li key={step.value} className="relative min-w-0">
            <button
              type="button"
              onClick={() => setStage(step.value)}
              aria-current={isActive ? "step" : undefined}
              className={cn(
                "group relative flex w-full flex-col items-center gap-2 rounded-xl border px-3 py-3 text-center transition-all",
                filled
                  ? "border-emerald-500/50 bg-emerald-50/40"
                  : "border-zinc-300 bg-white",
                isActive && "ring-2 ring-emerald-200 ring-offset-2",
              )}>
              <span
                className={cn(
                  "relative flex items-center justify-center w-7.5 h-7.5 rounded-full border-2 transition-all",
                  filled
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-zinc-300 bg-white text-zinc-400",
                  "group-hover:scale-105",
                )}>
                <Icon size={14} />
                <span
                  className={cn(
                    "absolute -top-1.5 -right-1.5 inline-flex min-w-4 h-4 items-center justify-center rounded-full px-1 text-[9px] font-bold",
                    count > 0
                      ? "bg-slate-900 text-white"
                      : "bg-zinc-100 text-zinc-500 border border-zinc-300",
                  )}>
                  {count}
                </span>
              </span>
              <span
                className={cn(
                  "text-[11px] text-center transition-colors whitespace-nowrap",
                  isActive
                    ? "font-semibold text-slate-900"
                    : filled
                      ? "text-slate-700"
                      : "text-zinc-400",
                )}>
                {step.label}
              </span>
            </button>

            {i < STEPS.length - 1 && (
              <span
                className={cn(
                  "pointer-events-none absolute top-1/2 -right-4 h-0.5 w-4 -translate-y-1/2 rounded-full transition-colors",
                  lineFilled ? "bg-emerald-500" : "bg-zinc-300",
                )}
                aria-hidden
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
