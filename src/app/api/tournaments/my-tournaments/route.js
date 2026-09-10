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

  // Find tournaments the user has registered for, so a player also sees the
  // tournament even without a staff role -- and even before an admin has
  // acted on it. Rejected registrations are kept (not excluded) so the
  // player still sees the tournament and why, instead of it silently
  // disappearing from their list with no explanation. Cancelled ones are
  // kept too, so they can still surface under "Past Tournaments" -- see
  // registrationCancelled below.
  const myRegistrations = await Registration.find({
    user: user._id,
    "gameRegistrationDetails.status": { $in: ["pending", "approved", "rejected"] },
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
      // this is purely "has an admin acted on the payment yet, and how."
      paymentStatus:
        registration.gameRegistrationDetails.status === "approved"
          ? "paid"
          : registration.gameRegistrationDetails.status === "rejected"
            ? "rejected"
            : "pending",
      registrationCancelled: !!registration.cancelled,
      // Which of the tournament's games this player actually signed up for
      // (Tournament.games[]._id) -- registration approval/payment status is
      // one value for the whole submission, so every game here shares the
      // paymentStatus above. Lets the UI mark registered games instead of
      // showing every tournament game as if the player joined all of them.
      registeredGameConfigIds: (registration.gameRegistrationDetails.gameConfigIds || []).map(
        (id) => id.toString()
      ),
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
