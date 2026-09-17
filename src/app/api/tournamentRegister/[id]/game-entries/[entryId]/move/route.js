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
import { createSoloTeam } from "@/utils/server/soloTeam";
import mongoose from "mongoose";

const MOVE_STAFF_ROLES = ["owner", "organizer", "manager"];

// Admin/organizer-initiated correction: move ONE game entry from one
// scheduled game instance to another within the same tournament. Every
// other game entry on the registration is untouched. This only ever runs
// pre-match-start for that entry's team -- see the two safety checks below
// -- since Team is deliberately immutable on {tournament, gameConfigId}
// (reassigning it in place would desync bracket data, see PATCH
// /api/team/[id]), so a "move" is really: detach from the old team,
// re-point this entry at the new game, and (for single-player games only)
// auto-create a fresh solo team there. A doubles destination is left
// teamless, same as any brand-new doubles registrant -- the admin pairs
// them up via the existing "Form a team" tool.
export const PATCH = asyncHandler(async (req, context) => {
  await connectDB();
  const user = await requireAuth();

  const { id, entryId } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid registration ID");
  }

  const { toGameConfigId, reason } = await req.json();
  if (!toGameConfigId) {
    throw new ApiError(400, "toGameConfigId is required");
  }

  const registration = await Registration.findById(id);
  if (!registration) throw new ApiError(404, "Registration not found");

  const entry = registration.gameEntries.id(entryId);
  if (!entry) throw new ApiError(404, "Game entry not found");
  if (entry.removed || entry.cancelled) {
    throw new ApiError(400, "This game entry has been dropped and can't be moved");
  }

  const tournament = await requireTournamentStaff(
    registration.tournament,
    user,
    MOVE_STAFF_ROLES
  );

  const fromGameConfigId = entry.gameConfigId;
  if (String(fromGameConfigId) === String(toGameConfigId)) {
    throw new ApiError(400, "That's already the player's current game");
  }

  const fromGameConfig = tournament.games.id(fromGameConfigId);
  const toGameConfig = tournament.games.id(toGameConfigId);
  if (!fromGameConfig || !toGameConfig) {
    throw new ApiError(404, "Game not found in this tournament");
  }

  const alreadyOnDestination = registration.gameEntries.some(
    (e) =>
      !e.removed &&
      !e.cancelled &&
      e._id.toString() !== entryId &&
      String(e.gameConfigId) === String(toGameConfigId)
  );
  if (alreadyOnDestination) {
    throw new ApiError(400, "This player is already registered for the destination game");
  }

  // Safety check A -- source game integrity. A team that's checked in and
  // seeded but hasn't played yet can still be moved; only an actual played
  // result blocks it (same boundary PATCH /api/matches/[id]'s "reassign"
  // action uses: block on match.status === "completed", not on a bracket
  // merely existing).
  const userId = registration.user;
  const fromTeam = await Team.findOne({
    tournament: tournament._id,
    gameConfigId: fromGameConfigId,
    members: userId,
  });
  if (fromTeam) {
    const alreadyPlayed = await Match.exists({
      tournament: tournament._id,
      gameConfigId: fromGameConfigId,
      status: "completed",
      $or: [{ teamA: fromTeam._id }, { teamB: fromTeam._id }],
    });
    if (alreadyPlayed) {
      throw new ApiError(
        409,
        `This player has already played a match in "${fromGameConfig.eventTitle || "the current game"}" and can no longer be moved out of it.`
      );
    }
  }

  // Safety check B -- destination game integrity. round1Status is the only
  // existing signal for "has this game's bracket been generated" (flips
  // pending -> in_progress atomically when Round 1 is built, POST
  // /api/matches). Moving a player into an already-built bracket would need
  // bracket regeneration, which this endpoint doesn't attempt.
  if (toGameConfig.round1Status !== "pending") {
    throw new ApiError(
      409,
      `A bracket has already been generated for "${toGameConfig.eventTitle || "the destination game"}". This player can't be moved in without disrupting seeding.`
    );
  }

  // Deliberately not gated on tournament.status: that field controls player
  // self-service registration/cancellation, not admin/organizer corrections
  // -- the real use case here is fixing a mistake after registration
  // closes, before matches start, which this must keep working for.

  if (fromTeam) {
    await removeFromTeams(tournament._id, userId, [fromGameConfigId]);
  }

  entry.game = toGameConfig.game;
  entry.gameConfigId = toGameConfigId;
  entry.team = null;

  const amount = (toGameConfig.entryFee || 0) - (fromGameConfig.entryFee || 0);
  registration.financialAdjustments.push({
    type: "game_move",
    fromGameConfigId,
    toGameConfigId,
    amount,
    reason:
      reason?.toString().trim() ||
      `Moved from "${fromGameConfig.eventTitle || fromGameConfig.game}" to "${toGameConfig.eventTitle || toGameConfig.game}"`,
    createdBy: user._id,
  });

  await registration.save();

  // Auto-create the new solo team only after the entry's gameConfigId
  // already reflects the move -- createSoloTeam looks the registration up
  // by gameConfigId internally, and sets the matching entry's team itself.
  if (toGameConfig.tournamentTeamType === "single_player") {
    await createSoloTeam({ tournament, gameConfigId: toGameConfigId, userId });
  }

  const updated = await Registration.findById(id)
    .populate("tournament")
    .populate("user", "username email")
    .populate("gameEntries.game")
    .populate("gameEntries.team")
    .populate("gameEntries.paymentDetails.bankId");

  return Response.json(
    new ApiResponse(
      200,
      updated,
      `Moved to "${toGameConfig.eventTitle || "the new game"}"`
    )
  );
});
