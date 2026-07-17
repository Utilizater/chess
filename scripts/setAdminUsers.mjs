// One-off script: grants admin rights (isAdmin: true) to user records
// matching the emails below. Safe to re-run.
//
// Usage: node --env-file=.env scripts/setAdminUsers.mjs

import { MongoClient } from "mongodb";

const DB_NAME = "chess_opening_trainer";
const ADMIN_EMAILS = ["utilizater@gmail.com"];

async function main() {
  const uri = process.env.MONGO_DB_URI;
  if (!uri) {
    throw new Error(
      "MONGO_DB_URI is not set. Run with: node --env-file=.env scripts/setAdminUsers.mjs",
    );
  }

  const client = new MongoClient(uri);
  await client.connect();

  try {
    const users = client.db(DB_NAME).collection("users");
    const result = await users.updateMany(
      { email: { $in: ADMIN_EMAILS } },
      { $set: { isAdmin: true, updatedAt: new Date() } },
    );
    console.log(
      `Matched ${result.matchedCount} user(s) for ${ADMIN_EMAILS.join(", ")}, granted admin to ${result.modifiedCount}.`,
    );
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
