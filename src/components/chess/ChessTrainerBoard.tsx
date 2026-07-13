"use client";

import { useEffect, useMemo, useState } from "react";
import { Chessboard } from "react-chessboard";
import type { Course, Tier } from "@/lib/chess/openingTypes";
import type { LineStatus } from "@/lib/chess/progress";
import { useOpeningTrainer } from "@/lib/chess/useOpeningTrainer";
import { TrainingPanel } from "./TrainingPanel";

const SELECTED_SQUARE_STYLE: React.CSSProperties = {
  backgroundColor: "rgba(180, 83, 9, 0.35)",
};
const CAPTURE_TARGET_STYLE: React.CSSProperties = {
  boxShadow: "inset 0 0 0 4px rgba(180, 83, 9, 0.55)",
  cursor: "pointer",
};
const MOVE_TARGET_STYLE: React.CSSProperties = {
  backgroundImage:
    "radial-gradient(circle, rgba(180, 83, 9, 0.45) 20%, transparent 21%)",
  cursor: "pointer",
};

/** Coarse (touch) pointers get tap-to-move only; drag stays available where
 * a mouse makes it precise. Avoids the "scrolling the whole page while
 * trying to drag a piece" problem on phones. */
function useIsCoarsePointer() {
  const [isCoarse, setIsCoarse] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(pointer: coarse)");
    const update = () => setIsCoarse(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return isCoarse;
}

export function ChessTrainerBoard({
  course,
  unlockedTier,
  lineStatuses,
}: {
  course: Course;
  unlockedTier: Tier;
  lineStatuses: Record<string, LineStatus>;
}) {
  const {
    fen,
    moveHistory,
    status,
    feedback,
    explanation,
    currentLineLabel,
    boardOrientation,
    canInteract,
    onPieceDrop,
    selectedSquare,
    legalTargets,
    onSquareClick,
    restartLine,
    nextLine,
    requestHint,
    requestShowAnswer,
  } = useOpeningTrainer(course, unlockedTier, lineStatuses);

  const isCoarsePointer = useIsCoarsePointer();

  const squareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};
    if (selectedSquare) {
      styles[selectedSquare] = SELECTED_SQUARE_STYLE;
    }
    for (const target of legalTargets) {
      styles[target.square] = target.capture
        ? CAPTURE_TARGET_STYLE
        : MOVE_TARGET_STYLE;
    }
    return styles;
  }, [selectedSquare, legalTargets]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 lg:flex-row lg:items-start lg:gap-6 lg:p-6">
      <div className="mx-auto w-full max-w-[560px] lg:mx-0 lg:flex-1">
        <div className="rounded-2xl border border-amber-900/10 bg-white p-3 shadow-md sm:p-4 dark:border-amber-100/10 dark:bg-stone-900">
          <Chessboard
            options={{
              id: "opening-trainer-board",
              position: fen,
              boardOrientation,
              allowDragging: canInteract && !isCoarsePointer,
              squareStyles,
              dropSquareStyle: {
                boxShadow: "inset 0 0 0 3px rgba(180, 83, 9, 0.6)",
              },
              onPieceDrop: ({ sourceSquare, targetSquare }) =>
                onPieceDrop({ sourceSquare, targetSquare }),
              onSquareClick: ({ square, piece }) =>
                onSquareClick({ square, piece }),
            }}
          />
        </div>
      </div>

      <div className="w-full lg:w-[380px] lg:shrink-0">
        <TrainingPanel
          courseTitle={course.title}
          currentLineLabel={currentLineLabel}
          moveHistory={moveHistory}
          status={status}
          feedback={feedback}
          explanation={explanation}
          onHint={requestHint}
          onShowAnswer={requestShowAnswer}
          onRestartLine={restartLine}
          onNextLine={nextLine}
          hintDisabled={!canInteract}
        />
      </div>
    </div>
  );
}
