interface Props {
  votes: number;
}

const PHASE_1_GOAL = 25;
const TOTAL_GOAL = 100;

export default function SegmentedProgressBar({ votes }: Props) {
  const phase1Fill =
    votes >= PHASE_1_GOAL
      ? 100
      : Math.max(0, Math.round((votes / PHASE_1_GOAL) * 100));

  const phase2Fill =
    votes <= PHASE_1_GOAL
      ? 0
      : Math.min(
          100,
          Math.round(
            ((votes - PHASE_1_GOAL) / (TOTAL_GOAL - PHASE_1_GOAL)) * 100,
          ),
        );

  const middleLabel = votes >= PHASE_1_GOAL ? "Во подем" : "Цел: 25";

  let helper: string;
  if (votes < PHASE_1_GOAL) {
    helper = `Уште ${PHASE_1_GOAL - votes} гласови до прва фаза`;
  } else if (votes < TOTAL_GOAL) {
    helper = `Уште ${TOTAL_GOAL - votes} гласови до отворање фонд`;
  } else {
    helper = "Спремно за Фонд!";
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[11px] font-medium text-theme-muted">
        <span>Идеја</span>
        <span className="text-theme-ink">{middleLabel}</span>
        <span>Фонд (100)</span>
      </div>

      <div className="flex items-stretch gap-1">
        <div className="w-1/4 h-1.5 rounded-full bg-zinc-200 overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
            style={{ width: `${phase1Fill}%` }}
          />
        </div>
        <div className="w-3/4 h-1.5 rounded-full bg-zinc-200 overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500 transition-[width] duration-500 ease-out"
            style={{ width: `${phase2Fill}%` }}
          />
        </div>
      </div>

      <p className="text-[11px] text-theme-subtle">{helper}</p>
    </div>
  );
}
