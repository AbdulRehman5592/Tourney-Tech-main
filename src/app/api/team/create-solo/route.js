// POST /api/team/create-solo
//
// Self-service team creation for single_player games -- unlike double_player
// games, there's no partner to find, so a registered player can just create
// their own one-person team directly instead of going through the
// send-request / accept / select-partner handshake.

import { Team } from "@/models/Team";
import { Tournament } from "@/models/Tournament";
import { Registration } from "@/models/Registration";
import { User } from "@/models/User";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { requireAuth } from "@/utils/server/auth";
import { parseForm } from "@/utils/server/parseForm";
import { getNextSequence } from "@/lib/utils";
import { assignTeamNumber } from "@/utils/server/teamNumbering";
import mongoose from "mongoose";

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(String(id));
}

export const POST = asyncHandler(async (req) => {
  const user = await requireAuth(req);
  const { fields } = await parseForm(req);
  const tournamentId = fields.tournamentId?.toString();
  const gameId = fields.gameId?.toString();

  if (!tournamentId || !gameId) {
    throw new ApiResponse(400, null, "tournamentId and gameId are required");
  }
  if (!isValidObjectId(tournamentId) || !isValidObjectId(gameId)) {
    throw new ApiResponse(400, null, "Invalid tournamentId or gameId");
  }

  const tournament = await Tournament.findById(tournamentId);
  if (!tournament) throw new ApiResponse(404, null, "Tournament not found");

  const gameConfig = tournament.games.find((g) => g.game.toString() === gameId);
  if (!gameConfig) throw new ApiResponse(404, null, "Game not found in this tournament");
  if (gameConfig.tournamentTeamType !== "single_player") {
    throw new ApiResponse(400, null, "This game is not a single-player game");
  }

  const registration = await Registration.findOne({
    tournament: tournamentId,
    user: user._id,
    "gameRegistrationDetails.games": gameId,
  });
  if (!registration) {
    throw new ApiResponse(400, null, "You are not registered for this game in this tournament");
  }

  const existingTeam = await Team.findOne({
    tournament: tournamentId,
    game: gameId,
    members: user._id,
  });
  if (existingTeam) {
    throw new ApiResponse(400, null, "You already have a team for this tournament and game");
  }

  const me = await User.findById(user._id).select("username region");
  const newSerial = await getNextSequence(`team-serial-${tournamentId}-${gameId}`);
  const numbering = await assignTeamNumber([me.region]);

  const team = await Team.create({
    tournament: new mongoose.Types.ObjectId(tournamentId),
    game: new mongoose.Types.ObjectId(gameId),
    members: [user._id],
    createdBy: user._id,
    serialNo: newSerial.toString(),
    name: me.username,
    ...numbering,
  });

  registration.gameRegistrationDetails.team = team._id;
  await registration.save();

  const populatedTeam = await Team.findById(team._id)
    .populate("tournament")
    .populate("members", "firstname lastname username email");

  return Response.json(
    new ApiResponse(201, { team: populatedTeam }, "Team created successfully")
  );
});
