// Helper for authoring new course lines from a PGN movetext instead of
// hand-writing SAN arrays. Not wired into the UI yet, but keeps course data
// entry easy to extend later without touching the trainer or tree logic.

import { Chess } from "chess.js";
import type { OpeningMove } from "./openingTypes";

/**
 * Parses PGN movetext (e.g. "1. d4 d5 2. e4 dxe4") into the OpeningMove[]
 * shape used by course JSON. Throws if the PGN contains an illegal move.
 */
export function parsePgnToOpeningMoves(pgn: string): OpeningMove[] {
  const chess = new Chess();
  chess.loadPgn(pgn);
  return chess.history().map((san) => ({ san }));
}
