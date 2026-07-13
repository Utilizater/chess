// Data access layer for learner progress. Mirrors openingRepository.ts:
// this is the only module that talks to the `user_course_progress`
// collection directly.

import type { Collection } from "mongodb";
import { getDb } from "@/lib/db/mongo";
import { MASTERY_CLEAN_STREAK, REMASTERY_CLEAN_STREAK } from "./progress";
import type { ProgressEventKind, UserCourseProgressDoc } from "./progressTypes";
import { computeEligibleTier, type TieredLine } from "./tiers";

const COLLECTION_NAME = "user_course_progress";

// Created once per process and reused, same rationale as the MongoClient
// cache in mongo.ts — avoids re-issuing createIndex on every write.
let indexPromise: Promise<unknown> | undefined;

async function getProgressCollection(): Promise<Collection<UserCourseProgressDoc>> {
  const db = await getDb();
  const collection = db.collection<UserCourseProgressDoc>(COLLECTION_NAME);
  indexPromise ??= collection.createIndex({ userId: 1, courseId: 1 }, { unique: true });
  await indexPromise;
  return collection;
}

export const progressRepository = {
  /**
   * Records a single training event (a correct move, a mistake, a hint, or
   * a line completion) for one user/course/line, upserting the progress
   * document as needed. `clean` only matters for "complete" events: it
   * marks whether that particular run through the line had zero mistakes
   * and zero hints, which is what drives the line's clean streak.
   */
  async recordEvent(
    userId: string,
    courseId: string,
    lineId: string,
    kind: ProgressEventKind,
    clean = false,
  ): Promise<void> {
    const collection = await getProgressCollection();
    const now = new Date();
    const prefix = `lines.${lineId}`;

    const inc: Record<string, number> = {};
    const set: Record<string, unknown> = {
      [`${prefix}.lastAttemptAt`]: now,
      updatedAt: now,
    };

    switch (kind) {
      case "correct":
        inc[`${prefix}.correctMoves`] = 1;
        break;
      case "mistake":
        inc[`${prefix}.mistakes`] = 1;
        break;
      case "hint":
        inc[`${prefix}.hintsUsed`] = 1;
        break;
      case "complete": {
        // Whether this completion crosses the mastery bar depends on the
        // line's current streak and whether it's a first mastery or a
        // re-mastery, so (unlike the other event kinds) this needs a read
        // before the write rather than a plain $inc.
        const doc = await collection.findOne({ userId, courseId }, { projection: { [prefix]: 1 } });
        const existing = doc?.lines?.[lineId];
        const previousStreak = existing?.cleanStreak ?? 0;
        // Docs written before `everMastered` existed can already have a
        // qualifying streak; treat that as having been mastered too.
        const wasEverMastered = (existing?.everMastered ?? false) || previousStreak >= MASTERY_CLEAN_STREAK;
        const newStreak = clean ? previousStreak + 1 : 0;
        const requiredStreak = wasEverMastered ? REMASTERY_CLEAN_STREAK : MASTERY_CLEAN_STREAK;

        inc[`${prefix}.completions`] = 1;
        set[`${prefix}.cleanStreak`] = newStreak;
        if (newStreak >= requiredStreak) {
          set[`${prefix}.everMastered`] = true;
        }
        break;
      }
    }

    await collection.updateOne(
      { userId, courseId },
      {
        $inc: inc,
        $set: set,
        $setOnInsert: { userId, courseId, createdAt: now },
      },
      { upsert: true },
    );
  },

  /**
   * Recomputes whether current mastery justifies unlocking a new tier and,
   * if so, raises the persisted `highestUnlockedTier` floor. Only needs
   * calling after "complete" events — those are the only ones that can
   * change a line's status. See computeUnlockedTier in tiers.ts for why
   * this floor matters (tiers must never re-lock).
   */
  async syncUnlockedTier(userId: string, courseId: string, lines: TieredLine[]): Promise<void> {
    const collection = await getProgressCollection();
    const doc = (await collection.findOne({ userId, courseId }, { projection: { _id: 0 } })) ?? undefined;
    const eligible = computeEligibleTier(lines, doc);
    const persisted = doc?.highestUnlockedTier ?? 1;
    if (eligible <= persisted) return;

    const now = new Date();
    await collection.updateOne(
      { userId, courseId },
      {
        $max: { highestUnlockedTier: eligible },
        $set: { updatedAt: now },
        $setOnInsert: { userId, courseId, createdAt: now },
      },
      { upsert: true },
    );
  },

  /** Every progress document for a user, keyed by courseId. */
  async listForUser(userId: string): Promise<Map<string, UserCourseProgressDoc>> {
    const collection = await getProgressCollection();
    const docs = await collection.find({ userId }, { projection: { _id: 0 } }).toArray();
    return new Map(docs.map((doc) => [doc.courseId, doc]));
  },

  /** A single user's progress document for one course, if any activity exists. */
  async getForUserAndCourse(
    userId: string,
    courseId: string,
  ): Promise<UserCourseProgressDoc | undefined> {
    const collection = await getProgressCollection();
    const doc = await collection.findOne({ userId, courseId }, { projection: { _id: 0 } });
    return doc ?? undefined;
  },
};
