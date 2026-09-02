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

  // "team" mode requests form a real roster Team, not a doubles pair -- this
  // report is doubles/mixed_doubles only, so exclude them whether or not a
  // specific mode filter was requested.
  const query = {
    status: "accepted",
    mode: mode && ["doubles", "mixed_doubles"].includes(mode) ? mode : { $in: ["doubles", "mixed_doubles"] },
  };
  if (tournamentId) query.tournament = tournamentId;

  const pairs = await TeamUp.find(query)
    .populate("from", "firstname lastname username email gender")
    .populate("to", "firstname lastname username email gender")
    .populate("tournament", "name games")
    .sort({ createdAt: -1 })
    .lean();

  // p.gameId is a plain string (not a schema ref) holding the specific
  // scheduled instance id (Tournament.games[]._id), not the catalog game id
  // -- resolve instance -> catalog game -> name in two steps.
  const gameConfigFor = (p) =>
    p.tournament?.games?.find((g) => g._id?.toString() === p.gameId);

  const catalogGameIds = [
    ...new Set(
      pairs
        .map((p) => gameConfigFor(p)?.game?.toString())
        .filter(Boolean)
    ),
  ];
  const games = await Game.find({ _id: { $in: catalogGameIds } })
    .select("name")
    .lean();
  const gameNameById = new Map(games.map((g) => [g._id.toString(), g.name]));

  const pairsWithGameName = pairs.map((p) => {
    const catalogGameId = gameConfigFor(p)?.game?.toString();
    return {
      ...p,
      gameName: (catalogGameId && gameNameById.get(catalogGameId)) || "Unknown game",
    };
  });

  return Response.json(
    new ApiResponse(200, { pairs: pairsWithGameName }, "Fetched doubles pairs")
  );
});
