"use client";

import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import { OpeningTreeNodeShell } from "./OpeningTreeNode";
import { getMoveLabel, PROGRESS_STYLES } from "./openingTree.utils";
import { INTERMEDIATE_NODE_SIZE, type OpeningTreeFlowNode } from "./openingTree.types";

/**
 * Compact, minimal node for a position that isn't the end of a named line.
 * Deliberately shows almost nothing: just the move label and a small
 * progress dot — see TerminalNode for the "meaningful destination card"
 * counterpart. Memoized since the full tree can have hundreds of these and
 * only the few nodes whose selection/dim/progress state actually changed
 * should re-render.
 */
function IntermediateNodeImpl({ data }: NodeProps<OpeningTreeFlowNode>) {
  const { node } = data;
  const style = PROGRESS_STYLES[node.progress?.status ?? "unseen"];

  return (
    <OpeningTreeNodeShell
      data={data}
      size={INTERMEDIATE_NODE_SIZE}
      shapeClassName="rounded-full border-2"
      accentClassName={style.border}
      bgClassName={style.bg}
      ringClassName={style.ring}
    >
      <div className="flex items-center gap-1.5 px-3">
        <span aria-hidden className={`size-1.5 shrink-0 rounded-full ${style.dot}`} title={style.label} />
        <span className="truncate font-mono text-[13px] font-medium text-stone-700 dark:text-stone-200">
          {getMoveLabel(node)}
        </span>
      </div>
    </OpeningTreeNodeShell>
  );
}

export const IntermediateNode = memo(IntermediateNodeImpl);
