// GET /api/tournaments/unassigned-users

import { Registration } from "@/models/Registration";
import { Team } from "@/models/Team";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { requireAdmin } from "@/utils/server/roleGuards";

export const GET = asyncHandler(async (req) => {
  await requireAdmin(req);

  // ✅ Get all approved registrations
  const registrations = await Registration.find({
    "gameRegistrationDetails.status": "approved",
  }).populate({
    path: "user",
    model: "User",
    select: "-password -refreshToken -accessToken -__v",
  });

  // ✅ Get all teams
  const teams = await Team.find();

  // ✅ Build a set of all assigned user IDs
  const assignedUserIds = new Set();
  teams.forEach((team) => {
    assignedUserIds.add(team.createdBy.toString());
    team.members.forEach((m) => assignedUserIds.add(m.toString()));
    if (team.partner) {
      assignedUserIds.add(team.partner.toString());
    }
  });

  // ✅ Filter registrations to only unassigned users
  const unassignedUsers = registrations
    .map((r) => r.user)
    .filter((u) => !assignedUserIds.has(u._id.toString()));

  return Response.json(
    new ApiResponse(
      200,
      { unassignedUsers },
      "Fetched all users who are registered but not in any team"
    )
  );
});
