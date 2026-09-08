import { Tournament } from "@/models/Tournament";
import { Registration } from "@/models/Registration";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { requireAuth } from "@/utils/server/auth";

export const GET = asyncHandler(async (req) => {
  const user = await requireAuth(req);

  // Find tournaments where user is in staff array
  const staffTournaments = await Tournament.find({
    "staff.user": user._id,
  })
    .populate("games.game", "name icon")
    .populate("staff.user", "username email")
    .sort({ createdAt: -1 })
    .lean();

  // Add user's role for each tournament
  const tournamentsWithUserRole = staffTournaments.map((tournament) => {
    const staffMember = tournament.staff.find(
      (m) => m.user._id.toString() === user._id.toString()
    );
    return {
      ...tournament,
      userRole: staffMember?.role || null,
    };
  });

  const staffTournamentIds = new Set(
    tournamentsWithUserRole.map((tournament) => tournament._id.toString())
  );

  // Find tournaments the user has registered for (pending or approved), so
  // a player also sees the tournament even without a staff role -- and even
  // before an admin has verified their payment. Rejected registrations are
  // deliberately excluded, matching prior behavior. Cancelled ones are kept
  // (rather than filtered out) so they can still surface under "Past
  // Tournaments" -- see registrationCancelled below.
  const myRegistrations = await Registration.find({
    user: user._id,
    "gameRegistrationDetails.status": { $in: ["pending", "approved"] },
  })
    .populate({
      path: "tournament",
      populate: { path: "games.game", select: "name icon" },
    })
    .lean();

  for (const registration of myRegistrations) {
    const tournament = registration.tournament;
    if (!tournament || staffTournamentIds.has(tournament._id.toString())) {
      continue;
    }
    staffTournamentIds.add(tournament._id.toString());
    tournamentsWithUserRole.push({
      ...tournament,
      userRole: "player",
      // Separate from tournament lifecycle status (upcoming/ongoing/etc) --
      // this is purely "has an admin verified the payment yet."
      paymentStatus:
        registration.gameRegistrationDetails.status === "approved" ? "paid" : "pending",
      registrationCancelled: !!registration.cancelled,
    });
  }

  tournamentsWithUserRole.sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  return Response.json(
    new ApiResponse(
      200,
      tournamentsWithUserRole,
      "Your tournaments fetched successfully"
    )
  );
});
