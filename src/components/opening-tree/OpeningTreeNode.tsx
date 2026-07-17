"use client";

// Shared visual chrome for both node types: selection ring, on-path ring,
// dimming, and the top/bottom connection handles a top-to-bottom layout
// needs. IntermediateNode.tsx and TerminalNode.tsx each supply their own
// size and inner content; this only owns the parts that must stay
// consistent between them (how "selected" / "on the highlighted path" /
// "dimmed" actually look).

import type { ReactNode } from "react";
import { Handle, Position } from "@xyflow/react";
import type { OpeningTreeFlowNodeData } from "./openingTree.types";

export function OpeningTreeNodeShell({
  data,
  size,
  shapeClassName,
  accentClassName,
  bgClassName,
  ringClassName,
  children,
}: {
  data: OpeningTreeFlowNodeData;
  size: { width: number; height: number };
  /** Border radius + border width — the shape distinction between node types. */
  shapeClassName: string;
  /** Status-driven border color. */
  accentClassName: string;
  /** Status-driven background wash. */
  bgClassName: string;
  /** Status-driven selection-ring color. */
  ringClassName: string;
  children: ReactNode;
}) {
  const { isSelected, onPath, dimmed } = data;

  return (
    <div
      style={{ width: size.width, height: size.height }}
      className={[
        "relative flex items-center justify-center shadow-md transition-all duration-150",
        shapeClassName,
        accentClassName,
        bgClassName,
        isSelected ? `ring-2 ring-offset-1 ring-offset-white dark:ring-offset-stone-900 ${ringClassName}` : "",
        !isSelected && onPath ? "ring-2 ring-amber-400/80" : "",
        dimmed ? "opacity-30" : "opacity-100",
      ].join(" ")}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!size-1.5 !border-none !bg-stone-400 dark:!bg-stone-500"
      />
      {children}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!size-1.5 !border-none !bg-stone-400 dark:!bg-stone-500"
      />
    </div>
  );
}
