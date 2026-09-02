import { Tournament } from "@/models/Tournament";
import { Game } from "@/models/Game";
import { requireAuth } from "@/utils/server/auth";
import { requireTournamentStaff } from "@/utils/server/tournamentPermissions";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { ApiError } from "@/utils/server/ApiError";
import { validateDoublesConfig } from "@/utils/server/doublesConfig";
import { parseScheduledAt } from "@/utils/server/gameSchedule";
import { findSchedulingConflict } from "@/utils/server/tournamentGames";

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
    scheduledAt,
    eventTitle,
    locations,
    format,
    meshRounds,
    standardRounds,
    standardDirection = "up",
    rewardByeType = "none",
    winCriteria = "wins",
    playoffEnabled = false,
    playoffQualifiersCount,
    playoffFormat = "single_elimination",
    teamBased = true,
    tournamentTeamType,
    doublesEnabled = false,
    doublesCost = 0,
    mixedDoublesEnabled = false,
    mixedDoublesCost = 0,
  } = body;

  // ✅ Required fields
  if (!game || !format || !tournamentTeamType) {
    throw new ApiError(400, "Missing required fields");
  }
  if (!eventTitle || !eventTitle.toString().trim()) {
    throw new ApiError(400, "Event title is required");
  }

  // ✅ Validate enums
  const validFormats = [
    "round_robin",
    "mesh",
    "standard",
    "single_elimination",
    "double_elimination",
  ];
  if (!validFormats.includes(format)) {
    throw new ApiError(400, "Invalid format");
  }

  if (!["single_player", "double_player"].includes(tournamentTeamType)) {
    throw new ApiError(400, "Invalid tournamentTeamType");
  }

  if (!["wins", "hands", "points"].includes(winCriteria)) {
    throw new ApiError(400, "Invalid winCriteria");
  }

  // Mesh (table-movement) format has no default round count -- it must be
  // set explicitly so it's never silently skipped at setup.
  if (format === "mesh" && (!meshRounds || Number(meshRounds) < 1)) {
    throw new ApiError(400, "meshRounds is required for the mesh format");
  }

  if (format === "standard") {
    if (!["up", "down"].includes(standardDirection)) {
      throw new ApiError(400, "Invalid standardDirection");
    }
    // standardRounds is intentionally optional -- omitted means "run
    // indefinitely, one round at a time, until the admin says stop."
    if (standardRounds !== undefined && standardRounds !== "" && Number(standardRounds) < 1) {
      throw new ApiError(400, "standardRounds must be at least 1 when set");
    }
  }

  const validByeTypes = [
    "none",
    "first_round",
    "quarterfinal",
    "semifinal",
    "final_four",
    "championship",
  ];
  if (!validByeTypes.includes(rewardByeType)) {
    throw new ApiError(400, "Invalid rewardByeType");
  }
  if (rewardByeType !== "none" && format !== "single_elimination") {
    throw new ApiError(400, "Reward bye is only supported for the single_elimination format");
  }

  if (playoffEnabled && !["round_robin", "mesh", "standard"].includes(format)) {
    throw new ApiError(400, "Playoff plan is only supported for round_robin, mesh, or standard formats");
  }
  if (playoffQualifiersCount !== undefined && playoffQualifiersCount !== "" && Number(playoffQualifiersCount) < 2) {
    throw new ApiError(400, "playoffQualifiersCount must be at least 2");
  }
  if (!["single_elimination", "double_elimination"].includes(playoffFormat)) {
    throw new ApiError(400, "Invalid playoffFormat");
  }

  validateDoublesConfig({
    tournamentTeamType,
    doublesEnabled,
    doublesCost,
    mixedDoublesEnabled,
    mixedDoublesCost,
  });

  // ✅ Validate game exists
  const gameDoc = await Game.findById(game).select("name");
  if (!gameDoc) {
    throw new ApiError(404, "Game not found");
  }

  // ✅ Validate tournament exists
  const tournament = await Tournament.findById(tournamentId);
  if (!tournament) throw new ApiError(404, "Tournament not found");

  // ✅ Prevent duplicate games -- the same game can be added more than once
  // only when each entry has its own distinct, explicitly scheduled time.
  const parsedScheduledAt = parseScheduledAt(scheduledAt);
  const conflict = findSchedulingConflict(tournament.games, game, parsedScheduledAt);
  if (conflict) {
    throw new ApiError(
      409,
      `"${gameDoc.name}" is already added to this tournament at this time. Give it a different date/time to add it again.`
    );
  }

  // ✅ Push new game config
  tournament.games.push({
    game,
    entryFee,
    scheduledAt: parsedScheduledAt,
    eventTitle: eventTitle.toString().trim(),
    locations: Array.isArray(locations)
      ? locations.map((l) => l?.toString().trim()).filter(Boolean)
      : [],
    format,
    meshRounds: format === "mesh" ? Number(meshRounds) : undefined,
    standardDirection: format === "standard" ? standardDirection : undefined,
    standardRounds:
      format === "standard" && standardRounds ? Number(standardRounds) : undefined,
    rewardByeType,
    winCriteria,
    playoffEnabled,
    playoffQualifiersCount:
      playoffEnabled && playoffQualifiersCount ? Number(playoffQualifiersCount) : undefined,
    playoffFormat,
    teamBased,
    tournamentTeamType,
    doublesEnabled,
    doublesCost: doublesEnabled ? Number(doublesCost) : 0,
    mixedDoublesEnabled,
    mixedDoublesCost: mixedDoublesEnabled ? Number(mixedDoublesCost) : 0,
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
