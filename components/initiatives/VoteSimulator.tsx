"use client";

import { useState } from "react";
import SegmentedProgressBar from "./SegmentedProgressBar";
import { STAGE_BADGE, STAGE_LABEL } from "../../lib/initiatives";
import { cn } from "../../lib/utils";
import type { InitiativeStage } from "../../lib/types/database";

const MAX = 150;

function stageForVotes(votes: number): InitiativeStage {
  if (votes >= 100) return "funding";
  if (votes >= 25) return "voting";
  return "idea";
}

function statusForVotes(votes: number): string {
  if (votes >= 100) return "Прибира средства";
  if (votes >= 25) return "Активна";
  return "Во дискусија";
}

interface Props {
  initial?: number;
}

export default function VoteSimulator({ initial = 10 }: Props) {
  const [votes, setVotes] = useState(initial);
  const stage = stageForVotes(votes);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 space-y-4">
      {/* Info row: Фаза / Статус */}
      <div className="grid grid-cols-2 gap-4 pb-3 border-b border-zinc-200">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-theme-muted mb-1">
            Фаза
          </p>
          <span
            className={cn(
              "inline-block text-[11px] px-1.5 py-0.5 rounded font-semibold",
              STAGE_BADGE[stage],
            )}>
            {STAGE_LABEL[stage]}
          </span>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-theme-muted mb-1">
            Статус
          </p>
          <span className="text-sm font-medium text-theme-ink">
            {statusForVotes(votes)}
          </span>
        </div>
      </div>

      {/* Slider row: Број на гласови */}
      <div className="flex items-center gap-3">
        <label
          htmlFor="vote-sim"
          className="text-[12px] font-medium text-theme-ink whitespace-nowrap">
          Број на гласови
        </label>
        <input
          id="vote-sim"
          type="range"
          min={0}
          max={MAX}
          step={1}
          value={votes}
          onChange={(e) => setVotes(Number(e.target.value))}
          className="flex-1 accent-emerald-500 cursor-pointer"
        />
        <span className="inline-flex items-center justify-center min-w-[42px] h-7 px-2 rounded-md bg-zinc-100 text-sm font-semibold tabular-nums text-theme-ink">
          {votes}
        </span>
      </div>

      {/* Live progress bar */}
      <div className="pt-2">
        <SegmentedProgressBar votes={votes} />
      </div>

      {/* Quick-jump milestones */}
      <div className="flex items-center gap-1.5 flex-wrap pt-1">
        {[0, 10, 24, 25, 50, 75, 99, 100].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setVotes(n)}
            className={cn(
              "text-[11px] px-2 py-0.5 rounded-full border transition-colors",
              votes === n
                ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                : "border-zinc-200 text-zinc-500 hover:border-zinc-400",
            )}>
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
