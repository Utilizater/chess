"use client";

import { Chessboard } from "react-chessboard";
import type { Course } from "@/lib/chess/openingTypes";
import { useOpeningTrainer } from "@/lib/chess/useOpeningTrainer";
import { TrainingPanel } from "./TrainingPanel";

export function ChessTrainerBoard({ course }: { course: Course }) {
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
    restartLine,
    nextLine,
    requestHint,
    requestShowAnswer,
  } = useOpeningTrainer(course);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 lg:flex-row lg:items-start lg:gap-6 lg:p-6">
      <div className="mx-auto w-full max-w-[560px] lg:mx-0 lg:flex-1">
        <Chessboard
          options={{
            id: "opening-trainer-board",
            position: fen,
            boardOrientation,
            allowDragging: canInteract,
            onPieceDrop: ({ sourceSquare, targetSquare }) =>
              onPieceDrop({ sourceSquare, targetSquare }),
          }}
        />
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
