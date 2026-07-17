import { getDb } from "@/lib/db/mongo";

export type UserDoc = {
  clerkId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  isAdmin: boolean;
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
        // isAdmin is deliberately excluded: it's granted out-of-band (see
        // scripts/setAdminUsers.mjs), and this upsert runs on every
        // signed-in request, so setting it here would clobber that grant.
        $set: {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          imageUrl: user.imageUrl,
          updatedAt: now,
        },
        $setOnInsert: { clerkId: user.id, createdAt: now, isAdmin: false },
      },
      { upsert: true },
    );
  },

  async deleteByClerkId(clerkId: string) {
    const users = await getUsersCollection();
    await users.deleteOne({ clerkId });
  },

  async isAdminByClerkId(clerkId: string): Promise<boolean> {
    const users = await getUsersCollection();
    const user = await users.findOne({ clerkId }, { projection: { isAdmin: 1 } });
    return user?.isAdmin ?? false;
  },
};
