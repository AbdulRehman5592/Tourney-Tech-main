// src\app\api\tournaments\[id]\games\[gid]\route.js

import { Tournament } from "@/models/Tournament";
import { requireAuth } from "@/utils/server/auth";
import { requireTournamentStaff } from "@/utils/server/tournamentPermissions";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { ApiError } from "@/utils/server/ApiError";
import { validateDoublesConfig } from "@/utils/server/doublesConfig";
import { parseScheduledAt } from "@/utils/server/gameSchedule";

// PATCH /api/tournaments/:id/games/:gid → Update a tournament game's config
export const PATCH = asyncHandler(async (req, context) => {
  const user = await requireAuth(req);
  const params = await context.params;
  const tournamentId = params.id;
  const gameConfigId = params.gid;

  const body = await req.json();

  // Check if user is allowed
  await requireTournamentStaff(tournamentId, user, [
    "admin",
    "owner",
    "organizer",
  ]);

  // Fetch tournament
  const tournament = await Tournament.findById(tournamentId);
  if (!tournament) throw new ApiError(404, "Tournament not found");

  // Find specific game config
  const game = tournament.games.id(gameConfigId);
  if (!game) throw new ApiError(404, "Game config not found");

  // Allowed fields according to schema
  const allowedFields = [
    "game",
    "entryFee",
    "format",
    "meshRounds",
    "standardRounds",
    "standardDirection",
    "rewardByeType",
    "winCriteria",
    "playoffEnabled",
    "playoffQualifiersCount",
    "teamBased",
    "tournamentTeamType",
    "doublesEnabled",
    "doublesCost",
    "mixedDoublesEnabled",
    "mixedDoublesCost",
  ];
  allowedFields.forEach((field) => {
    if (field in body) {
      game[field] = body[field];
    }
  });

  // Date/time needs parsing (and null must clear it) rather than a raw assign.
  if ("scheduledAt" in body) {
    game.scheduledAt = parseScheduledAt(body.scheduledAt);
  }

  // Validate enums manually if needed
  const validFormats = [
    "round_robin",
    "mesh",
    "standard",
    "single_elimination",
    "double_elimination",
  ];
  if (body.format && !validFormats.includes(body.format)) {
    throw new ApiError(400, "Invalid format");
  }

  if (body.tournamentTeamType && !["single_player", "double_player"].includes(body.tournamentTeamType)) {
    throw new ApiError(400, "Invalid tournamentTeamType");
  }

  if (body.winCriteria && !["wins", "hands", "points"].includes(body.winCriteria)) {
    throw new ApiError(400, "Invalid winCriteria");
  }

  if (body.standardDirection && !["up", "down"].includes(body.standardDirection)) {
    throw new ApiError(400, "Invalid standardDirection");
  }

  const effectiveFormat = body.format || game.format;
  if (effectiveFormat === "mesh") {
    const rounds = "meshRounds" in body ? Number(body.meshRounds) : game.meshRounds;
    if (!rounds || rounds < 1) {
      throw new ApiError(400, "meshRounds is required for the mesh format");
    }
  }
  if (effectiveFormat === "standard") {
    const rounds =
      "standardRounds" in body ? Number(body.standardRounds) : game.standardRounds;
    if (rounds !== undefined && rounds !== null && rounds !== "" && rounds < 1) {
      throw new ApiError(400, "standardRounds must be at least 1 when set");
    }
  }

  const effectiveByeType = "rewardByeType" in body ? body.rewardByeType : game.rewardByeType;
  const validByeTypes = [
    "none",
    "first_round",
    "quarterfinal",
    "semifinal",
    "final_four",
    "championship",
  ];
  if (effectiveByeType && !validByeTypes.includes(effectiveByeType)) {
    throw new ApiError(400, "Invalid rewardByeType");
  }
  if (effectiveByeType && effectiveByeType !== "none" && effectiveFormat !== "single_elimination") {
    throw new ApiError(400, "Reward bye is only supported for the single_elimination format");
  }

  const effectivePlayoffEnabled =
    "playoffEnabled" in body ? body.playoffEnabled : game.playoffEnabled;
  if (effectivePlayoffEnabled && !["round_robin", "mesh", "standard"].includes(effectiveFormat)) {
    throw new ApiError(400, "Playoff plan is only supported for round_robin, mesh, or standard formats");
  }
  if (
    "playoffQualifiersCount" in body &&
    body.playoffQualifiersCount !== undefined &&
    body.playoffQualifiersCount !== "" &&
    Number(body.playoffQualifiersCount) < 2
  ) {
    throw new ApiError(400, "playoffQualifiersCount must be at least 2");
  }

  validateDoublesConfig(game);

  // Save tournament
  await tournament.save();

  return Response.json({ success: true, updatedGame: game });
});

// DELETE /api/tournaments/:id/games/:gid → Remov egame from tournament
export const DELETE = asyncHandler(async (req, context) => {
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

  const found = tournament.games.id(gameConfigId);
  if (!found) throw new ApiError(404, "Game config not found");

  tournament.games.pull(gameConfigId);

  // Removing the last game leaves nothing to play -- fall back to draft.
  if (tournament.games.length === 0) {
    tournament.status = "draft";
  }

  await tournament.save();

  return Response.json({ success: true, removedGame: gameConfigId });
});
