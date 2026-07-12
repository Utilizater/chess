// Core data model for opening courses. These types describe the shape of
// course data as it is authored (JSON today, potentially MongoDB documents
// later) and are intentionally storage-agnostic.

export type PieceColor = "white" | "black";

/** A course's lines are grouped into three learning stages, unlocked in
 * order as the learner masters the previous one. See tiers.ts. */
export type Tier = 1 | 2 | 3;

export type OpeningMove = {
  /** Move in Standard Algebraic Notation, e.g. "Nf3". */
  san: string;
  /** Optional UCI form, e.g. "g1f3". Derived if omitted. */
  uci?: string;
  /** Free-text explanation shown while training. */
  comment?: string;
  /** Free-form labels, e.g. ["tactical", "trap"]. */
  tags?: string[];
};

export type OpeningLine = {
  id: string;
  name: string;
  description?: string;
  tier: Tier;
  moves: OpeningMove[];
};

export type Course = {
  id: string;
  title: string;
  shortDescription?: string;
  /** Which side the user plays/trains in this course. */
  colorToTrain: PieceColor;
  /** "startpos" for the standard initial position, or a custom FEN. */
  startingFen: string;
  lines: OpeningLine[];
};

/**
 * A single edge in the in-memory opening tree: from the position identified
 * by the parent node's fenKey, playing `san` leads to `resultingFenKey`.
 * A move can belong to multiple lines when several lines share a prefix.
 */
export type OpeningTreeMove = {
  san: string;
  uci: string;
  resultingFenKey: string;
  comment?: string;
  lineIds: string[];
};

/**
 * A position in the opening tree, keyed by a normalized FEN (see fen.ts).
 * `moves` holds every prepared continuation known for this position.
 */
export type OpeningTreeNode = {
  fenKey: string;
  moves: OpeningTreeMove[];
};

/** The full opening tree for a course: normalized FEN -> node. */
export type OpeningTree = Map<string, OpeningTreeNode>;
