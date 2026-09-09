import { connectDB } from "@/lib/mongoose";
import { Registration } from "@/models/Registration";
import { Tournament } from "@/models/Tournament";
import { Team } from "@/models/Team";
import { ApiError } from "@/utils/server/ApiError";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { requireAuth } from "@/utils/server/auth";
import { requireAdmin } from "@/utils/server/roleGuards";
import sendEmail from "@/constants/EmailProvider";

// Removes the cancelling player from any team formed for the games they were
// registered for in this tournament. A now-empty or now-solo team (the
// cancelling player was its only member) is deleted outright; a doubles team
// just loses that member, leaving the partner on record for the organizer to
// sort out -- the email alert below is what surfaces that to them, not
// automated re-matching.
async function removeFromTeams(tournamentId, userId, gameConfigIds) {
  if (!gameConfigIds?.length) return;

  const teams = await Team.find({
    tournament: tournamentId,
    gameConfigId: { $in: gameConfigIds },
    members: userId,
  });

  for (const team of teams) {
    const remainingMembers = team.members.filter((m) => m.toString() !== userId.toString());
    if (remainingMembers.length === 0) {
      await Team.findByIdAndDelete(team._id);
    } else {
      team.members = remainingMembers;
      await team.save();
    }
  }
}

export const POST = asyncHandler(async (req) => {
  await connectDB();
  const requester = await requireAuth();

  const body = await req.json();
  const tournamentId = body?.tournamentId;
  const requestedUserId = body?.userId;
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

  const gameConfigIds = registration.gameRegistrationDetails?.gameConfigIds || [];
  await removeFromTeams(tournamentId, userId, gameConfigIds);

  const wasPaid = registration.gameRegistrationDetails?.paid === true;
  registration.cancelled = true;
  registration.cancelledAt = new Date();
  registration.refundStatus = wasPaid ? "requested" : "not_applicable";
  await registration.save();

  const cancellingUser = await registration.populate("user", "firstname lastname username email");
  const playerName =
    `${cancellingUser.user?.firstname || ""} ${cancellingUser.user?.lastname || ""}`.trim() ||
    cancellingUser.user?.username ||
    "A player";

  const staffEmails = (tournament.staff || [])
    .map((s) => s.user?.email)
    .filter(Boolean);

  if (staffEmails.length) {
    try {
      await sendEmail({
        from: `"Tourney Techs" <${process.env.EMAIL_USER}>`,
        to: staffEmails.join(", "),
        subject: `Registration Cancelled -- ${tournament.name}`,
        html: `
          <h2>A player has cancelled their registration</h2>
          <p><strong>Tournament:</strong> ${tournament.name}</p>
          <p><strong>Player:</strong> ${playerName} (${cancellingUser.user?.email || "no email on file"})</p>
          <p><strong>Games registered:</strong> ${gameConfigIds.length}</p>
          ${
            wasPaid
              ? "<p><strong>Refund requested</strong> -- this player had already paid. Review it on the Refund Requests admin page.</p>"
              : "<p>No refund is owed -- this registration was unpaid.</p>"
          }
          <p>They have been removed from any team formed for these games. If this leaves a doubles partner without a teammate, you may need to help them find a new one.</p>
        `,
      });
    } catch (err) {
      // The cancellation itself already succeeded -- a failed alert email
      // shouldn't roll that back or fail the request for the player.
      console.error("Failed to send cancellation alert email:", err);
    }
  }

  return Response.json(
    new ApiResponse(200, registration, "Registration cancelled successfully")
  );
});
