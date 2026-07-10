// One-off migration script: uploads the course JSON files in
// src/data/courses/ into MongoDB. Safe to re-run — each course is upserted
// by its `id`, so re-running just overwrites the seeded data.
//
// Usage: node --env-file=.env scripts/seedCourses.mjs

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
      "MONGO_DB_URI is not set. Run with: node --env-file=.env scripts/seedCourses.mjs",
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
    await collection.createIndex({ id: 1 }, { unique: true });

    for (const file of files) {
      const raw = await readFile(path.join(COURSES_DIR, file), "utf-8");
      const course = JSON.parse(raw);
      await collection.updateOne(
        { id: course.id },
        { $set: course },
        { upsert: true },
      );
      console.log(`Seeded "${course.id}" (${course.lines.length} lines)`);
    }
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
