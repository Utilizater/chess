// Data model for per-user, per-course training progress. Separate from
// openingTypes.ts because these documents track *learner activity* against
// a course, not the course content itself — one document per (userId,
// courseId) in the `user_course_progress` collection.

import type { Tier } from "./openingTypes";

export type ProgressEventKind = "correct" | "mistake" | "hint" | "complete";

export type LineProgress = {
  /** Cumulative correct moves played while drilling this line. */
  correctMoves: number;
  /** Cumulative moves attempted that weren't in the prepared tree. */
  mistakes: number;
  /** Cumulative Hint/Show Answer uses while drilling this line. */
  hintsUsed: number;
  /** Times the line was fully drilled through to "Line complete". */
  completions: number;
  /**
   * Length of the current streak of consecutive completions with zero
   * mistakes and zero hints during that specific run. Drives mastery — see
   * `computeLineStatus` in `progress.ts`.
   */
  cleanStreak: number;
  /**
   * True once this line has ever reached mastery. Never reset back to
   * false, even when `cleanStreak` drops — it's what lets a regressed line
   * be re-mastered with a single clean completion instead of a fresh
   * streak of three. See `computeLineStatus` in `progress.ts`.
   */
  everMastered: boolean;
  lastAttemptAt: Date;
};

export type UserCourseProgressDoc = {
  userId: string;
  courseId: string;
  /** Keyed by the id of a line marker in the course's opening tree. */
  lines: Record<string, LineProgress>;
  /**
   * Highest tier ever unlocked, persisted so a tier never re-locks after a
   * previously-mastered line regresses to needs-review. Absent on documents
   * written before this field existed; treat as 1 (the always-unlocked
   * floor) when missing. See `computeUnlockedTier` in `tiers.ts`.
   */
  highestUnlockedTier?: Tier;
  createdAt: Date;
  updatedAt: Date;
};
