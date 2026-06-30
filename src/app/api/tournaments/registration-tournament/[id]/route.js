import { Registration } from "@/models/Registration";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { ApiError } from "@/utils/server/ApiError";
import { asyncHandler } from "@/utils/server/asyncHandler";
import "@/models/Game";
import { requireAuth } from "@/utils/server/auth";
import { Tournament } from "@/models/Tournament";
import { Team } from "@/models/Team";

export const GET = asyncHandler(async (_, context) => {
  const id = context.params?.id;
  const user = await requireAuth();

  if (!id) throw new ApiError(400, "ID parameter is missing");

  const tournament = await Tournament.findById(id).populate("games.game");

  if (!tournament) {
    throw new ApiError(404, "Tournament not found");
  }

  if (user?.role === "admin") {
    return Response.json(
      new ApiResponse(200, tournament, "Registered Games fetched successfully")
    );
  }

  const registrations = await Registration.find({
    tournament: id,
    user: user._id,
  })
    .populate("gameRegistrationDetails.games")
    .populate("gameRegistrationDetails.team")
    .lean();

  if (Array.isArray(registrations) && registrations.length > 0) {
    return Response.json(
      new ApiResponse(200, registrations, "Registered games fetched successfully")
    );
  }

  const existUserTeam = await Team.exists({
    tournament: id,
    members: user._id,
  });

  if (existUserTeam) {
    return Response.json(
      new ApiResponse(200, tournament, "Tournament games fetched by team membership")
    );
  }

  return Response.json(
    new ApiResponse(200, [], "No registered games found")
  );
});
