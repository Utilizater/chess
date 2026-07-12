import type { TrainerStatus } from "@/lib/chess/useOpeningTrainer";
import { STATUS_LABELS } from "@/lib/chess/useOpeningTrainer";
import { MoveHistory } from "./MoveHistory";

const STATUS_STYLES: Record<TrainerStatus, { badge: string; dot: string }> = {
  "your-move": {
    badge: "bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  "opponent-thinking": {
    badge: "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300",
    dot: "bg-stone-400",
  },
  incorrect: {
    badge: "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
    dot: "bg-rose-500",
  },
  "line-complete": {
    badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
};

export type TrainingPanelProps = {
  courseTitle: string;
  currentLineLabel: string;
  moveHistory: string[];
  status: TrainerStatus;
  feedback: string;
  explanation?: string;
  onHint: () => void;
  onShowAnswer: () => void;
  onRestartLine: () => void;
  onNextLine: () => void;
  hintDisabled: boolean;
};

export function TrainingPanel({
  courseTitle,
  currentLineLabel,
  moveHistory,
  status,
  feedback,
  explanation,
  onHint,
  onShowAnswer,
  onRestartLine,
  onNextLine,
  hintDisabled,
}: TrainingPanelProps) {
  const statusStyle = STATUS_STYLES[status];

  return (
    <div className="flex h-full flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-md sm:p-5 dark:border-stone-700 dark:bg-stone-900">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-stone-400 dark:text-stone-500">
          {courseTitle}
        </p>
        <h2 className="font-serif text-base font-semibold text-stone-900 sm:text-lg dark:text-stone-100">
          {currentLineLabel}
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-2 lg:order-last lg:mt-auto lg:pt-2">
        <button
          type="button"
          onClick={onHint}
          disabled={hintDisabled}
          className="rounded-lg border border-stone-300 px-4 py-3 text-sm font-medium text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-stone-600 dark:text-stone-200 dark:hover:bg-stone-800"
        >
          Hint
        </button>
        <button
          type="button"
          onClick={onShowAnswer}
          disabled={hintDisabled}
          className="rounded-lg border border-stone-300 px-4 py-3 text-sm font-medium text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-stone-600 dark:text-stone-200 dark:hover:bg-stone-800"
        >
          Show Answer
        </button>
        <button
          type="button"
          onClick={onRestartLine}
          className="rounded-lg bg-stone-800 px-4 py-3 text-sm font-medium text-white transition hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white"
        >
          Restart Line
        </button>
        <button
          type="button"
          onClick={onNextLine}
          className="rounded-lg bg-amber-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-amber-500"
        >
          Next Line
        </button>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${statusStyle.badge}`}
          >
            <span aria-hidden className={`size-1.5 rounded-full ${statusStyle.dot}`} />
            {STATUS_LABELS[status]}
          </span>
        </div>

        <p className="min-h-[1.5rem] text-sm text-stone-700 dark:text-stone-300">{feedback}</p>

        {explanation && (
          <p className="rounded-lg border-l-2 border-amber-400 bg-amber-50/60 p-3 text-sm text-stone-700 italic dark:border-amber-600 dark:bg-amber-950/20 dark:text-stone-300">
            {explanation}
          </p>
        )}

        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-400 dark:text-stone-500">
            Moves
          </p>
          <MoveHistory moves={moveHistory} />
        </div>
      </div>
    </div>
  );
}
