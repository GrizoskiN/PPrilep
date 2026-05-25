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
  { value: "idea", label: "Идеи", Icon: Lightbulb },
  { value: "voting", label: "На гласање", Icon: ThumbsUp },
  { value: "funding", label: "Фонд кампањи", Icon: Coins },
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
      className={cn(
        "relative grid w-full grid-cols-4 items-start",
        pending && "opacity-70",
      )}>
      {STEPS.slice(0, -1).map((_, i) => {
        const lineFilled = isFilled(i) && isFilled(i + 1);
        return (
          <span
            key={`line-${STEPS[i].value}`}
            className={cn(
              "pointer-events-none absolute top-7 h-0.5 rounded-full transition-colors",
              lineFilled ? "bg-emerald-500" : "bg-zinc-200",
            )}
            style={{
              left:
                i === 0
                  ? "30px"
                  : i === 1
                    ? "calc(37.5% + 15px)"
                    : "calc(62.5% + 15px)",
              width: i === 1 ? "calc(25% - 30px)" : "calc(37.5% - 45px)",
            }}
            aria-hidden
          />
        );
      })}

      {STEPS.map((step, i) => {
        const filled = isFilled(i);
        const isActive = step.value === activeStage;
        const { Icon } = step;
        const count = counts[step.value];

        return (
          <li
            key={step.value}
            className={cn(
              "flex min-w-0",
              i === 0 && "justify-start",
              (i === 1 || i === 2) && "justify-center",
              i === STEPS.length - 1 && "justify-end",
            )}>
            <button
              type="button"
              onClick={() => setStage(step.value)}
              aria-current={isActive ? "step" : undefined}
              className="flex flex-col items-center gap-1 shrink-0 group"
              style={{ minWidth: 0 }}>
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
              <span
                className={cn(
                  "relative flex items-center justify-center w-7.5 h-7.5 rounded-full border-2 transition-all",
                  filled
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-zinc-300 bg-white text-zinc-400",
                  isActive && "ring-2 ring-emerald-200 ring-offset-2",
                  "group-hover:scale-105",
                )}>
                <Icon size={14} />
                {count > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 rounded-full bg-slate-900 text-white text-[9px] font-bold flex items-center justify-center">
                    {count}
                  </span>
                )}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
