// POST /api/team/create-solo
//
// Self-service team creation for single_player games -- unlike double_player
// games, there's no partner to find, so a registered player can just create
// their own one-person team directly instead of going through the
// send-request / accept / select-partner handshake.

import { Team } from "@/models/Team";
import { Tournament } from "@/models/Tournament";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { requireAuth } from "@/utils/server/auth";
import { parseForm } from "@/utils/server/parseForm";
import { createSoloTeam } from "@/utils/server/soloTeam";
import mongoose from "mongoose";

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(String(id));
}

export const POST = asyncHandler(async (req) => {
  const user = await requireAuth(req);
  const { fields } = await parseForm(req);
  const tournamentId = fields.tournamentId?.toString();
  // The specific scheduled instance (Tournament.games[]._id), not the
  // catalog game id -- the same catalog game can be scheduled more than
  // once in one tournament as fully independent competitions.
  const gameConfigId = fields.gameId?.toString();

  if (!tournamentId || !gameConfigId) {
    throw new ApiResponse(400, null, "tournamentId and gameId are required");
  }
  if (!isValidObjectId(tournamentId) || !isValidObjectId(gameConfigId)) {
    throw new ApiResponse(400, null, "Invalid tournamentId or gameId");
  }

  const tournament = await Tournament.findById(tournamentId);
  if (!tournament) throw new ApiResponse(404, null, "Tournament not found");

  const existingTeam = await Team.findOne({
    tournament: tournamentId,
    gameConfigId,
    members: user._id,
  });
  if (existingTeam) {
    throw new ApiResponse(400, null, "You already have a team for this tournament and game");
  }

  const team = await createSoloTeam({ tournament, gameConfigId, userId: user._id });

  const populatedTeam = await Team.findById(team._id)
    .populate("tournament")
    .populate("members", "firstname lastname username email");

  return Response.json(
    new ApiResponse(201, { team: populatedTeam }, "Team created successfully")
  );
});
