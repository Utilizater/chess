"use client";

// The trainer board picks a random starting line on mount, which would
// differ between server and client renders and cause a hydration
// mismatch. Loading it with ssr disabled sidesteps that entirely: it only
// ever renders client-side, where the random pick is consistent.

import dynamic from "next/dynamic";
import type { CourseTree, Tier } from "@/lib/chess/openingTypes";
import type { LineStatus } from "@/lib/chess/progress";

const ChessTrainerBoard = dynamic(
  () => import("./ChessTrainerBoard").then((mod) => mod.ChessTrainerBoard),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[400px] flex-1 items-center justify-center text-stone-500 dark:text-stone-400">
        Loading trainer...
      </div>
    ),
  },
);

export function ChessTrainerBoardLoader({
  course,
  unlockedTier,
  lineStatuses,
}: {
  course: CourseTree;
  unlockedTier: Tier;
  lineStatuses: Record<string, LineStatus>;
}) {
  return (
    <ChessTrainerBoard course={course} unlockedTier={unlockedTier} lineStatuses={lineStatuses} />
  );
}
