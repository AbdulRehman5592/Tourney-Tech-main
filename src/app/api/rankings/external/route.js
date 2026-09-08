import { asyncHandler } from "@/utils/server/asyncHandler";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { ApiError } from "@/utils/server/ApiError";
import { requireAdmin } from "@/utils/server/roleGuards";
import { ExternalRankingAward } from "@/models/ExternalRankingAward";
import { GameType } from "@/models/GameType";
import { User } from "@/models/User";
import { pointsForPlacement } from "@/utils/server/nationalRankings";
import mongoose from "mongoose";

// Manual entry point for ranking points earned at a tournament run outside
// Tourney Tech (see the National Ranking & External Tournament Import
// guide). Points are always derived here from tableCount + placement using
// the same tier table as native events -- the caller can never submit a
// raw point value.
export const POST = asyncHandler(async (req) => {
  const admin = await requireAdmin();

  const body = await req.json();
  const { user, gameType, eventName, eventDate, tableCount, placement, notes } = body;

  if (!user || !gameType || !eventName || !eventDate || !tableCount || !placement) {
    throw new ApiError(
      400,
      "Player, game type, event name, event date, table count, and placement are all required"
    );
  }

  if (!mongoose.Types.ObjectId.isValid(user)) {
    throw new ApiError(400, "Invalid player selected");
  }

  const userDoc = await User.findById(user).select("_id");
  if (!userDoc) throw new ApiError(404, "Player not found");

  const gameTypeDoc = await GameType.findOne({ name: gameType });
  if (!gameTypeDoc) throw new ApiError(400, "Invalid game type");

  const parsedTableCount = Number(tableCount);
  if (!Number.isInteger(parsedTableCount) || parsedTableCount < 5 || parsedTableCount > 100) {
    throw new ApiError(400, "Table count must be a whole number between 5 and 100");
  }

  const parsedPlacement = Number(placement);
  if (![1, 2, 3, 4].includes(parsedPlacement)) {
    throw new ApiError(400, "Placement must be 1st, 2nd, 3rd, or 4th");
  }

  const parsedEventDate = new Date(eventDate);
  if (isNaN(parsedEventDate)) {
    throw new ApiError(400, "Invalid event date");
  }

  const points = pointsForPlacement(parsedTableCount, parsedPlacement - 1);

  let award;
  try {
    award = await ExternalRankingAward.create({
      user,
      gameType,
      eventName: eventName.toString().trim(),
      eventDate: parsedEventDate,
      tableCount: parsedTableCount,
      placement: parsedPlacement,
      points,
      notes: notes?.toString().trim() || undefined,
      enteredBy: admin._id,
    });
  } catch (err) {
    if (err?.code === 11000) {
      throw new ApiError(409, "This player already has an award recorded for this event");
    }
    throw err;
  }

  const populated = await ExternalRankingAward.findById(award._id)
    .populate("user", "firstname lastname username")
    .populate("enteredBy", "firstname lastname username")
    .lean();

  return Response.json(
    new ApiResponse(201, populated, `Award added -- ${points} ${gameType} points`)
  );
});

// GET /api/rankings/external?gameType=Bid+Whist
export const GET = asyncHandler(async (req) => {
  await requireAdmin();

  const { searchParams } = new URL(req.url);
  const gameType = searchParams.get("gameType");

  const filter = gameType ? { gameType } : {};
  const awards = await ExternalRankingAward.find(filter)
    .populate("user", "firstname lastname username")
    .populate("enteredBy", "firstname lastname username")
    .sort({ eventDate: -1, createdAt: -1 })
    .lean();

  return Response.json(new ApiResponse(200, awards, "External awards fetched successfully"));
});
