// One-off migration script: backfills the `tier` field (1 = Foundation,
// 2 = Advanced, 3 = Master) onto lines already stored in MongoDB, using the
// seed JSON files in src/data/courses/ as the source of truth for which
// tier each line id belongs to. Unlike seedCourses.mjs, this does NOT
// overwrite whole course documents — it only sets `lines.$[line].tier` per
// line id via arrayFilters, so it can't clobber content that was edited
// through the admin UI after the last seed. Safe to re-run.
//
// Usage: node --env-file=.env scripts/migrateCourseTiers.mjs

import { MongoClient } from "mongodb";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COURSES_DIR = path.join(__dirname, "..", "src", "data", "courses");
const DB_NAME = "chess_opening_trainer";

async function main() {
  const uri = process.env.MONGO_DB_URI;
  if (!uri) {
    throw new Error(
      "MONGO_DB_URI is not set. Run with: node --env-file=.env scripts/migrateCourseTiers.mjs",
    );
  }

  const files = (await readdir(COURSES_DIR)).filter((name) => name.endsWith(".json"));
  if (files.length === 0) {
    console.log("No course JSON files found in", COURSES_DIR);
    return;
  }

  const client = new MongoClient(uri);
  await client.connect();

  try {
    const collection = client.db(DB_NAME).collection("courses");

    for (const file of files) {
      const raw = await readFile(path.join(COURSES_DIR, file), "utf-8");
      const course = JSON.parse(raw);

      const untiered = course.lines.filter((line) => !line.tier);
      if (untiered.length > 0) {
        throw new Error(
          `"${course.id}" has lines with no tier in the seed JSON: ${untiered
            .map((l) => l.id)
            .join(", ")}. Run scripts/addLineTiers.mjs first.`,
        );
      }

      const ops = course.lines.map((line) => ({
        updateOne: {
          filter: { id: course.id },
          update: { $set: { "lines.$[line].tier": line.tier } },
          arrayFilters: [{ "line.id": line.id }],
        },
      }));

      const result = await collection.bulkWrite(ops);
      console.log(
        `"${course.id}": matched ${result.matchedCount}, modified ${result.modifiedCount} line(s)`,
      );
    }
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
