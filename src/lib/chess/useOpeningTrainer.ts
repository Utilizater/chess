"use client";

// Thin React wiring around the pure trainer logic in openingTrainer.ts.
// Components should only need what this hook returns; they shouldn't need
// to import chess.js or walk the opening tree themselves.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess, type Square } from "chess.js";
import type { Course, Tier } from "./openingTypes";
import { normalizeFen, resolveStartingFen } from "./fen";
import { recordProgressEvent } from "./progressClient";
import type { LineStatus } from "./progress";
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

export type SquareClickArgs = {
  square: string;
  piece: { pieceType: string } | null;
};

export type LegalTarget = {
  square: string;
  capture: boolean;
};

const OPPONENT_REPLY_DELAY_MS = 500;

export function useOpeningTrainer(
  course: Course,
  unlockedTier: Tier,
  lineStatuses: Record<string, LineStatus> = {},
) {
  // Locked-tier lines are excluded from the trainable set entirely — not
  // just from line selection but from tree building, so the app-controlled
  // opponent can never reply into a position that only exists in a locked
  // line.
  const trainableCourse = useMemo<Course>(
    () => ({ ...course, lines: course.lines.filter((line) => line.tier <= unlockedTier) }),
    [course, unlockedTier],
  );
  const tree = useMemo(() => buildOpeningTree(trainableCourse), [trainableCourse]);
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
  const [biasLineId] = useState<string>(() =>
    pickStartingLineId(trainableCourse.lines, lineStatuses),
  );
  const activeLineIdsRef = useRef<string[]>([biasLineId]);
  // The line id the current drill run is being recorded against (distinct
  // from biasLineId, which is fixed at mount for opponent-reply biasing).
  const sessionLineIdRef = useRef<string>(biasLineId);
  // Whether any mistake or hint has occurred so far in the current drill
  // run — determines whether a completion counts as "clean" for mastery.
  const sessionHadMistakeOrHintRef = useRef(false);
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
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);

  const fenKey = normalizeFen(fen);
  const preparedMoves = getPreparedMoves(tree, fenKey);

  const beginSession = useCallback(
    (lineId: string) => {
      sessionIdRef.current += 1;
      chessRef.current = new Chess(startingFen);
      activeLineIdsRef.current = [lineId];
      sessionLineIdRef.current = lineId;
      sessionHadMistakeOrHintRef.current = false;

      setFen(startingFen);
      setMoveHistory([]);
      setActiveLineIds([lineId]);
      setRevealedAnswer(undefined);
      setLastMoveComment(undefined);
      setSelectedSquare(null);

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
        recordProgressEvent(
          course.id,
          sessionLineIdRef.current,
          "complete",
          !sessionHadMistakeOrHintRef.current,
        );
        setStatus("line-complete");
        setFeedback(`Opponent replied: ${chosen.san}. Line complete!`);
      } else {
        setStatus("your-move");
        setFeedback(`Opponent replied: ${chosen.san}.`);
      }
    }, OPPONENT_REPLY_DELAY_MS);

    return () => clearTimeout(timeout);
  }, [status, tree, course.id]);

  // Shared by drag-and-drop and tap-to-move: validates and applies a
  // from/to move, updating trainer state accordingly.
  const applyUserMove = useCallback(
    (sourceSquare: string, targetSquare: string): boolean => {
      const attempt = attemptMove(chessRef.current.fen(), sourceSquare, targetSquare);
      if (!attempt.legal) return false;

      const currentFenKey = normalizeFen(chessRef.current.fen());
      const resultingFenKey = normalizeFen(attempt.resultingFen);
      const match = findPreparedMoveByResultingFen(tree, currentFenKey, resultingFenKey);

      if (!match) {
        recordProgressEvent(course.id, sessionLineIdRef.current, "mistake");
        sessionHadMistakeOrHintRef.current = true;
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

      recordProgressEvent(course.id, sessionLineIdRef.current, "correct");

      if (isLineComplete(tree, newFenKey)) {
        recordProgressEvent(
          course.id,
          sessionLineIdRef.current,
          "complete",
          !sessionHadMistakeOrHintRef.current,
        );
        setStatus("line-complete");
        setFeedback("Correct! Line complete!");
      } else {
        setStatus("opponent-thinking");
        setFeedback("Correct!");
      }
      return true;
    },
    [tree, course.id],
  );

  const onPieceDrop = useCallback(
    ({ sourceSquare, targetSquare }: PieceDropArgs): boolean => {
      if (status === "opponent-thinking" || status === "line-complete") {
        return false;
      }
      if (!targetSquare) return false;
      setSelectedSquare(null);
      return applyUserMove(sourceSquare, targetSquare);
    },
    [status, applyUserMove],
  );

  // Legal destination squares (by chess rules, not just prepared lines) for
  // the currently selected square, so tap-to-move can highlight them like a
  // mobile chess app.
  const legalTargets = useMemo<LegalTarget[]>(() => {
    if (!selectedSquare) return [];
    try {
      // Built from the `fen` state rather than chessRef so this stays a
      // pure render-time computation (no ref reads during render).
      return new Chess(fen)
        .moves({ square: selectedSquare as Square, verbose: true })
        .map((move) => ({
          square: move.to,
          capture: Boolean(move.captured) || move.flags.includes("e"),
        }));
    } catch {
      return [];
    }
  }, [selectedSquare, fen]);

  const onSquareClick = useCallback(
    ({ square, piece }: SquareClickArgs) => {
      if (status === "opponent-thinking" || status === "line-complete") return;

      const isOwnPiece = piece !== null && piece.pieceType[0] === userColor;

      if (!selectedSquare) {
        if (isOwnPiece) setSelectedSquare(square);
        return;
      }

      if (square === selectedSquare) {
        setSelectedSquare(null);
        return;
      }

      if (legalTargets.some((target) => target.square === square)) {
        setSelectedSquare(null);
        applyUserMove(selectedSquare, square);
        return;
      }

      setSelectedSquare(isOwnPiece ? square : null);
    },
    [status, selectedSquare, legalTargets, userColor, applyUserMove],
  );

  const restartLine = useCallback(() => {
    beginSession(biasLineId);
  }, [beginSession, biasLineId]);

  const nextLine = useCallback(() => {
    const nextId = pickStartingLineId(trainableCourse.lines, lineStatuses, Math.random, biasLineId);
    beginSession(nextId);
  }, [beginSession, biasLineId, trainableCourse.lines, lineStatuses]);

  const requestHint = useCallback(() => {
    recordProgressEvent(course.id, sessionLineIdRef.current, "hint");
    sessionHadMistakeOrHintRef.current = true;
    setFeedback(getHintText(preparedMoves));
  }, [preparedMoves, course.id]);

  const requestShowAnswer = useCallback(() => {
    recordProgressEvent(course.id, sessionLineIdRef.current, "hint");
    sessionHadMistakeOrHintRef.current = true;
    const answer = getAnswerText(preparedMoves);
    setRevealedAnswer(answer);
    setFeedback(`Expected: ${answer}`);
  }, [preparedMoves, course.id]);

  const lineNames = getActiveLineNames(trainableCourse, activeLineIds);
  const currentLineLabel =
    lineNames.length === 1
      ? lineNames[0]
      : lineNames.length > 1
        ? `${lineNames.length} possible lines`
        : "Unknown line";
  const lineDescription = trainableCourse.lines.find((line) => line.id === biasLineId)
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
    selectedSquare,
    legalTargets,
    onSquareClick,
    restartLine,
    nextLine,
    requestHint,
    requestShowAnswer,
  };
}
