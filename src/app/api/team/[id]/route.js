import { asyncHandler } from "@/utils/server/asyncHandler";
import { requireAdmin } from "@/utils/server/roleGuards";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { Team } from "@/models/Team";
import { Tournament } from "@/models/Tournament";
import mongoose from "mongoose";

// ✅ Partial Update Team
// Note: tournament/game/gameConfigId are intentionally NOT editable here --
// Match/BracketGroup documents already generated for this team key off the
// team's original tournament+gameConfigId, so reassigning them after the
// fact would desync bracket/match data. Only members (and name/logo) can
// change; the team's tournament and game stay fixed at creation.
export const PATCH = asyncHandler(async (req, { params }) => {
  await requireAdmin();

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiResponse(400, null, "Invalid team ID");
  }

  const body = await req.json();
  const { name, logo, members } = body;

  const team = await Team.findById(id);
  if (!team) {
    throw new ApiResponse(404, null, "Team not found");
  }

  if (members) {
    if (!members.every((memberId) => mongoose.Types.ObjectId.isValid(memberId))) {
      throw new ApiResponse(400, null, "Invalid member IDs");
    }

    if (new Set(members.map(String)).size !== members.length) {
      throw new ApiResponse(400, null, "The same player can't fill more than one member slot on a team");
    }

    // Team size is dictated by the game's configured tournamentTeamType --
    // single_player games form a solo "team" of 1, double_player games need a
    // pair (mirrors the check in POST /api/team, which was missing here).
    const tournamentDoc = await Tournament.findById(team.tournament).select("games");
    const gameConfig = tournamentDoc?.games?.id(team.gameConfigId);
    const expectedSize = gameConfig?.tournamentTeamType === "single_player" ? 1 : 2;

    if (members.length !== expectedSize) {
      throw new ApiResponse(
        400,
        null,
        `Exactly ${expectedSize} member${expectedSize > 1 ? "s are" : " is"} required for this team`
      );
    }

    // A member can't already be on another team for this same tournament+game.
    const conflictingTeam = await Team.findOne({
      _id: { $ne: team._id },
      tournament: team.tournament,
      gameConfigId: team.gameConfigId,
      members: { $in: members },
    });

    if (conflictingTeam) {
      throw new ApiResponse(
        400,
        null,
        "One or both users are already in another team for this tournament and game"
      );
    }
  }

  // Update only provided fields
  if (name) team.name = name;
  if (logo !== undefined) team.logo = logo;
  if (members) team.members = members;

  await team.save();

  return Response.json(
    new ApiResponse(200, team, "Team updated successfully")
  );
});

// ✅ Delete Team
export const DELETE = asyncHandler(async (req, { params }) => {
  await requireAdmin();

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiResponse(400, null, "Invalid team ID");
  }

  const team = await Team.findByIdAndDelete(id);
  if (!team) {
    throw new ApiResponse(404, null, "Team not found");
  }

  return Response.json(
    new ApiResponse(200, null, "Team deleted successfully")
  );
});
