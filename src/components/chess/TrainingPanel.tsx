import type { TrainerStatus } from "@/lib/chess/useOpeningTrainer";
import { STATUS_LABELS } from "@/lib/chess/useOpeningTrainer";
import { MoveHistory } from "./MoveHistory";

const STATUS_BADGE_STYLES: Record<TrainerStatus, string> = {
  "your-move":
    "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  "opponent-thinking":
    "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  incorrect: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  "line-complete":
    "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
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
  return (
    <div className="flex h-full flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 dark:border-slate-700 dark:bg-slate-800">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
          {courseTitle}
        </p>
        <h2 className="text-base font-semibold text-slate-900 sm:text-lg dark:text-slate-100">
          {currentLineLabel}
        </h2>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-3 py-1 text-sm font-medium ${STATUS_BADGE_STYLES[status]}`}
        >
          {STATUS_LABELS[status]}
        </span>
      </div>

      <p className="min-h-[1.5rem] text-sm text-slate-700 dark:text-slate-300">
        {feedback}
      </p>

      {explanation && (
        <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-400">
          {explanation}
        </p>
      )}

      <div>
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
          Moves
        </p>
        <MoveHistory moves={moveHistory} />
      </div>

      <div className="mt-auto grid grid-cols-2 gap-2 pt-2">
        <button
          type="button"
          onClick={onHint}
          disabled={hintDisabled}
          className="rounded-lg bg-slate-100 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
        >
          Hint
        </button>
        <button
          type="button"
          onClick={onShowAnswer}
          disabled={hintDisabled}
          className="rounded-lg bg-slate-100 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
        >
          Show Answer
        </button>
        <button
          type="button"
          onClick={onRestartLine}
          className="rounded-lg bg-slate-800 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        >
          Restart Line
        </button>
        <button
          type="button"
          onClick={onNextLine}
          className="rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-500"
        >
          Next Line
        </button>
      </div>
    </div>
  );
}
