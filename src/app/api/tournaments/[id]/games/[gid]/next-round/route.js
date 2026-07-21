// src\app\api\tournaments\[id]\games\[gid]\next-round\route.js
//
// Standard (fixed-home rotation) format, indefinite mode only: once the
// current round is fully played, the admin is asked "another round?" here.
// { continue: true }  -> generate and create the next round's matches.
// { continue: false } -> stop; hand off to the normal finalize-round1 flow
//                        (crown the standings winner, or start a playoff).

import { Tournament } from "@/models/Tournament";
import { Match } from "@/models/Match";
import { Team } from "@/models/Team";
import { requireAuth } from "@/utils/server/auth";
import { requireTournamentStaff } from "@/utils/server/tournamentPermissions";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { ApiError } from "@/utils/server/ApiError";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { buildStandardRotation } from "@/utils/server/tournamentBracket";
import "@/models/Game";

export const POST = asyncHandler(async (req, context) => {
  const user = await requireAuth(req);
  const params = await context.params;
  const tournamentId = params.id;
  const gameConfigId = params.gid;

  await requireTournamentStaff(tournamentId, user, ["admin", "owner", "organizer"]);

  const tournament = await Tournament.findById(tournamentId);
  if (!tournament) throw new ApiError(404, "Tournament not found");

  const gameConfig = tournament.games.id(gameConfigId);
  if (!gameConfig) throw new ApiError(404, "Game config not found");

  if (gameConfig.format !== "standard") {
    throw new ApiError(400, "Next-round decisions only apply to the standard format");
  }
  if (gameConfig.standardRounds) {
    throw new ApiError(
      400,
      "This game has a fixed round count -- there's no round-by-round decision to make"
    );
  }
  if (gameConfig.round1Status !== "awaiting_next_round_decision") {
    throw new ApiError(400, "This game isn't waiting on a next-round decision");
  }

  const body = await req.json();
  const wantsAnotherRound = body?.continue === true || body?.continue === "true";

  if (!wantsAnotherRound) {
    gameConfig.round1Status = "awaiting_playoff_decision";
    await tournament.save();
    return Response.json(
      new ApiResponse(200, { round1Status: gameConfig.round1Status }, "Rotation stopped")
    );
  }

  const lastRoundMatch = await Match.findOne({
    tournament: tournamentId,
    game: gameConfig.game,
    stage: "round1",
  }).sort({ round: -1 });
  const nextRound = (lastRoundMatch?.round || 0) + 1;

  const teams = await Team.find({ tournament: tournamentId, game: gameConfig.game });
  const matchDocs = buildStandardRotation(teams, {
    direction: gameConfig.standardDirection,
    fromRound: nextRound,
    count: 1,
  });
  matchDocs.forEach((m) => {
    m.tableNumber = m.slot;
  });

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
    });
    created.push(match);
  }

  gameConfig.round1Status = "in_progress";
  await tournament.save();

  return Response.json(
    new ApiResponse(201, created, `Round ${nextRound} matches created successfully`)
  );
});
