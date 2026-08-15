// src\app\api\tournaments\[id]\games\[gid]\finalize-round1\route.js

import { Tournament } from "@/models/Tournament";
import { Match } from "@/models/Match";
import { Team } from "@/models/Team";
import { requireAuth } from "@/utils/server/auth";
import { requireTournamentStaff } from "@/utils/server/tournamentPermissions";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { ApiError } from "@/utils/server/ApiError";
import { ApiResponse } from "@/utils/server/ApiResponse";
import {
  buildSingleElimination,
  buildSingleEliminationWithProtectedSeed,
  buildDoubleElimination,
  computeStandingsRoundRobin,
  computeStandingsMesh,
  assignTableNumbers,
} from "@/utils/server/tournamentBracket";
import { propagateByeWinners } from "@/utils/server/bracketProgression";
import "@/models/Game";

// POST /api/tournaments/:id/games/:gid/finalize-round1
// Admin decision after a round_robin/mesh/standard round 1 finishes: crown
// the standings winner outright, or take the top N into a single-elimination
// playoff bracket.
export const POST = asyncHandler(async (req, context) => {
  const user = await requireAuth(req);
  const params = await context.params;
  const tournamentId = params.id;
  const gameConfigId = params.gid;

  await requireTournamentStaff(tournamentId, user, [
    "admin",
    "owner",
    "organizer",
  ]);

  const tournament = await Tournament.findById(tournamentId);
  if (!tournament) throw new ApiError(404, "Tournament not found");

  const gameConfig = tournament.games.id(gameConfigId);
  if (!gameConfig) throw new ApiError(404, "Game config not found");

  if (!["round_robin", "mesh", "standard"].includes(gameConfig.format)) {
    throw new ApiError(
      400,
      "Finalizing round 1 only applies to round_robin, mesh, or standard formats"
    );
  }
  if (gameConfig.round1Status !== "awaiting_playoff_decision") {
    throw new ApiError(400, "Round 1 is not yet complete for this game");
  }

  const body = await req.json();
  const { playoff, qualifiersCount, protectedSeedTeamId, rewardByeType, playoffFormat } = body;

  const round1Matches = await Match.find({
    tournament: tournamentId,
    game: gameConfig.game,
    stage: "round1",
  });
  const teams = await Team.find({
    tournament: tournamentId,
    game: gameConfig.game,
  });

  // Mesh tallies standings the same flat way as round robin (no pools) --
  // computeStandingsMesh is kept as a distinct export in case mesh's
  // standings ever need to diverge, but today it's the same function.
  const criteria = gameConfig.winCriteria || "wins";
  const standings =
    gameConfig.format === "mesh"
      ? computeStandingsMesh(round1Matches, teams, criteria)
      : computeStandingsRoundRobin(round1Matches, teams, criteria);

  if (!playoff) {
    const champion = standings[0];
    gameConfig.winner = champion?.teamId;
    gameConfig.round1Status = "completed";
    await tournament.save();

    return Response.json(
      new ApiResponse(
        200,
        { winner: champion?.teamId ?? null },
        "Tournament decided by round 1 standings"
      )
    );
  }

  const count = Number(qualifiersCount);
  if (!count || count < 2 || count > standings.length) {
    throw new ApiError(
      400,
      `qualifiersCount must be between 2 and ${standings.length}`
    );
  }

  const teamById = new Map(teams.map((t) => [t._id.toString(), t]));
  const qualifierTeams = standings
    .slice(0, count)
    .map((s) => teamById.get(s.teamId))
    .filter(Boolean);

  const format = playoffFormat || gameConfig.playoffFormat || "single_elimination";
  if (!["single_elimination", "double_elimination"].includes(format)) {
    throw new ApiError(400, "Invalid playoffFormat");
  }

  // Reward bye / protected seed is a single-elimination-only mechanic --
  // double elimination's winners/losers structure doesn't support it (see
  // buildDoubleElimination); a double-elim playoff just gets automatic byes
  // for non-power-of-two qualifier counts, same as single elimination does.
  const byeDepth = format === "single_elimination" ? rewardByeType || "none" : "none";
  const matchDocs =
    format === "double_elimination"
      ? buildDoubleElimination(qualifierTeams, { seeded: true })
      : byeDepth !== "none" && protectedSeedTeamId
        ? buildSingleEliminationWithProtectedSeed(qualifierTeams, {
            protectedTeamId: protectedSeedTeamId,
            byeDepth,
            seeded: true,
          })
        : buildSingleElimination(qualifierTeams, { seeded: true });
  assignTableNumbers(matchDocs);

  gameConfig.playoffFormat = format;
  if (byeDepth !== "none" && protectedSeedTeamId) {
    gameConfig.rewardByeType = byeDepth;
    gameConfig.protectedSeedTeam = protectedSeedTeamId;
  }

  const existingCount = await Match.countDocuments({
    tournament: tournamentId,
    game: gameConfig.game,
  });
  let matchNumber = existingCount + 1;

  const created = [];
  for (const m of matchDocs) {
    const match = await Match.create({
      tournament: tournamentId,
      game: gameConfig.game,
      matchNumber: matchNumber++,
      admin: user._id,
      ...m,
      stage: "playoff",
    });
    created.push(match);
  }

  await propagateByeWinners(created);

  gameConfig.round1Status = "completed";
  await tournament.save();

  return Response.json(
    new ApiResponse(201, created, `Playoff bracket created for top ${count} teams`)
  );
});
