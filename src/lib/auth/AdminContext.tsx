"use client";

import { createContext, useContext, type ReactNode } from "react";

const AdminContext = createContext(false);

// Populated once in the root layout from the server-side isAdmin check, so
// client components can read admin status without their own DB round trip.
// This only gates what's shown in the UI — actual admin pages/routes must
// still call isCurrentUserAdmin() themselves for authorization.
export function AdminProvider({
  isAdmin,
  children,
}: {
  isAdmin: boolean;
  children: ReactNode;
}) {
  return <AdminContext.Provider value={isAdmin}>{children}</AdminContext.Provider>;
}

export function useIsAdmin() {
  return useContext(AdminContext);
}
