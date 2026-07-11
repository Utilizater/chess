// Data access layer for learner progress. Mirrors openingRepository.ts:
// this is the only module that talks to the `user_course_progress`
// collection directly.

import type { Collection } from "mongodb";
import { getDb } from "@/lib/db/mongo";
import type { ProgressEventKind, UserCourseProgressDoc } from "./progressTypes";

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
      case "complete":
        inc[`${prefix}.completions`] = 1;
        if (clean) {
          inc[`${prefix}.cleanStreak`] = 1;
        } else {
          set[`${prefix}.cleanStreak`] = 0;
        }
        break;
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

  /** Every progress document for a user, keyed by courseId. */
  async listForUser(userId: string): Promise<Map<string, UserCourseProgressDoc>> {
    const collection = await getProgressCollection();
    const docs = await collection.find({ userId }, { projection: { _id: 0 } }).toArray();
    return new Map(docs.map((doc) => [doc.courseId, doc]));
  },
};
