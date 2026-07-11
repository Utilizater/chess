import { getDb } from "@/lib/db/mongo";

export type UserDoc = {
  clerkId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
};

async function getUsersCollection() {
  const db = await getDb();
  return db.collection<UserDoc>("users");
}

export const userRepository = {
  async upsertFromClerk(user: {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    imageUrl: string | null;
  }) {
    const users = await getUsersCollection();
    const now = new Date();
    await users.updateOne(
      { clerkId: user.id },
      {
        $set: {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          imageUrl: user.imageUrl,
          updatedAt: now,
        },
        $setOnInsert: { clerkId: user.id, createdAt: now },
      },
      { upsert: true },
    );
  },

  async deleteByClerkId(clerkId: string) {
    const users = await getUsersCollection();
    await users.deleteOne({ clerkId });
  },
};
