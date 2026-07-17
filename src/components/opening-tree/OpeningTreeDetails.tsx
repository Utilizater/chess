"use client";

// Side panel for the currently selected node. Pure presentation — every
// value it shows arrives via props, so it works the same whether the host
// page is in "progress" mode today or a future "explore"/"admin" mode.

import { formatMoveSequence, PROGRESS_STYLES } from "./openingTree.utils";
import type { OpeningTreeMode, OpeningTreeViewNode } from "./openingTree.types";

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
      <span className="text-stone-500 dark:text-stone-400">{label}</span>
      <span className="truncate text-right font-medium text-stone-800 dark:text-stone-100">{value}</span>
    </div>
  );
}

function formatDate(value?: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function OpeningTreeDetails({
  node,
  path,
  mode,
  onPracticeFromPosition,
  onClose,
}: {
  node: OpeningTreeViewNode | null;
  /** Root-to-node ancestor chain, inclusive of `node`. Empty if `node` is null. */
  path: OpeningTreeViewNode[];
  mode: OpeningTreeMode;
  /** Left undefined to render the practice action disabled with a TODO
   * tooltip — see the progress-page container for what "wiring it up"
   * looks like today (it just links to the course's existing trainer). */
  onPracticeFromPosition?: (node: OpeningTreeViewNode) => void;
  onClose?: () => void;
}) {
  if (!node) {
    return (
      <aside className="flex w-full shrink-0 flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-stone-50/60 px-4 py-10 text-center text-sm text-stone-500 lg:w-80 dark:border-stone-700 dark:bg-stone-900/40 dark:text-stone-400">
        Select a position in the tree to see its details.
      </aside>
    );
  }

  const style = PROGRESS_STYLES[node.progress?.status ?? "unseen"];
  const progress = node.progress;

  return (
    <aside className="flex w-full shrink-0 flex-col gap-4 overflow-y-auto rounded-2xl border border-stone-200 bg-white p-4 shadow-sm lg:w-80 dark:border-stone-700 dark:bg-stone-900">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-400 dark:text-stone-500">
            {node.nodeType === "terminal" ? "Line" : "Position"}
          </p>
          <h3 className="mt-0.5 truncate font-mono text-lg font-semibold text-stone-900 dark:text-stone-100">
            {node.moveSan ? (node.sideToMove === "black" ? `...${node.moveSan}` : node.moveSan) : "Start"}
          </h3>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close details"
            className="shrink-0 rounded-full p-1 text-stone-400 transition hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800 dark:hover:text-stone-300"
          >
            ✕
          </button>
        )}
      </div>

      {node.variationName && (
        <p className="-mt-2 text-sm font-medium text-stone-700 dark:text-stone-300">{node.variationName}</p>
      )}

      <div className="flex items-center gap-1.5">
        <span aria-hidden className={`size-1.5 rounded-full ${style.dot}`} />
        <span className={`text-xs font-medium ${style.text}`}>
          {style.label}
          {progress?.percentage !== undefined ? ` · ${progress.percentage}%` : ""}
        </span>
      </div>

      {node.reachableVariationNames && node.reachableVariationNames.length > 0 && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-400 dark:text-stone-500">
            Leads to {node.reachableVariationNames.length} line
            {node.reachableVariationNames.length === 1 ? "" : "s"}
          </p>
          <ul className="mt-1 max-h-24 overflow-y-auto text-sm text-stone-600 dark:text-stone-300">
            {node.reachableVariationNames.map((name) => (
              <li key={name} className="truncate py-0.5">
                {name}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-stone-400 dark:text-stone-500">
          Move sequence
        </p>
        <p className="mt-1 break-words font-mono text-xs leading-relaxed text-stone-600 dark:text-stone-300">
          {formatMoveSequence(path) || "—"}
        </p>
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-stone-400 dark:text-stone-500">FEN</p>
        <p
          title={node.fen}
          className="mt-1 truncate font-mono text-xs text-stone-500 dark:text-stone-400"
        >
          {node.fen}
        </p>
      </div>

      <div className="border-t border-stone-100 pt-2 dark:border-stone-800">
        <DetailRow label="Attempts" value={progress?.attempts !== undefined ? String(progress.attempts) : "—"} />
        <DetailRow label="Mistakes" value={progress?.mistakes !== undefined ? String(progress.mistakes) : "—"} />
        <DetailRow label="Current streak" value={progress?.streak !== undefined ? String(progress.streak) : "—"} />
        <DetailRow label="Last trained" value={formatDate(progress?.lastTrainedAt)} />
      </div>

      <div className="mt-1">
        {onPracticeFromPosition ? (
          <button
            type="button"
            onClick={() => onPracticeFromPosition(node)}
            className="w-full rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-500"
          >
            Practice this course &rarr;
          </button>
        ) : (
          <button
            type="button"
            disabled
            title="Practicing from this exact position isn't wired up yet — TODO: needs a session entry point keyed to a specific tree node, not just a course."
            className="w-full cursor-not-allowed rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-400 dark:border-stone-700 dark:text-stone-600"
          >
            Practice from this position
          </button>
        )}
        {mode === "admin" && (
          // Reserved: an admin mode would add edit/reparent/delete actions
          // here once that flow exists — intentionally not implemented yet.
          <p className="mt-2 text-center text-xs text-stone-400 dark:text-stone-500">
            Admin editing isn&apos;t available yet.
          </p>
        )}
      </div>
    </aside>
  );
}
