import { Tournament } from "@/models/Tournament";
import { Game } from "@/models/Game";
import { requireAuth } from "@/utils/server/auth";
import { requireTournamentStaff } from "@/utils/server/tournamentPermissions";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { ApiError } from "@/utils/server/ApiError";

// POST /api/tournaments/:id/games → Add game to tournament
export const POST = asyncHandler(async (req, context) => {
  const user = await requireAuth(req);
  const params = await context.params;
  const tournamentId = params.id;

  const body = await req.json();

  await requireTournamentStaff(tournamentId, user, [
    "admin",
    "owner",
    "organizer",
  ]);

  const {
    game,
    entryFee = 0,
    format,
    rounds,
    teamBased = true,
    tournamentTeamType,
  } = body;

  // ✅ Required fields
  if (!game || !rounds || !tournamentTeamType) {
    throw new ApiError(400, "Missing required fields");
  }

  // ✅ Validate enums
  const validFormats = ["double_elimination"];
  if (!validFormats.includes(format)) {
    throw new ApiError(400, "Invalid format");
  }

  if (!["single_player", "double_player"].includes(tournamentTeamType)) {
    throw new ApiError(400, "Invalid tournamentTeamType");
  }

  // ✅ Validate game exists
  const gameExists = await Game.exists({ _id: game });
  if (!gameExists) {
    throw new ApiError(404, "Game not found");
  }

  // ✅ Validate tournament exists
  const tournament = await Tournament.findById(tournamentId);
  if (!tournament) throw new ApiError(404, "Tournament not found");

  // ✅ Prevent duplicate games
  const alreadyExists = tournament.games.some(
    (g) => g.game.toString() === game
  );
  if (alreadyExists) {
    throw new ApiError(409, "Game already added to this tournament");
  }

  // ✅ Push new game config
  tournament.games.push({
    game,
    entryFee,
    format,
    rounds,
    teamBased,
    tournamentTeamType,
  });
  await tournament.save();

  return Response.json({ success: true, tournamentId, addedGame: game });
});

// GET /api/tournaments/:id/games → List all configured games
export const GET = asyncHandler(async (_req, context) => {
  const params = await context.params;
  const tournamentId = params.id;

  const tournament = await Tournament.findById(tournamentId)
    .populate("games.game")
    .select("games");

  if (!tournament) throw new ApiError(404, "Tournament not found");

  return Response.json({ games: tournament.games });
});
