// Pure, framework-agnostic trainer logic. Nothing here touches React; it
// operates on plain data (Course, OpeningTree) and chess.js for legality and
// FEN bookkeeping. UI components should call these functions rather than
// re-implement tree-walking or move-matching themselves.

import { Chess } from "chess.js";
import { normalizeFen, resolveStartingFen } from "./fen";
import type {
  Course,
  OpeningLine,
  OpeningTree,
  OpeningTreeMove,
  OpeningTreeNode,
} from "./openingTypes";

/** Builds the in-memory opening tree from every line in a course. */
export function buildOpeningTree(course: Course): OpeningTree {
  const tree: OpeningTree = new Map();
  const startingFen = resolveStartingFen(course.startingFen);

  for (const line of course.lines) {
    const chess = new Chess(startingFen);
    let fenKey = normalizeFen(chess.fen());
    ensureNode(tree, fenKey);

    for (const openingMove of line.moves) {
      const played = chess.move(openingMove.san);
      if (!played) {
        throw new Error(
          `Illegal move "${openingMove.san}" in line "${line.id}" of course "${course.id}"`,
        );
      }

      const resultingFenKey = normalizeFen(chess.fen());
      const node = ensureNode(tree, fenKey);
      addOrMergeMove(node, {
        san: played.san,
        uci: `${played.from}${played.to}${played.promotion ?? ""}`,
        resultingFenKey,
        comment: openingMove.comment,
        lineIds: [line.id],
      });
      ensureNode(tree, resultingFenKey);
      fenKey = resultingFenKey;
    }
  }

  return tree;
}

function ensureNode(tree: OpeningTree, fenKey: string): OpeningTreeNode {
  let node = tree.get(fenKey);
  if (!node) {
    node = { fenKey, moves: [] };
    tree.set(fenKey, node);
  }
  return node;
}

/**
 * Adds a move to a node, or merges into an existing edge if two lines share
 * the same move from the same position (a shared opening prefix).
 */
function addOrMergeMove(node: OpeningTreeNode, move: OpeningTreeMove): void {
  const existing = node.moves.find(
    (candidate) =>
      candidate.san === move.san &&
      candidate.resultingFenKey === move.resultingFenKey,
  );
  if (!existing) {
    node.moves.push(move);
    return;
  }
  for (const lineId of move.lineIds) {
    if (!existing.lineIds.includes(lineId)) {
      existing.lineIds.push(lineId);
    }
  }
  if (!existing.comment && move.comment) {
    existing.comment = move.comment;
  }
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
  course: Course,
  activeLineIds: string[],
): string[] {
  return course.lines
    .filter((line) => activeLineIds.includes(line.id))
    .map((line) => line.name);
}

/** Picks a random line id to bias a fresh session toward, e.g. for "Next Line". */
export function pickStartingLineId(
  lines: OpeningLine[],
  rng: () => number = Math.random,
  excludeId?: string,
): string {
  const candidates = lines.filter((line) => line.id !== excludeId);
  const pool = candidates.length > 0 ? candidates : lines;
  const index = Math.min(Math.floor(rng() * pool.length), pool.length - 1);
  return pool[index].id;
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
