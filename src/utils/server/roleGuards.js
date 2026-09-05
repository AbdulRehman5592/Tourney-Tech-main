// src/utils/server/roleGuards.js

import { requireAuth, requireRole } from "./auth.js";
import { ApiError } from "./ApiError.js";

export async function requireAdmin() {
  const user = await requireAuth();
  requireRole(user, "admin");
  return user;
}

// Global, admin-granted capability (User.canCreateTournaments) -- separate
// from the per-tournament staff roles (owner/organizer/manager/support),
// which only apply once a tournament already exists. This just gates
// whether the caller may create one in the first place.
export async function requireTournamentCreator() {
  const user = await requireAuth();
  if (user.role !== "admin" && !user.canCreateTournaments) {
    throw new ApiError(403, "You are not authorized to create tournaments");
  }
  return user;
}

export async function requireManager() {
  const user = await requireAuth();
  requireRole(user, "manager");
  return user;
}

export async function requireAnyRole(roles = []) {
  const user = await requireAuth();
  requireRole(user, roles);
  return user;
}
