// Pure, framework-agnostic trainer logic. Nothing here touches React; it
// operates on plain data (CourseTree, OpeningTree) and chess.js for legality
// and FEN bookkeeping. UI components should call these functions rather than
// re-implement tree-walking or move-matching themselves.

import { Chess } from "chess.js";
import { normalizeFen, resolveStartingFen } from "./fen";
import type {
  CourseTree,
  OpeningLineSummary,
  OpeningTree,
  OpeningTreeMove,
  OpeningTreeNode,
  OpeningTrieNode,
  Tier,
} from "./openingTypes";
import type { LineStatus } from "./progress";

/**
 * Builds the in-memory, position-keyed opening tree by walking the course's
 * stored move tree (a Trie: shared prefixes are stored once, so no merging
 * across lines is needed here — that's already been done at authoring
 * time). Also collects the metadata for every named line found along the
 * way, since walking the trie is the only place that naturally visits them.
 */
export function buildOpeningTree(
  course: CourseTree,
): { tree: OpeningTree; lines: OpeningLineSummary[] } {
  const tree: OpeningTree = new Map();
  const lines: OpeningLineSummary[] = [];
  const startingFen = resolveStartingFen(course.startingFen);
  const chess = new Chess(startingFen);
  const rootFenKey = normalizeFen(chess.fen());
  ensureNode(tree, rootFenKey);

  /** Plays `node.san`, recurses into its children, then undoes the move so
   * siblings and the caller see the board as they left it. Returns every
   * line id reachable through this node (its own, plus its descendants'). */
  function walkNode(node: OpeningTrieNode, fenKey: string): string[] {
    const played = chess.move(node.san);
    if (!played) {
      throw new Error(
        `Illegal move "${node.san}" in course "${course.id}" (from FEN "${fenKey}")`,
      );
    }

    const resultingFenKey = normalizeFen(chess.fen());
    ensureNode(tree, resultingFenKey);

    const descendantLineIds = (node.children ?? []).flatMap((child) =>
      walkNode(child, resultingFenKey),
    );
    if (node.line) {
      lines.push(node.line);
    }
    const lineIds = Array.from(
      new Set(node.line ? [node.line.id, ...descendantLineIds] : descendantLineIds),
    );

    ensureNode(tree, fenKey).moves.push({
      san: played.san,
      uci: `${played.from}${played.to}${played.promotion ?? ""}`,
      resultingFenKey,
      comment: node.comment,
      lineIds,
    });

    chess.undo();
    return lineIds;
  }

  for (const node of course.root) {
    walkNode(node, rootFenKey);
  }

  return { tree, lines };
}

function ensureNode(tree: OpeningTree, fenKey: string): OpeningTreeNode {
  let node = tree.get(fenKey);
  if (!node) {
    node = { fenKey, moves: [] };
    tree.set(fenKey, node);
  }
  return node;
}

/** Every named line's metadata found in the stored tree, without building
 * the runtime engine tree — for callers that only need line/tier info. */
export function collectLineSummaries(root: OpeningTrieNode[]): OpeningLineSummary[] {
  const lines: OpeningLineSummary[] = [];
  function walk(nodes: OpeningTrieNode[]): void {
    for (const node of nodes) {
      if (node.line) lines.push(node.line);
      if (node.children) walk(node.children);
    }
  }
  walk(root);
  return lines;
}

/**
 * Prunes the stored tree down to what a learner at `unlockedTier` may train
 * on: a node's `line` marker is dropped if its tier is locked, and a node is
 * dropped entirely once it has neither a kept `line` nor any surviving
 * children. A node whose own line is locked but which leads to an unlocked
 * line further down (a shared prefix) is kept without its `line` marker, so
 * that shared prefix stays trainable via the unlocked line.
 */
export function filterTreeByTier(
  root: OpeningTrieNode[],
  unlockedTier: Tier,
): OpeningTrieNode[] {
  const result: OpeningTrieNode[] = [];
  for (const node of root) {
    const children = node.children
      ? filterTreeByTier(node.children, unlockedTier)
      : undefined;
    const line = node.line && node.line.tier <= unlockedTier ? node.line : undefined;
    if (!line && (!children || children.length === 0)) continue;
    result.push({
      ...node,
      line,
      children: children && children.length > 0 ? children : undefined,
    });
  }
  return result;
}

/** Every prepared continuation known for a given (normalized) position. */
export function getPreparedMoves(
  tree: OpeningTree,
  fenKey: string,
): OpeningTreeMove[] {
  return tree.get(fenKey)?.moves ?? [];
}

/** True once a position has no further prepared moves in the tree. */
export function isLineComplete(tree: OpeningTree, fenKey: string): boolean {
  return getPreparedMoves(tree, fenKey).length === 0;
}

/** Finds the prepared move (if any) whose result matches the given position. */
export function findPreparedMoveByResultingFen(
  tree: OpeningTree,
  fenKey: string,
  resultingFenKey: string,
): OpeningTreeMove | undefined {
  return getPreparedMoves(tree, fenKey).find(
    (move) => move.resultingFenKey === resultingFenKey,
  );
}

/**
 * Picks one of several prepared opponent replies. Uniformly random for now;
 * swapping in a weighted distribution later only requires changing this
 * function's internals, not its callers.
 */
export function pickOpponentMove(
  moves: OpeningTreeMove[],
  rng: () => number = Math.random,
): OpeningTreeMove | undefined {
  if (moves.length === 0) return undefined;
  const index = Math.min(Math.floor(rng() * moves.length), moves.length - 1);
  return moves[index];
}

