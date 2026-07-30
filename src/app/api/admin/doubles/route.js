// /api/admin/doubles
//
// Admin tracking listing for doubles/mixed-doubles pairs: only ACCEPTED
// TeamUp requests are "pairs" -- pending/rejected requests never appear here,
// so a requestee who never responded never shows up in the output listing.

import { TeamUp } from "@/models/TeamUp";
import { Game } from "@/models/Game";
import "@/models/Tournament";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { requireAdmin } from "@/utils/server/roleGuards";

export const GET = asyncHandler(async (req) => {
  await requireAdmin();

  const { searchParams } = new URL(req.url);
  const tournamentId = searchParams.get("tournamentId");
  const mode = searchParams.get("mode");

  const query = { status: "accepted" };
  if (tournamentId) query.tournament = tournamentId;
  if (mode && ["doubles", "mixed_doubles"].includes(mode)) query.mode = mode;

  const pairs = await TeamUp.find(query)
    .populate("from", "firstname lastname username email gender")
    .populate("to", "firstname lastname username email gender")
    .populate("tournament", "name games")
    .sort({ createdAt: -1 })
    .lean();

  // gameId is stored as a plain string (not a schema ref), so populate it
  // manually rather than relying on Mongoose's ref-based populate.
  const gameIds = [...new Set(pairs.map((p) => p.gameId).filter(Boolean))];
  const games = await Game.find({ _id: { $in: gameIds } })
    .select("name")
    .lean();
  const gameNameById = new Map(games.map((g) => [g._id.toString(), g.name]));

  const pairsWithGameName = pairs.map((p) => ({
    ...p,
    gameName: gameNameById.get(p.gameId) || "Unknown game",
  }));

  return Response.json(
    new ApiResponse(200, { pairs: pairsWithGameName }, "Fetched doubles pairs")
  );
});
