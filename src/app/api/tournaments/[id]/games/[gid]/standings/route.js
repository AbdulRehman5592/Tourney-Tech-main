// src\app\api\tournaments\[id]\games\[gid]\standings\route.js
//
// Read-only ranked standings for a round_robin/mesh/standard game -- used
// both to preview who's leading before staff decide on a playoff, and as the
// final results view once round1Status is "completed" with no playoff.
// Open to any authenticated user (players included), unlike the
// stop/continue/playoff decision actions themselves, which are staff-only.

import { Tournament } from "@/models/Tournament";
import { Match } from "@/models/Match";
import { Team } from "@/models/Team";
import { requireAuth } from "@/utils/server/auth";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { ApiError } from "@/utils/server/ApiError";
import { ApiResponse } from "@/utils/server/ApiResponse";
import {
  computeStandingsRoundRobin,
  computeStandingsMesh,
} from "@/utils/server/tournamentBracket";

export const GET = asyncHandler(async (req, context) => {
  await requireAuth(req);
  const params = await context.params;
  const tournamentId = params.id;
  const gameConfigId = params.gid;

  const tournament = await Tournament.findById(tournamentId);
  if (!tournament) throw new ApiError(404, "Tournament not found");
  const gameConfig = tournament.games.id(gameConfigId);
  if (!gameConfig) throw new ApiError(404, "Game not found in this tournament");

  if (!["round_robin", "mesh", "standard"].includes(gameConfig.format)) {
    throw new ApiError(
      400,
      "Standings only apply to round_robin, mesh, or standard formats"
    );
  }

  const round1Matches = await Match.find({
    tournament: tournamentId,
    gameConfigId,
    stage: "round1",
  }).lean();
  const teams = await Team.find({ tournament: tournamentId, gameConfigId, checkedIn: true })
    .select("name displayId serialNo")
    .lean();

  const criteria = gameConfig.winCriteria || "wins";
  const ranked =
    gameConfig.format === "mesh"
      ? computeStandingsMesh(round1Matches, teams, criteria)
      : computeStandingsRoundRobin(round1Matches, teams, criteria);

  const teamById = new Map(teams.map((t) => [t._id.toString(), t]));
  const standings = ranked.map((row, index) => ({
    rank: index + 1,
    teamId: row.teamId,
    name: teamById.get(row.teamId)?.name,
    displayId:
      teamById.get(row.teamId)?.displayId || teamById.get(row.teamId)?.serialNo,
    wins: row.wins,
    pointsFor: row.pointsFor,
    pointsAgainst: row.pointsAgainst,
    handsFor: row.handsFor,
  }));

  return Response.json(
    new ApiResponse(
      200,
      {
        criteria,
        standings,
        winner:
          gameConfig.round1Status === "completed" ? gameConfig.winner : null,
      },
      "Standings fetched"
    )
  );
});
