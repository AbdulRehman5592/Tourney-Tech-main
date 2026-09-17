import { connectDB } from "@/lib/mongoose";
import { Registration } from "@/models/Registration";
import { Team } from "@/models/Team";
import { Match } from "@/models/Match";
import { ApiError } from "@/utils/server/ApiError";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { requireAuth } from "@/utils/server/auth";
import { requireTournamentStaff } from "@/utils/server/tournamentPermissions";
import { removeFromTeams } from "@/utils/server/teamMembership";
import mongoose from "mongoose";

const REMOVE_STAFF_ROLES = ["owner", "organizer", "manager"];

// Admin-initiated drop of ONE game entry -- soft-deleted (same pattern as
// player self-service cancellation) so there's a record for the refund
// queue, and every other game entry on the registration is left untouched.
export const PATCH = asyncHandler(async (req, context) => {
  await connectDB();
  const user = await requireAuth();

  const { id, entryId } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid registration ID");
  }

  const body = await req.json().catch(() => ({}));
  const reason = body?.reason;

  const registration = await Registration.findById(id);
  if (!registration) throw new ApiError(404, "Registration not found");

  const entry = registration.gameEntries.id(entryId);
  if (!entry) throw new ApiError(404, "Game entry not found");
  if (entry.removed || entry.cancelled) {
    throw new ApiError(400, "This game entry has already been dropped");
  }

  const tournament = await requireTournamentStaff(
    registration.tournament,
    user,
    REMOVE_STAFF_ROLES
  );

  const gameConfigId = entry.gameConfigId;
  const gameConfig = tournament.games.id(gameConfigId);

  // Same safety check move-game uses: a team that's checked in and seeded
  // but hasn't played yet can still be removed; only an actual played
  // result blocks it.
  const userId = registration.user;
  const team = await Team.findOne({
    tournament: tournament._id,
    gameConfigId,
    members: userId,
  });
  if (team) {
    const alreadyPlayed = await Match.exists({
      tournament: tournament._id,
      gameConfigId,
      status: "completed",
      $or: [{ teamA: team._id }, { teamB: team._id }],
    });
    if (alreadyPlayed) {
      throw new ApiError(
        409,
        `This player has already played a match in "${gameConfig?.eventTitle || "this game"}" and can no longer be removed from it.`
      );
    }
    await removeFromTeams(tournament._id, userId, [gameConfigId]);
  }

  entry.removed = true;
  entry.removedAt = new Date();
  entry.removedReason = reason?.toString().trim() || "";
  entry.refundStatus = entry.paid ? "requested" : "not_applicable";
  entry.team = null;

  const stillActive = registration.gameEntries.some(
    (e) => e._id.toString() !== entryId && !e.removed && !e.cancelled
  );
  if (!stillActive) {
    registration.cancelled = true;
    registration.cancelledAt = new Date();
  }

  await registration.save();

  const updated = await Registration.findById(id)
    .populate("tournament")
    .populate("user", "username email")
    .populate("gameEntries.game")
    .populate("gameEntries.team")
    .lean();

  return Response.json(
    new ApiResponse(200, updated, `Removed "${gameConfig?.eventTitle || "the game"}" from this player's registration`)
  );
});
