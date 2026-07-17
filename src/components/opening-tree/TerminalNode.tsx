"use client";

import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import { OpeningTreeNodeShell } from "./OpeningTreeNode";
import { getMoveLabel, PROGRESS_STYLES } from "./openingTree.utils";
import { TERMINAL_NODE_SIZE, type OpeningTreeFlowNode } from "./openingTree.types";

/**
 * Destination card for the end of a named, trained line. Distinguished from
 * IntermediateNode by more than color alone: larger footprint, a rounded
 * card shape (vs. the intermediate node's pill), a heavier border, a flag
 * icon, and the variation name — so it reads as "you've arrived somewhere"
 * even at a glance or in a screenshot with color stripped out.
 */
function TerminalNodeImpl({ data }: NodeProps<OpeningTreeFlowNode>) {
  const { node } = data;
  const style = PROGRESS_STYLES[node.progress?.status ?? "unseen"];

  return (
    <OpeningTreeNodeShell
      data={data}
      size={TERMINAL_NODE_SIZE}
      shapeClassName="rounded-2xl border-[3px]"
      accentClassName={style.border}
      bgClassName={style.bg}
      ringClassName={style.ring}
    >
      <div className="flex h-full w-full flex-col justify-center gap-1 px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span aria-hidden className="text-xs">
            🏁
          </span>
          <span className="truncate font-mono text-sm font-semibold text-stone-800 dark:text-stone-100">
            {getMoveLabel(node)}
          </span>
        </div>
        {node.variationName && (
          <div className="truncate text-[13px] font-medium leading-snug text-stone-600 dark:text-stone-300">
            {node.variationName}
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <span aria-hidden className={`size-1.5 rounded-full ${style.dot}`} />
          <span className={`text-xs font-medium ${style.text}`}>
            {style.label}
            {node.progress?.percentage !== undefined ? ` · ${node.progress.percentage}%` : ""}
          </span>
        </div>
      </div>
    </OpeningTreeNodeShell>
  );
}

export const TerminalNode = memo(TerminalNodeImpl);
