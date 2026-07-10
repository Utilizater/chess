"use client";

// Thin React wiring around the pure trainer logic in openingTrainer.ts.
// Components should only need what this hook returns; they shouldn't need
// to import chess.js or walk the opening tree themselves.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import type { Course } from "./openingTypes";
import { normalizeFen, resolveStartingFen } from "./fen";
import {
  attemptMove,
  buildOpeningTree,
  findPreparedMoveByResultingFen,
  getActiveLineNames,
  getAnswerText,
  getHintText,
  getPreparedMoves,
  getSessionStartState,
  isLineComplete,
  narrowActiveLineIds,
  pickOpponentMove,
  pickStartingLineId,
  type TrainerStatus,
} from "./openingTrainer";

export type { TrainerStatus } from "./openingTrainer";
export { STATUS_LABELS } from "./openingTrainer";

export type PieceDropArgs = {
  sourceSquare: string;
  targetSquare: string | null;
};

const OPPONENT_REPLY_DELAY_MS = 500;

export function useOpeningTrainer(course: Course) {
  const tree = useMemo(() => buildOpeningTree(course), [course]);
  const startingFen = useMemo(
    () => resolveStartingFen(course.startingFen),
    [course.startingFen],
  );
  const userColor = course.colorToTrain === "white" ? "w" : "b";

  const chessRef = useRef(new Chess(startingFen));
  // Bumped on every restart/next-line so a pending opponent-reply timeout
  // from a previous session can never apply itself to the new one.
  const sessionIdRef = useRef(0);

  // Lazy initializers run exactly once on mount, so the random starting
  // line is picked client-side without ever needing a "sync state in an
  // effect" pattern (which would also risk a hydration mismatch).
  const [biasLineId] = useState<string>(() => pickStartingLineId(course.lines));
  const activeLineIdsRef = useRef<string[]>([biasLineId]);
  const [fen, setFen] = useState(startingFen);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [activeLineIds, setActiveLineIds] = useState<string[]>([biasLineId]);
  const [sessionStart] = useState(() =>
    getSessionStartState(tree, startingFen, userColor),
  );
  const [status, setStatus] = useState<TrainerStatus>(sessionStart.status);
  const [feedback, setFeedback] = useState<string>(sessionStart.feedback);
  const [revealedAnswer, setRevealedAnswer] = useState<string | undefined>();
  const [lastMoveComment, setLastMoveComment] = useState<string | undefined>();

  const fenKey = normalizeFen(fen);
  const preparedMoves = getPreparedMoves(tree, fenKey);

  const beginSession = useCallback(
    (lineId: string) => {
      sessionIdRef.current += 1;
      chessRef.current = new Chess(startingFen);
      activeLineIdsRef.current = [lineId];

      setFen(startingFen);
      setMoveHistory([]);
      setActiveLineIds([lineId]);
      setRevealedAnswer(undefined);
      setLastMoveComment(undefined);

      const start = getSessionStartState(tree, startingFen, userColor);
      setStatus(start.status);
      setFeedback(start.feedback);
    },
    [startingFen, tree, userColor],
  );

  // Auto-play the opponent's prepared reply whenever it becomes their turn.
  useEffect(() => {
    if (status !== "opponent-thinking") return;
    const thisSessionId = sessionIdRef.current;

    const timeout = setTimeout(() => {
      if (sessionIdRef.current !== thisSessionId) return; // stale session

      const currentFenKey = normalizeFen(chessRef.current.fen());
      const allCandidates = getPreparedMoves(tree, currentFenKey);
      const biasedCandidates = allCandidates.filter((move) =>
        activeLineIdsRef.current.some((id) => move.lineIds.includes(id)),
      );
      const pool = biasedCandidates.length > 0 ? biasedCandidates : allCandidates;
      const chosen = pickOpponentMove(pool);
      if (!chosen) {
        setStatus("line-complete");
        setFeedback("Line complete!");
        return;
      }

      chessRef.current.move(chosen.san);
      const newFen = chessRef.current.fen();
      const newFenKey = normalizeFen(newFen);
      const newActiveLineIds = narrowActiveLineIds(activeLineIdsRef.current, chosen);
      activeLineIdsRef.current = newActiveLineIds;

      setFen(newFen);
      setMoveHistory((history) => [...history, chosen.san]);
      setActiveLineIds(newActiveLineIds);
      setLastMoveComment(chosen.comment);

      if (isLineComplete(tree, newFenKey)) {
        setStatus("line-complete");
        setFeedback(`Opponent replied: ${chosen.san}. Line complete!`);
      } else {
        setStatus("your-move");
        setFeedback(`Opponent replied: ${chosen.san}.`);
      }
    }, OPPONENT_REPLY_DELAY_MS);

    return () => clearTimeout(timeout);
  }, [status, tree]);

  const onPieceDrop = useCallback(
    ({ sourceSquare, targetSquare }: PieceDropArgs): boolean => {
      if (status === "opponent-thinking" || status === "line-complete") {
        return false;
      }
      if (!targetSquare) return false;

      const attempt = attemptMove(chessRef.current.fen(), sourceSquare, targetSquare);
      if (!attempt.legal) return false;

      const currentFenKey = normalizeFen(chessRef.current.fen());
      const resultingFenKey = normalizeFen(attempt.resultingFen);
      const match = findPreparedMoveByResultingFen(tree, currentFenKey, resultingFenKey);

      if (!match) {
        setStatus("incorrect");
        setFeedback("Not this line.");
        return false;
      }

      chessRef.current.move({ from: sourceSquare, to: targetSquare, promotion: "q" });
      const newFen = chessRef.current.fen();
      const newFenKey = normalizeFen(newFen);
      const newActiveLineIds = narrowActiveLineIds(activeLineIdsRef.current, match);
      activeLineIdsRef.current = newActiveLineIds;

      setFen(newFen);
      setMoveHistory((history) => [...history, match.san]);
      setActiveLineIds(newActiveLineIds);
      setRevealedAnswer(undefined);
      setLastMoveComment(match.comment);

      if (isLineComplete(tree, newFenKey)) {
        setStatus("line-complete");
        setFeedback("Correct! Line complete!");
      } else {
        setStatus("opponent-thinking");
        setFeedback("Correct!");
      }
      return true;
    },
    [status, tree],
  );

  const restartLine = useCallback(() => {
    beginSession(biasLineId);
  }, [beginSession, biasLineId]);

  const nextLine = useCallback(() => {
    const nextId = pickStartingLineId(course.lines, Math.random, biasLineId);
    beginSession(nextId);
  }, [beginSession, biasLineId, course.lines]);

  const requestHint = useCallback(() => {
    setFeedback(getHintText(preparedMoves));
  }, [preparedMoves]);

  const requestShowAnswer = useCallback(() => {
    const answer = getAnswerText(preparedMoves);
    setRevealedAnswer(answer);
    setFeedback(`Expected: ${answer}`);
  }, [preparedMoves]);

  const lineNames = getActiveLineNames(course, activeLineIds);
  const currentLineLabel =
    lineNames.length === 1
      ? lineNames[0]
      : lineNames.length > 1
        ? `${lineNames.length} possible lines`
        : "Unknown line";
  const lineDescription = course.lines.find((line) => line.id === biasLineId)
    ?.description;

  return {
    fen,
    moveHistory,
    status,
    feedback,
    revealedAnswer,
    currentLineLabel,
    explanation: lastMoveComment ?? lineDescription,
    boardOrientation: course.colorToTrain,
    canInteract: status === "your-move" || status === "incorrect",
    onPieceDrop,
    restartLine,
    nextLine,
    requestHint,
    requestShowAnswer,
  };
}
