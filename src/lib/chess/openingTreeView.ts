// Adapter: maps this course's stored move tree (CourseTree.root) plus a
// user's line-scoped progress document into the generic
// OpeningTreeViewNode[] shape the <OpeningTree> component renders.
//
// This is the one place that's allowed to know about both the storage
// schema (OpeningTrieNode) and the progress-persistence schema
// (UserCourseProgressDoc) *and* the visualization's view model
// (OpeningTreeViewNode) — everything else should only ever touch one side
// or the other. In particular:
//
//   - Progress is still tracked per named line (LineProgress, keyed by
//     line id) — there is no per-position/per-node progress storage yet.
//     Intermediate (non-terminal) nodes therefore don't have their own
//     progress; their status is *derived* by rolling up the status of
//     every named line reachable through them (rollupProgressStatus
//     below), not read from persistence.
//   - The five-state vocabulary the tree uses (unseen/learning/mastered/
//     struggling/lapsed) doesn't exist as a persisted field either — it's
//     mapped from the existing four-state LineStatus (see toViewStatus).
//     "struggling" in particular is a temporary heuristic (more mistakes
//     than correct moves so far) rather than a real tracked state.
//
// When node-level progress exists, this file is what should change —
// nothing in components/opening-tree/ or the pages that use it should need
// to.

import { Chess } from "chess.js";
import type {
  OpeningTreeNodeProgress,
  OpeningTreeProgressStatus,
  OpeningTreeViewNode,
} from "@/components/opening-tree/openingTree.types";
import { resolveStartingFen } from "./fen";
import type { OpeningTrieNode } from "./openingTypes";
import { computeLineStatus, MASTERY_CLEAN_STREAK, REMASTERY_CLEAN_STREAK, type LineStatus } from "./progress";
import type { LineProgress, UserCourseProgressDoc } from "./progressTypes";

function toViewStatus(
  lineStatus: LineStatus,
  lineProgress: LineProgress | undefined,
): OpeningTreeProgressStatus {
  switch (lineStatus) {
    case "not-started":
      return "unseen";
    case "mastered":
      return "mastered";
    case "needs-review":
      // Previously mastered, since regressed — reads as "lapsed" rather
      // than "struggling": the issue is staleness, not difficulty.
      return "lapsed";
    case "learning":
      // No persisted "struggling" state exists yet — approximate it as
      // "more mistakes than correct moves so far in this line."
      return lineProgress && lineProgress.mistakes > lineProgress.correctMoves ? "struggling" : "learning";
  }
}

function deriveTerminalProgress(lineProgress: LineProgress | undefined): OpeningTreeNodeProgress {
  const status = toViewStatus(computeLineStatus(lineProgress), lineProgress);
  if (!lineProgress) {
    return { status };
  }
  const requiredStreak = lineProgress.everMastered ? REMASTERY_CLEAN_STREAK : MASTERY_CLEAN_STREAK;
  const percentage =
    status === "mastered" ? 100 : Math.min(99, Math.round((lineProgress.cleanStreak / requiredStreak) * 100));
  return {
    status,
    percentage,
    attempts: lineProgress.correctMoves + lineProgress.mistakes,
    mistakes: lineProgress.mistakes,
    streak: lineProgress.cleanStreak,
    lastTrainedAt: lineProgress.lastAttemptAt.toISOString(),
  };
}

/** Worst-signal-wins rollup, except a subtree that's *entirely* mastered
 * rolls up to mastered. Order: struggling > lapsed > learning > unseen,
 * with an all-mastered subtree short-circuiting to mastered first. */
function rollupProgressStatus(statuses: OpeningTreeProgressStatus[]): OpeningTreeProgressStatus {
  if (statuses.length === 0) return "unseen";
  if (statuses.every((status) => status === "mastered")) return "mastered";
  if (statuses.some((status) => status === "struggling")) return "struggling";
  if (statuses.some((status) => status === "lapsed")) return "lapsed";
  if (statuses.some((status) => status === "learning" || status === "mastered")) return "learning";
  return "unseen";
}

type VisitResult = { status: OpeningTreeProgressStatus; variationNames: string[] };

/**
 * Flattens a course's stored move tree into OpeningTreeViewNode[], one
 * entry per ply, with `fen`/`moveNumber`/`sideToMove` derived by replaying
 * the tree through chess.js (never guessed from ply parity — see
 * getMoveLabel's doc comment in openingTree.utils.ts for why that matters).
 */
export function mapCourseTreeToViewNodes(
  root: OpeningTrieNode[],
  startingFen: string,
  progressDoc: UserCourseProgressDoc | undefined,
): OpeningTreeViewNode[] {
  const chess = new Chess(resolveStartingFen(startingFen));
  const viewNodes: OpeningTreeViewNode[] = [];

  function visit(node: OpeningTrieNode, parentId: string | undefined, id: string): VisitResult {
    const sideToMove: "white" | "black" = chess.turn() === "w" ? "white" : "black";
    const moveNumber = Number(chess.fen().split(" ")[5]);

    const played = chess.move(node.san);
    if (!played) {
      throw new Error(`Illegal move "${node.san}" while mapping the opening tree for the view`);
    }
    const fen = chess.fen();

    const childResults = (node.children ?? []).map((child, index) => visit(child, id, `${id}.${index}`));

    let progress: OpeningTreeNodeProgress;
    let reachableVariationNames: string[] | undefined;

    if (node.line) {
      progress = deriveTerminalProgress(progressDoc?.lines[node.line.id]);
    } else {
      const childVariationNames = Array.from(new Set(childResults.flatMap((child) => child.variationNames)));
      progress = { status: rollupProgressStatus(childResults.map((child) => child.status)) };
      reachableVariationNames = childVariationNames;
    }

    viewNodes.push({
      id,
      parentId,
      fen,
      moveSan: played.san,
      moveNumber,
      sideToMove,
      nodeType: node.line ? "terminal" : "intermediate",
      variationId: node.line?.id,
      variationName: node.line?.name,
      comment: node.comment,
      reachableVariationNames,
      progress,
    });

    chess.undo();

    return {
      status: progress.status,
      variationNames: node.line ? [node.line.name] : childResults.flatMap((child) => child.variationNames),
    };
  }

  root.forEach((node, index) => visit(node, undefined, `n${index}`));

  return viewNodes;
}
