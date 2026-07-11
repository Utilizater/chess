import { currentUser } from "@clerk/nextjs/server";
import { userRepository } from "@/lib/db/userRepository";

export async function syncCurrentUser() {
  const user = await currentUser();
  if (!user) return;

  try {
    await userRepository.upsertFromClerk({
      id: user.id,
      email:
        user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)
          ?.emailAddress ?? null,
      firstName: user.firstName,
      lastName: user.lastName,
      imageUrl: user.imageUrl,
    });
  } catch (error) {
    // A Mongo hiccup shouldn't take down every page for signed-in users.
    console.error("Failed to sync current user to MongoDB:", error);
  }
}
