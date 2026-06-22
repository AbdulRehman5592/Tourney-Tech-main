// src/utils/server/roleGuards.js

import { requireAuth, requireRole } from "./auth.js";

export async function requireAdmin() {
  const user = await requireAuth();
  requireRole(user, "admin");
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
