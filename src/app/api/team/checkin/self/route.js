// src\app\api\team\checkin\self\route.js
//
// "One player from a team checks in": self-service, no staff role needed --
// just requires check-in to actually be open and the caller to be on the
// team. Checking in any one member marks the whole team present.

import { Tournament } from "@/models/Tournament";
import { Team } from "@/models/Team";
import { requireAuth } from "@/utils/server/auth";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { ApiError } from "@/utils/server/ApiError";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { hasRejectedRegistration } from "@/utils/server/registrationEligibility";

export const POST = asyncHandler(async (req) => {
  const user = await requireAuth(req);
  const body = await req.json();
  const tournamentId = body?.tournamentId?.toString();
  const gameConfigId = body?.gameConfigId?.toString();

  if (!tournamentId || !gameConfigId) {
    throw new ApiError(400, "tournamentId and gameConfigId are required");
  }

  const tournament = await Tournament.findById(tournamentId);
  if (!tournament) throw new ApiError(404, "Tournament not found");
  const gameConfig = tournament.games.id(gameConfigId);
  if (!gameConfig) throw new ApiError(404, "Game not found in this tournament");
  if (!gameConfig.checkInOpen) {
    throw new ApiError(400, "Check-in is not open for this game yet");
  }

  const team = await Team.findOne({
    tournament: tournamentId,
    gameConfigId,
    members: user._id,
  });
  if (!team) {
    throw new ApiError(
      400,
      "You don't have a team for this game yet -- form/join one first"
    );
  }

  if (
    await hasRejectedRegistration({
      tournamentId,
      gameConfigId,
      userIds: team.members,
    })
  ) {
    throw new ApiError(
      400,
      "This team's registration for this game was rejected -- contact the organizer"
    );
  }

  if (!team.checkedIn) {
    team.checkedIn = true;
    team.checkedInAt = new Date();
    team.checkedInBy = user._id;
    await team.save();
  }

  return Response.json(
    new ApiResponse(200, { team }, "Checked in successfully")
  );
});