/**
 * Narrows the set of lines still consistent with the moves played so far.
 * Falls back to the move's own lines if the intersection is empty (this
 * shouldn't normally happen, but guards against inconsistent data).
 */
export function narrowActiveLineIds(
  activeLineIds: string[],
  move: OpeningTreeMove,
): string[] {
  const narrowed = activeLineIds.filter((id) => move.lineIds.includes(id));
  return narrowed.length > 0 ? narrowed : move.lineIds;
}

/** Names of every line still consistent with the current move history. */
export function getActiveLineNames(
  lines: OpeningLineSummary[],
  activeLineIds: string[],
): string[] {
  return lines
    .filter((line) => activeLineIds.includes(line.id))
    .map((line) => line.name);
}

/**
 * Relative selection weight per mastery status: lines needing more practice
 * come up more often, while mastered lines still surface occasionally so
 * they don't fully drop out of rotation. See pickStartingLineId.
 */
const LINE_STATUS_WEIGHTS: Record<LineStatus, number> = {
  "not-started": 5,
  learning: 4,
  "needs-review": 6,
  mastered: 1,
};

/** Weighted random pick from `items` using parallel `weights`. Falls back
 * to a uniform pick if every weight is zero. */
function weightedPick<T>(items: T[], weights: number[], rng: () => number): T {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  if (total <= 0) {
    const index = Math.min(Math.floor(rng() * items.length), items.length - 1);
    return items[index];
  }
  let roll = rng() * total;
  for (let i = 0; i < items.length; i += 1) {
    roll -= weights[i];
    if (roll < 0) return items[i];
  }
  return items[items.length - 1];
}

/**
 * Picks a random line id to bias a fresh session toward, e.g. for "Next
 * Line". Weighted by mastery status (see LINE_STATUS_WEIGHTS) so lines that
 * need review or haven't been started come up more often than mastered ones.
 */
export function pickStartingLineId(
  lines: OpeningLineSummary[],
  lineStatuses: Record<string, LineStatus> = {},
  rng: () => number = Math.random,
  excludeId?: string,
): string {
  const candidates = lines.filter((line) => line.id !== excludeId);
  const pool = candidates.length > 0 ? candidates : lines;
  const weights = pool.map((line) => LINE_STATUS_WEIGHTS[lineStatuses[line.id] ?? "not-started"]);
  return weightedPick(pool, weights, rng).id;
}

const PIECE_MOVE_NAMES: Record<string, string> = {
  N: "Knight",
  B: "Bishop",
  R: "Rook",
  Q: "Queen",
  K: "King",
};

/** A soft, non-spoiling clue about a single prepared move. */
function describeMoveClue(move: OpeningTreeMove): string {
  if (move.san.startsWith("O-O-O")) return "castle queenside";
  if (move.san.startsWith("O-O")) return "castle kingside";
  const pieceLetter = move.san[0];
  const pieceName = PIECE_MOVE_NAMES[pieceLetter];
  return pieceName ? `a ${pieceName} move` : "a pawn move";
}

/** Hint text for the current position: describes the shape of the answer(s). */
export function getHintText(moves: OpeningTreeMove[]): string {
  if (moves.length === 0) return "No prepared move here.";
  const clues = Array.from(new Set(moves.map(describeMoveClue)));
  return `Hint: ${clues.join(" or ")}.`;
}

/** Full reveal of the prepared move(s) for the current position. */
export function getAnswerText(moves: OpeningTreeMove[]): string {
  if (moves.length === 0) return "No prepared move here.";
  return moves.map((move) => move.san).join(" or ");
}

export type TrainerStatus =
  | "your-move"
  | "opponent-thinking"
  | "incorrect"
  | "line-complete";

export const STATUS_LABELS: Record<TrainerStatus, string> = {
  "your-move": "Your move",
  "opponent-thinking": "Opponent is replying...",
  incorrect: "Not this line",
  "line-complete": "Line complete",
};

/**
 * Determines the status/feedback a fresh session should start in: whether
 * the tree has anything prepared at all, and whose turn it is first.
 */
export function getSessionStartState(
  tree: OpeningTree,
  startingFen: string,
  userColor: "w" | "b",
): { status: TrainerStatus; feedback: string } {
  const rootFenKey = normalizeFen(startingFen);
  if (isLineComplete(tree, rootFenKey)) {
    return { status: "line-complete", feedback: "Line complete!" };
  }
  const turn = new Chess(startingFen).turn();
  return turn === userColor
    ? { status: "your-move", feedback: "Your move." }
    : { status: "opponent-thinking", feedback: "Opponent is replying..." };
}

export type MoveAttempt =
  | { legal: true; san: string; resultingFen: string }
  | { legal: false };

/**
 * Validates a from/to (drag-and-drop) move against chess rules, independent
 * of the opening tree. Always promotes to queen, which covers the near-total
 * majority of opening-phase promotions and keeps the trainer UI simple.
 */
export function attemptMove(
  fen: string,
  from: string,
  to: string,
  promotion: string = "q",
): MoveAttempt {
  const chess = new Chess(fen);
  try {
    const move = chess.move({ from, to, promotion });
    if (!move) return { legal: false };
    return { legal: true, san: move.san, resultingFen: chess.fen() };
  } catch {
    return { legal: false };
  }
}
