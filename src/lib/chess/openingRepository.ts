// Data access layer for courses. UI code should only ever talk to
// `courseRepository`, never talk to MongoDB or JSON files directly. That
// keeps the storage backend (currently MongoDB) an internal detail here,
// with no changes needed in components or pages if it changes again.

import type { Collection } from "mongodb";
import { getDb } from "@/lib/db/mongo";
import { buildOpeningTree, collectLineSummaries } from "./openingTrainer";
import type { CourseTree, OpeningLineSummary, OpeningTrieNode, PieceColor } from "./openingTypes";

export type CourseSummary = {
  id: string;
  title: string;
  shortDescription?: string;
  image?: string;
  colorToTrain: PieceColor;
  /** id + tier for every named line in the course, for progress/tier aggregation. */
  lines: Pick<OpeningLineSummary, "id" | "tier">[];
};

interface CourseDataSource {
  listCourses(): Promise<CourseSummary[]>;
  getCourseById(id: string): Promise<CourseTree | undefined>;
  /**
   * Replaces a course's move tree wholesale. Used by the admin editor.
   * Throws if the new tree contains an illegal move, since that would
   * corrupt the opening tree for every trainee using the course.
   */
  updateCourseTree(courseId: string, root: OpeningTrieNode[]): Promise<CourseTree>;
}

const COLLECTION_NAME = "opening_tree";

async function getCoursesCollection(): Promise<Collection<CourseTree>> {
  const db = await getDb();
  return db.collection<CourseTree>(COLLECTION_NAME);
}

class MongoCourseDataSource implements CourseDataSource {
  async listCourses(): Promise<CourseSummary[]> {
    const collection = await getCoursesCollection();
    const courses = await collection
      .find(
        {},
        {
          projection: {
            _id: 0,
            id: 1,
            title: 1,
            shortDescription: 1,
            image: 1,
            colorToTrain: 1,
            root: 1,
          },
        },
      )
      .toArray();
    return courses.map((course) => ({
      id: course.id,
      title: course.title,
      shortDescription: course.shortDescription,
      image: course.image,
      colorToTrain: course.colorToTrain,
      lines: collectLineSummaries(course.root).map((line) => ({ id: line.id, tier: line.tier })),
    }));
  }

  async getCourseById(id: string): Promise<CourseTree | undefined> {
    const collection = await getCoursesCollection();
    const course = await collection.findOne({ id }, { projection: { _id: 0 } });
    return course ?? undefined;
  }

  async updateCourseTree(courseId: string, root: OpeningTrieNode[]): Promise<CourseTree> {
    const collection = await getCoursesCollection();
    const existing = await collection.findOne({ id: courseId }, { projection: { _id: 0 } });
    if (!existing) {
      throw new Error(`Course "${courseId}" not found`);
    }

    const candidate: CourseTree = { ...existing, root };
    // Throws on any illegal move, which doubles as validation before saving.
    buildOpeningTree(candidate);

    await collection.updateOne({ id: courseId }, { $set: { root } });
    return candidate;
  }
}

export const courseRepository: CourseDataSource = new MongoCourseDataSource();
