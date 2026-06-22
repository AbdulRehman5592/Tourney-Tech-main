// GET /api/tournaments/Id/similar-players/without-team

import { Registration } from "@/models/Registration";
import { Team } from "@/models/Team";
import { Tournament } from "@/models/Tournament";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { asyncHandler } from "@/utils/server/asyncHandler";
// import { parseForm } from "@/utils/server/parseForm";
// import { requireAuth } from "@/utils/server/auth";
import { requireAdmin } from "@/utils/server/roleGuards";

export const GET = asyncHandler(async (req, context) => {
  await requireAdmin(req);
  const { id: tournamentId } = context.params;
  const { searchParams } = new URL(req.url);
  const gameId = searchParams.get("gameId");

  // const { fields } = await parseForm(req);
  // const tournamentId = fields?.tournamentId?.toString();
  const tournament = await Tournament.findById(tournamentId);
  if (!tournament) {
    return Response.json(new ApiResponse(404, null, "Tournament not found"));
  }

  // ✅ Tournament ke sab registrations
  const registrations = await Registration.find({
    tournament: tournamentId,
    "gameRegistrationDetails.status": "approved",
    ...(gameId && { "gameRegistrationDetails.games": { $in: [gameId] } }),
  }).populate({
    path: "user",
    model: "User",
    select: "-password -refreshToken -accessToken -__v",
  });

  const teams = await Team.find({ tournament: tournamentId, game: gameId });

  const restrictedUserIds = new Set();
  teams.forEach((team) => {
    // Agar user ne team create ki hai
    restrictedUserIds.add(team.createdBy.toString());

    // Agar user kisi ka partner bana hai
    if (team.partner) {
      restrictedUserIds.add(team.partner.toString());
    }
  });

  // ✅ Filter out wo users jo na partner hain aur na creator
  const validUsers = registrations
    .map((r) => r.user)
    .filter((u) => !restrictedUserIds.has(u._id.toString()));

  return Response.json(
    new ApiResponse(
      200,
      { validUsers },
      "Fetched users who are not a partner and have not created any team"
    )
  );
});
