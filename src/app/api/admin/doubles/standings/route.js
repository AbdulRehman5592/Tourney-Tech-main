// /api/admin/doubles/standings?tournamentId=&gameId=&mode=
//
// Ranks accepted doubles/mixed-doubles pairs for one tournament+game(+mode) by
// summing each side's individual score (see computePairStandings). Read-only:
// never creates/touches a Team, just reads existing bracket results.

import { TeamUp } from "@/models/TeamUp";
import { Tournament } from "@/models/Tournament";
import { ApiError } from "@/utils/server/ApiError";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { requireAdmin } from "@/utils/server/roleGuards";
import { computePairStandings } from "@/utils/server/doublesStandings";

export const GET = asyncHandler(async (req) => {
  await requireAdmin();

  const { searchParams } = new URL(req.url);
  const tournamentId = searchParams.get("tournamentId");
  const gameId = searchParams.get("gameId");
  const mode = searchParams.get("mode");

  if (!tournamentId || !gameId) {
    throw new ApiError(400, "tournamentId and gameId are required");
  }
  if (mode && !["doubles", "mixed_doubles"].includes(mode)) {
    throw new ApiError(400, "Invalid mode");
  }

  const tournament = await Tournament.findById(tournamentId).lean();
  if (!tournament) throw new ApiError(404, "Tournament not found");

  const gameConfig = tournament.games.find((g) => g.game.toString() === gameId);
  if (!gameConfig) throw new ApiError(404, "Game not found in this tournament");

  const query = { status: "accepted", tournament: tournamentId, gameId };
  if (mode) query.mode = mode;

  const acceptedPairs = await TeamUp.find(query)
    .populate("from", "firstname lastname username gender")
    .populate("to", "firstname lastname username gender")
    .lean();

  const pairs = acceptedPairs.map((p) => ({
    pairId: p._id,
    mode: p.mode,
    from: p.from,
    to: p.to,
    fromUserId: p.from._id,
    toUserId: p.to._id,
  }));

  const standings = await computePairStandings({
    tournamentId,
    gameId,
    winCriteria: gameConfig.winCriteria || "wins",
    pairs,
  });

  return Response.json(
    new ApiResponse(
      200,
      { winCriteria: gameConfig.winCriteria || "wins", standings },
      "Fetched doubles pair standings"
    )
  );
});
