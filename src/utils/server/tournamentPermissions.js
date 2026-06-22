// src\utils\server\tournamentPermissions.js

import { Tournament } from "@/models/Tournament";
import { ApiError } from "@/utils/server/ApiError";
import { User } from "@/models/User";

// Check if user has the required tournament-specific role
export async function requireTournamentStaff(
  tournamentId,
  userId,
  allowedRoles = []
) {
  const tournament = await Tournament.findById(tournamentId);
  if (!tournament) throw new ApiError(404, "Tournament not found");

  const isStaff = tournament.staff.some(
    (member) =>
      member.user.toString() === userId.toString() &&
      allowedRoles.includes(member.role)
  );

  const user = await User.findById(userId);
  const isPlatformAdmin =
    user?.role === "admin" ||
    (Array.isArray(user?.roles) && user.roles.includes("admin"));

  if (!isStaff && !isPlatformAdmin) {
    throw new ApiError(403, "You are not authorized to access this tournament");
  }

  return tournament;
}
