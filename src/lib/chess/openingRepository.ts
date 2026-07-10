// Data access layer for courses. UI code should only ever talk to
// `courseRepository`, never talk to MongoDB or JSON files directly. That
// keeps the storage backend (currently MongoDB) an internal detail here,
// with no changes needed in components or pages if it changes again.

import type { Collection } from "mongodb";
import { getDb } from "@/lib/db/mongo";
import { buildOpeningTree } from "./openingTrainer";
import type { Course, OpeningLine, PieceColor } from "./openingTypes";

export type CourseSummary = {
  id: string;
  title: string;
  shortDescription?: string;
  colorToTrain: PieceColor;
};

interface CourseDataSource {
  listCourses(): Promise<CourseSummary[]>;
  getCourseById(id: string): Promise<Course | undefined>;
  /**
   * Replaces a course's lines wholesale. Used by the admin editor. Throws if
   * the new lines contain an illegal move, since that would corrupt the
   * opening tree for every trainee using the course.
   */
  updateCourseLines(courseId: string, lines: OpeningLine[]): Promise<Course>;
}

const COLLECTION_NAME = "courses";

async function getCoursesCollection(): Promise<Collection<Course>> {
  const db = await getDb();
  return db.collection<Course>(COLLECTION_NAME);
}

class MongoCourseDataSource implements CourseDataSource {
  async listCourses(): Promise<CourseSummary[]> {
    const collection = await getCoursesCollection();
    const courses = await collection
      .find({}, { projection: { _id: 0, id: 1, title: 1, shortDescription: 1, colorToTrain: 1 } })
      .toArray();
    return courses as unknown as CourseSummary[];
  }

  async getCourseById(id: string): Promise<Course | undefined> {
    const collection = await getCoursesCollection();
    const course = await collection.findOne({ id }, { projection: { _id: 0 } });
    return course ?? undefined;
  }

  async updateCourseLines(courseId: string, lines: OpeningLine[]): Promise<Course> {
    const collection = await getCoursesCollection();
    const existing = await collection.findOne({ id: courseId }, { projection: { _id: 0 } });
    if (!existing) {
      throw new Error(`Course "${courseId}" not found`);
    }

    const candidate: Course = { ...existing, lines };
    // Throws on any illegal move, which doubles as validation before saving.
    buildOpeningTree(candidate);

    await collection.updateOne({ id: courseId }, { $set: { lines } });
    return candidate;
  }
}

export const courseRepository: CourseDataSource = new MongoCourseDataSource();
