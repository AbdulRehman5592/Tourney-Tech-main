import { Tournament } from "@/models/Tournament";
import { Registration } from "@/models/Registration";
import { Team } from "@/models/Team";
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
    gameEntries: { $elemMatch: { removed: { $ne: true } } },
  })
    .populate({
      path: "tournament",
      populate: { path: "games.game", select: "name icon" },
    })
    .lean();

  // This player's own teams across every tournament they're registered in --
  // fetched once, up front, so the per-tournament loop below can just look up
  // which of their games are already checked in instead of round-tripping
  // per card. Scoped to `members: user._id` (not staff-gated) since a player
  // is always allowed to see their own team's check-in status.
  const myTournamentIds = myRegistrations
    .map((r) => r.tournament?._id)
    .filter(Boolean);
  const myTeams = await Team.find({
    tournament: { $in: myTournamentIds },
    members: user._id,
  })
    .select("tournament gameConfigId checkedIn")
    .lean();
  const checkedInGameConfigIdsByTournament = {};
  for (const team of myTeams) {
    if (!team.checkedIn) continue;
    const key = team.tournament.toString();
    (checkedInGameConfigIdsByTournament[key] ||= []).push(team.gameConfigId.toString());
  }

  for (const registration of myRegistrations) {
    const tournament = registration.tournament;
    if (!tournament || staffTournamentIds.has(tournament._id.toString())) {
      continue;
    }
    staffTournamentIds.add(tournament._id.toString());

    const activeEntries = (registration.gameEntries || []).filter(
      (e) => !e.removed && !e.cancelled
    );
    // Separate from tournament lifecycle status (upcoming/ongoing/etc) --
    // this is purely "has an admin acted on the payment yet, and how." Each
    // game now has its own approval status, so this collapses them to one
    // badge for the tournament card: "paid" only once every game is
    // approved, "rejected" only once every game was rejected, "pending"
    // for anything in between (including a mix of approved/rejected games).
    const paymentStatus =
      activeEntries.length > 0 && activeEntries.every((e) => e.status === "approved")
        ? "paid"
        : activeEntries.length > 0 && activeEntries.every((e) => e.status === "rejected")
          ? "rejected"
          : "pending";

    tournamentsWithUserRole.push({
      ...tournament,
      userRole: "player",
      paymentStatus,
      registrationCancelled: !!registration.cancelled,
      // Which of the tournament's games this player actually signed up for
      // (Tournament.games[]._id) and is still active in -- lets the UI mark
      // registered games instead of showing every tournament game as if the
      // player joined all of them.
      registeredGameConfigIds: activeEntries.map((e) => e.gameConfigId.toString()),
      // Which of those registered games this player's team has already
      // checked into -- lets the UI offer "Check In" only for the ones still
      // pending, and show a confirmed badge for the rest.
      checkedInGameConfigIds: checkedInGameConfigIdsByTournament[tournament._id.toString()] || [],
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
