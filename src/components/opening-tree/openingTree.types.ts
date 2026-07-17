// Presentation-layer data model for the reusable opening-tree visualization.
// Deliberately separate from both the storage schema (OpeningTrieNode /
// CourseTree in src/lib/chess/openingTypes.ts) and any progress-persistence
// shape (UserCourseProgressDoc) — this is what the component actually
// renders, and nothing in components/opening-tree/ should import Mongo
// types or know how a Course is fetched. A page/container maps its own
// domain data into this shape (see src/lib/chess/openingTreeView.ts for the
// course-tree + progress adapter used by the progress page).

import type { Node } from "@xyflow/react";

export type OpeningTreeNodeKind = "intermediate" | "terminal";

export type OpeningTreeProgressStatus =
  | "unseen"
  | "learning"
  | "mastered"
  | "struggling"
  | "lapsed";

export type OpeningTreeNodeProgress = {
  status: OpeningTreeProgressStatus;
  /** 0-100. Omitted when there's nothing meaningful to show (e.g. unseen). */
  percentage?: number;
  attempts?: number;
  mistakes?: number;
  /** Current clean streak, when the node maps to a single trained line. */
  streak?: number;
  /** ISO date string, kept as a plain string so this type never depends on
   * a particular storage layer's Date handling. */
  lastTrainedAt?: string;
};

export type OpeningTreeViewNode = {
  id: string;
  /** Undefined only for the (synthetic) root's direct children's ancestor —
   * actual root move nodes have no parent. */
  parentId?: string;
  fen: string;
  /** SAN of the move that leads to this node. Absent only for a true root
   * "starting position" node, which this visualization doesn't emit today
   * (every node currently represents a move), but the field stays optional
   * so a future root-position node is a non-breaking addition. */
  moveSan?: string;
  moveNumber?: number;
  /** The color of the player who *played* `moveSan` — i.e. the mover, not
   * the side to move next. See getMoveLabel in openingTree.utils.ts for why
   * this distinction matters for correct move-label rendering. */
  sideToMove?: "white" | "black";
  nodeType: OpeningTreeNodeKind;
  variationId?: string;
  variationName?: string;
  /** Free-text authoring comment on this move, if any — surfaced in the
   * details panel, not on the compact node card. */
  comment?: string;
  /** Only populated on intermediate nodes: the names of every named line
   * reachable through this position, for the details panel ("shared by N
   * lines"). Terminal nodes don't need this — they *are* one line. */
  reachableVariationNames?: string[];
  progress?: OpeningTreeNodeProgress;
};

/**
 * Where the tree is being shown. Only "progress" is implemented today;
 * "explore" and "admin" are reserved so callers can start wiring toward
 * them (e.g. picking a mode-specific onNodeSelect/onPracticeFromPosition)
 * without the component needing a rewrite later. Nothing in this component
 * group should special-case "admin" behavior yet — see OpeningTree.tsx.
 */
export type OpeningTreeMode = "progress" | "explore" | "admin";

/** Shared data payload every custom React Flow node in this tree carries. */
export type OpeningTreeFlowNodeData = {
  node: OpeningTreeViewNode;
  isSelected: boolean;
  /** On the direct root-to-selected-node path (inclusive). */
  onPath: boolean;
  /** A selection exists elsewhere in the tree and this node isn't on its path. */
  dimmed: boolean;
};

export type OpeningTreeFlowNode = Node<OpeningTreeFlowNodeData, OpeningTreeNodeKind>;

// Fixed card sizes, shared between the ELK layout pass (layoutOpeningTree.ts,
// which needs a width/height per node to space the graph) and the node
// components themselves (which render at these exact dimensions). Keeping
// them here — plain data, not layout logic — avoids a layout<->rendering
// import cycle while still having one source of truth.
export const INTERMEDIATE_NODE_SIZE = { width: 136, height: 52 } as const;
export const TERMINAL_NODE_SIZE = { width: 256, height: 116 } as const;
