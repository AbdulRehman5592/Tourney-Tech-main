// src/app/api/sitting-arrangements/route.js

import { SittingArrangment } from "@/models/SittingArrangment";
import { Tournament } from "@/models/Tournament";
import { Game } from "@/models/Game";
import { ApiError } from "@/utils/server/ApiError";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { requireAuth } from "@/utils/server/auth";
// import { uploadOnCloudinary } from "@/utils/server/cloudinary";
import { parseForm } from "@/utils/server/parseForm";
import { asyncHandler } from "@/utils/server/asyncHandler";
import "@/models/User";

export const POST = asyncHandler(async (req) => {
  const user = await requireAuth();
  const { fields } = await parseForm(req);

  const tournamentId = fields.tournamentId?.toString();
  const gameId = fields.gameId?.toString();
  const galleryId = fields.galleryId?.toString();

  if (!tournamentId || !gameId) {
    throw new ApiError(400, "Missing required fields");
  }

  // ✅ check tournament exists
  const tournament = await Tournament.findById(tournamentId);
  if (!tournament) throw new ApiError(404, "Tournament not found");

  // ✅ check game exists
  const game = await Game.findById(gameId);
  if (!game) throw new ApiError(404, "Game not found");

  // ✅ optional: check that the game is part of this tournament
  const belongsToTournament = tournament.games.some(
    (g) => g.game.toString() === gameId
  );
  if (!belongsToTournament) {
    throw new ApiError(
      400,
      "This game does not belong to the selected tournament"
    );
  }

  const sittingCreate = await SittingArrangment.create({
    tournament: tournament._id,
    game: game._id, // ✅ always store a valid Game ObjectId
    gallery: galleryId,
    user: user._id,
  });

  // ✅ populate right away so you return full data
  const populated = await SittingArrangment.findById(sittingCreate._id)
    .populate("game tournament user gallery")
    .lean();

  return Response.json(
    new ApiResponse(201, populated, "Sitting Arrangment created successfully")
  );
});

export const GET = asyncHandler(async () => {
  const user = await requireAuth();

  const sittingArrangements = await SittingArrangment.find({ user })
    .populate("game tournament user gallery")
    .lean();

  return Response.json(
    new ApiResponse(
      200,
      sittingArrangements,
      "Sitting Arrangements fetched successfully"
    )
  );
});
