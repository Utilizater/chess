// Core data model for opening courses. Course content is authored as a move
// tree (a Trie): shared prefixes between lines are stored once, and lines
// diverge into separate branches. These types describe that shape as it is
// authored (JSON today, MongoDB documents in the `opening_tree` collection)
// and are intentionally storage-agnostic.

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

/** Metadata marking a node as the end of a named, tiered prepared line. A node
 * can carry this AND have children, when a shorter line's ending is also a
 * prefix of a longer line branching further (see e.g. "accepted-bogoljubov"
 * vs "accepted-teichmann-bxf3-classical" in the BDG course). */
export type OpeningLineInfo = {
  id: string;
  name: string;
  description?: string;
  tier: Tier;
};

/** Lightweight view of a line's metadata without its move path — what tier
 * and progress logic need, derived from wherever a `.line` marker sits in
 * the stored opening tree. See collectLineSummaries in openingTrainer.ts. */
export type OpeningLineSummary = OpeningLineInfo;

/**
 * A node in the *stored/authored* opening tree (a Trie over moves): playing
 * `san` from the parent's position leads here. Shared prefixes between
 * lines are stored once; lines diverge into separate `children`. This is
 * the course's persistence/authoring shape (JSON + the `opening_tree`
 * Mongo collection) — distinct from OpeningTree below, which is the
 * position-keyed structure the trainer builds from this at runtime.
 */
export type OpeningTrieNode = OpeningMove & {
  children?: OpeningTrieNode[];
  line?: OpeningLineInfo;
};

export type CourseTree = {
  id: string;
  title: string;
  shortDescription?: string;
  /** Path to the course's cover image under /public, e.g. "/course-images/italian-game.png". */
  image?: string;
  /** Which side the user plays/trains in this course. */
  colorToTrain: PieceColor;
  /** "startpos" for the standard initial position, or a custom FEN. */
  startingFen: string;
  root: OpeningTrieNode[];
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
