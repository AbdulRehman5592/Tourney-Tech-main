import { connectDB } from "@/lib/mongoose";
import { Registration } from "@/models/Registration";
import { Tournament } from "@/models/Tournament";
import { ApiError } from "@/utils/server/ApiError";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { requireAuth } from "@/utils/server/auth";
import { requireAdmin } from "@/utils/server/roleGuards";
import { removeFromTeams } from "@/utils/server/teamMembership";
import sendEmail from "@/constants/EmailProvider";

export const POST = asyncHandler(async (req) => {
  await connectDB();
  const requester = await requireAuth();

  const body = await req.json();
  const tournamentId = body?.tournamentId;
  const requestedUserId = body?.userId;
  // Optional: cancel just specific scheduled game(s) (Tournament.games[]._id)
  // instead of the whole registration -- an a la carte drop, so a player who
  // registered for several games in one tournament can back out of only
  // some of them (e.g. running late for the early game but still playing
  // the later one). Accepts either a single `gameConfigId` (legacy) or a
  // `gameConfigIds` array; omit both to cancel everything, same as before.
  const gameConfigIdsInput = Array.isArray(body?.gameConfigIds)
    ? body.gameConfigIds
    : body?.gameConfigId
      ? [body.gameConfigId]
      : null;
  const userId = requestedUserId || requester._id.toString();

  if (!tournamentId) {
    throw new ApiError(400, "Tournament ID is required");
  }

  // Mirrors POST /api/tournamentRegister: acting on someone else's
  // registration requires admin access.
  if (requestedUserId && requestedUserId !== requester._id.toString()) {
    await requireAdmin();
  }

  const tournament = await Tournament.findById(tournamentId).populate(
    "staff.user",
    "firstname lastname email"
  );
  if (!tournament) {
    throw new ApiError(404, "Tournament not found");
  }

  // Registration (and cancellation) is only ever open while a tournament is
  // "upcoming" -- once staff move it to "registration_closed" or beyond, a
  // player has to go through the tournament director directly.
  if (tournament.status !== "upcoming") {
    throw new ApiError(
      400,
      "This tournament is no longer accepting registration changes. Please contact the tournament director."
    );
  }

  const registration = await Registration.findOne({ tournament: tournamentId, user: userId });
  if (!registration) {
    throw new ApiError(404, "Registration not found");
  }
  if (registration.cancelled) {
    throw new ApiError(400, "This registration has already been cancelled");
  }

  const allGameConfigIds = registration.gameRegistrationDetails?.gameConfigIds || [];
  const allGames = registration.gameRegistrationDetails?.games || [];

  // Which game(s) are actually being dropped, and what (if anything) is
  // left registered afterward -- dropping the last remaining game is just a
  // full cancellation.
  let droppedGameConfigIds;
  let remainingGameConfigIds;
  let remainingGames;

  if (gameConfigIdsInput && gameConfigIdsInput.length > 0) {
    const targets = gameConfigIdsInput.map((id) => id.toString());
    droppedGameConfigIds = allGameConfigIds.filter((id) => targets.includes(id.toString()));
    if (droppedGameConfigIds.length === 0) {
      throw new ApiError(404, "You are not registered for the selected game(s) in this tournament.");
    }
    remainingGameConfigIds = allGameConfigIds.filter((id) => !targets.includes(id.toString()));
    remainingGames = allGames.filter((_, i) => !targets.includes(allGameConfigIds[i].toString()));
  } else {
    droppedGameConfigIds = allGameConfigIds;
    remainingGameConfigIds = [];
    remainingGames = [];
  }

  await removeFromTeams(tournamentId, userId, droppedGameConfigIds);

  const wasPaid = registration.gameRegistrationDetails?.paid === true;
  const fullyCancelled = remainingGameConfigIds.length === 0;

  if (fullyCancelled) {
    registration.cancelled = true;
    registration.cancelledAt = new Date();
    registration.refundStatus = wasPaid ? "requested" : "not_applicable";
  } else {
    // Some games are still registered -- leave the registration (and its
    // existing approval/payment status) in place for those, just drop the
    // cancelled one from it. Approval/payment is tracked per registration,
    // not per game, so a partial refund on an already-paid registration
    // can't be automated here -- the alert email below flags it for the
    // admin to sort out by hand instead of silently marking the whole
    // registration for refund while other paid games are still active.
    registration.gameRegistrationDetails.games = remainingGames;
    registration.gameRegistrationDetails.gameConfigIds = remainingGameConfigIds;
  }
  await registration.save();

  const cancellingUser = await registration.populate("user", "firstname lastname username email");
  const playerName =
    `${cancellingUser.user?.firstname || ""} ${cancellingUser.user?.lastname || ""}`.trim() ||
    cancellingUser.user?.username ||
    "A player";

  const droppedGameFee = droppedGameConfigIds.reduce((sum, id) => {
    const slot = tournament.games.id(id);
    return sum + (slot?.entryFee || 0);
  }, 0);

  const staffEmails = (tournament.staff || [])
    .map((s) => s.user?.email)
    .filter(Boolean);

  if (staffEmails.length) {
    try {
      await sendEmail({
        from: `"Tourney Techs" <${process.env.EMAIL_USER}>`,
        to: staffEmails.join(", "),
        subject: fullyCancelled
          ? `Registration Cancelled -- ${tournament.name}`
          : `Player Dropped a Game -- ${tournament.name}`,
        html: `
          <h2>${fullyCancelled ? "A player has cancelled their registration" : "A player has dropped one game from their registration"}</h2>
          <p><strong>Tournament:</strong> ${tournament.name}</p>
          <p><strong>Player:</strong> ${playerName} (${cancellingUser.user?.email || "no email on file"})</p>
          <p><strong>Games dropped:</strong> ${droppedGameConfigIds.length}${wasPaid ? ` ($${droppedGameFee} already paid)` : ""}</p>
          ${
            fullyCancelled
              ? wasPaid
                ? "<p><strong>Refund requested</strong> -- this player had already paid. Review it on the Refund Requests admin page.</p>"
                : "<p>No refund is owed -- this registration was unpaid.</p>"
              : wasPaid
                ? "<p><strong>This player is still registered for other games in this tournament, so the refund queue wasn't touched automatically.</strong> If the dropped game's fee should be refunded, please arrange it manually.</p>"
                : "<p>No payment was on file yet, and this player is still registered for other games in this tournament.</p>"
          }
          <p>They have been removed from any team formed for the dropped game${droppedGameConfigIds.length === 1 ? "" : "s"}. If this leaves a doubles partner without a teammate, you may need to help them find a new one.</p>
        `,
      });
    } catch (err) {
      // The cancellation itself already succeeded -- a failed alert email
      // shouldn't roll that back or fail the request for the player.
      console.error("Failed to send cancellation alert email:", err);
    }
  }

  return Response.json(
    new ApiResponse(
      200,
      { registration, fullyCancelled },
      fullyCancelled ? "Registration cancelled successfully" : "Game cancelled successfully"
    )
  );
});
