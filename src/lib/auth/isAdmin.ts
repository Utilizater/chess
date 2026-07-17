import { cache } from "react";
import { auth } from "@clerk/nextjs/server";
import { userRepository } from "@/lib/db/userRepository";

// The authoritative admin check. Always call this (not the client-side
// useIsAdmin() context) before rendering or mutating anything admin-only —
// the context is for UI display, this is for authorization.
export const isCurrentUserAdmin = cache(async (): Promise<boolean> => {
  const { userId } = await auth();
  if (!userId) return false;
  return userRepository.isAdminByClerkId(userId);
});
