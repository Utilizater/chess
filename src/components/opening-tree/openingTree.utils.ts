// Generic, domain-agnostic helpers for the opening-tree visualization. Pure
// functions only — no React, no fetching, no course/progress-specific
// knowledge. Anything that needs to know about MongoDB, CourseTree, or
// UserCourseProgressDoc belongs in a page-level adapter instead (see
// src/lib/chess/openingTreeView.ts for the one the progress page uses).

import type { OpeningTreeProgressStatus, OpeningTreeViewNode } from "./openingTree.types";

/**
 * Restrained per-status styling shared by both node types: colored border +
 * a faint status-tinted background wash (not a saturated fill — just enough
 * of a color block to stay legible when zoomed way out, where a 1-2px
 * border alone all but disappears) + small dot + label text. Palette choice
 * deliberately echoes the existing StatusBadge/TierBadge conventions
 * (amber = learning/in-progress, emerald = mastered, rose = struggling)
 * while adding a distinct orange for "lapsed" (previously mastered, now
 * regressed) and neutral stone for "unseen".
 */
export const PROGRESS_STYLES: Record<
  OpeningTreeProgressStatus,
  { border: string; bg: string; dot: string; text: string; ring: string; label: string }
> = {
  unseen: {
    border: "border-stone-300 dark:border-stone-600",
    bg: "bg-white dark:bg-stone-900",
    dot: "bg-stone-400 dark:bg-stone-500",
    text: "text-stone-500 dark:text-stone-400",
    ring: "ring-stone-400 dark:ring-stone-500",
    label: "Unseen",
  },
  learning: {
    border: "border-amber-400 dark:border-amber-600",
    bg: "bg-amber-50 dark:bg-amber-950/50",
    dot: "bg-amber-500",
    text: "text-amber-700 dark:text-amber-400",
    ring: "ring-amber-400",
    label: "Learning",
  },
  mastered: {
    border: "border-emerald-400 dark:border-emerald-600",
    bg: "bg-emerald-50 dark:bg-emerald-950/50",
    dot: "bg-emerald-500",
    text: "text-emerald-700 dark:text-emerald-400",
    ring: "ring-emerald-400",
    label: "Mastered",
  },
  struggling: {
    border: "border-rose-400 dark:border-rose-600",
    bg: "bg-rose-50 dark:bg-rose-950/50",
    dot: "bg-rose-500",
    text: "text-rose-700 dark:text-rose-400",
    ring: "ring-rose-400",
    label: "Struggling",
  },
  lapsed: {
    border: "border-orange-400 dark:border-orange-600",
    bg: "bg-orange-50 dark:bg-orange-950/50",
    dot: "bg-orange-500",
    text: "text-orange-700 dark:text-orange-400",
    ring: "ring-orange-400",
    label: "Lapsed",
  },
};

/**
 * Compact move label for a node.
 *
 * Fallback logic (in order):
 * 1. No `moveSan` at all (a root/start position node) → "Start".
 * 2. `sideToMove === "black"` → "...san", e.g. "...Nf6" — this is the only
 *    case the compact intermediate-node card shows on its face.
 * 3. `sideToMove === "white"` → "N.san", e.g. "5.Nc3" — never rendered as a
 *    bare or ellipsis-prefixed move, so a White move can never be mistaken
 *    for a Black one at a glance.
 * 4. Side-to-move unknown (shouldn't happen for a node produced by the
 *    course-tree adapter, but a generic component can't assume that of
 *    every future caller) → the bare SAN, with no color-specific prefix,
 *    rather than guessing.
 */
export function getMoveLabel(
  node: Pick<OpeningTreeViewNode, "moveSan" | "moveNumber" | "sideToMove">,
): string {
  if (!node.moveSan) return "Start";
  if (node.sideToMove === "black") return `...${node.moveSan}`;
  if (node.sideToMove === "white") {
    return node.moveNumber !== undefined ? `${node.moveNumber}.${node.moveSan}` : node.moveSan;
  }
  return node.moveSan;
}

/** id -> node lookup, built once per distinct node set. */
export function buildNodeIndex(
  viewNodes: OpeningTreeViewNode[],
): Map<string, OpeningTreeViewNode> {
  return new Map(viewNodes.map((node) => [node.id, node]));
}

/** Every id from the root down to (and including) `nodeId`, root first.
 * Empty if `nodeId` isn't in `nodesById`. Guards against a cyclic parentId
 * chain (which should never occur in valid tree data) so this can never
 * infinite-loop on bad input. */
export function getAncestorIds(
  nodesById: Map<string, OpeningTreeViewNode>,
  nodeId: string,
): string[] {
  const chain: string[] = [];
  const visited = new Set<string>();
  let currentId: string | undefined = nodeId;
  while (currentId && nodesById.has(currentId) && !visited.has(currentId)) {
    visited.add(currentId);
    chain.push(currentId);
    currentId = nodesById.get(currentId)?.parentId;
  }
  return chain.reverse();
}

/** Root-first PGN-style move text for a path of nodes, e.g. "1.d4 d5 2.e4
 * dxe4". Skips any node without a `moveSan` (a root/start node). */
export function formatMoveSequence(path: OpeningTreeViewNode[]): string {
  const parts: string[] = [];
  path.forEach((node, index) => {
    if (!node.moveSan) return;
    if (node.sideToMove === "white") {
      parts.push(node.moveNumber !== undefined ? `${node.moveNumber}.${node.moveSan}` : node.moveSan);
    } else if (node.sideToMove === "black" && index === 0) {
      // The path can start on a Black move if a caller passes in a partial
      // ancestor chain rather than one rooted at the true tree root — the
      // "..." marks that White's corresponding move isn't missing, it's
      // just outside this path.
      parts.push(node.moveNumber !== undefined ? `${node.moveNumber}...${node.moveSan}` : `...${node.moveSan}`);
    } else {
      parts.push(node.moveSan);
    }
  });
  return parts.join(" ");
}
