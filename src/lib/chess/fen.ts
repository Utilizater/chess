// Helpers for treating FEN as a position identity key.
//
// A full FEN string encodes six fields:
//   piece placement, side to move, castling rights, en passant target,
//   halfmove clock, fullmove number
//
// The last two fields (halfmove clock, fullmove number) do not affect which
// position we're in for opening-tree purposes -- the same position reached
// via different move orders or move counts should map to the same tree
// node. We strip them so the tree can be keyed reliably.

export const STANDARD_START_FEN =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

/**
 * Normalizes a FEN string to just the fields that define position identity:
 * piece placement, side to move, castling rights, en passant square.
 */
export function normalizeFen(fen: string): string {
  const fields = fen.trim().split(/\s+/);
  const [placement, sideToMove, castling, enPassant] = fields;
  return [placement, sideToMove, castling, enPassant].join(" ");
}

/** Resolves the course's `startingFen` field to an actual FEN string. */
export function resolveStartingFen(startingFen: string): string {
  return startingFen === "startpos" ? STANDARD_START_FEN : startingFen;
}
