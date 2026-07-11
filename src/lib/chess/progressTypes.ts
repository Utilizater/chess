// Data model for per-user, per-course training progress. Separate from
// openingTypes.ts because these documents track *learner activity* against
// a course, not the course content itself — one document per (userId,
// courseId) in the `user_course_progress` collection.

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
  lastAttemptAt: Date;
};

export type UserCourseProgressDoc = {
  userId: string;
  courseId: string;
  /** Keyed by OpeningLine.id. */
  lines: Record<string, LineProgress>;
  createdAt: Date;
  updatedAt: Date;
};
