// src\utils\server\tournamentPermissions.js

import { Tournament } from "@/models/Tournament";
import { ApiError } from "@/utils/server/ApiError";
import { User } from "@/models/User";

// Check if user has the required tournament-specific role.
// Accepts either a user id or a full user object (most call sites pass the
// object from requireAuth()) -- comparing that object directly against a
// staff member's ObjectId would always fail (`{}.toString()` is never a
// valid id), so it's normalized to a plain id string here first.
export async function requireTournamentStaff(
  tournamentId,
  userIdOrUser,
  allowedRoles = []
) {
  const tournament = await Tournament.findById(tournamentId);
  if (!tournament) throw new ApiError(404, "Tournament not found");

  const userId = (userIdOrUser?._id ?? userIdOrUser).toString();
  const isStaff = tournament.staff.some(
    (member) =>
      member.user.toString() === userId && allowedRoles.includes(member.role)
  );

  const user = await User.findById(userId);
  const isPlatformAdmin = user?.role === "admin";

  if (!isStaff && !isPlatformAdmin) {
    throw new ApiError(403, "You are not authorized to access this tournament");
  }

  return tournament;
}

// Non-throwing sibling for routes that must fall through to a different
// (e.g. player) branch instead of erroring when the caller isn't staff.
// `tournamentOrId` accepts either an id or an already-loaded Tournament doc
// so callers that already have one in hand don't pay for a second lookup.
export async function isTournamentStaff(
  tournamentOrId,
  userIdOrUser,
  allowedRoles = []
) {
  const tournament =
    tournamentOrId && typeof tournamentOrId === "object" && tournamentOrId.staff
      ? tournamentOrId
      : await Tournament.findById(tournamentOrId);
  if (!tournament) return false;

  const userId = (userIdOrUser?._id ?? userIdOrUser).toString();
  return tournament.staff.some(
    (member) =>
      member.user.toString() === userId && allowedRoles.includes(member.role)
  );
}
