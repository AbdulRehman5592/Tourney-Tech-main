// GET /api/team/fetch-partner
import { Registration } from "@/models/Registration";
import { Team } from "@/models/Team";
import { Tournament } from "@/models/Tournament";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { requireAuth } from "@/utils/server/auth";
// import { parseForm } from "@/utils/server/parseForm";

export const GET = asyncHandler(async (req) => {
  const user = await requireAuth(req);

  // Find teams where user is partner or creator
  const teams = await Team.find({
    $or: [{ partner: user._id }, { createdBy: user._id }],
  })
    .populate("tournament")
    .populate("members", "firstname lastname username email")
    .populate("partner", "firstname lastname username email")
    .lean();

  // Find tournaments where user is an organizer
  const organizerTournaments = await Tournament.find({
    "staff.user": user._id,
    "staff.role": { $in: ["organizer", "owner"] },
  })
    .populate("games.game", "name icon")
    .populate("staff.user", "username email firstname lastname")
    .lean();

  const tournamentIds = teams.map((t) => t.tournament?._id);

  const registrations = await Registration.find({
    tournament: { $in: tournamentIds },
    user: user._id,
  })
    .populate("tournament")
    .populate("gameRegistrationDetails.games")
    .lean();

  // Format partner teams
  const partnerTournaments = teams.map((team) => {
    const registration = registrations.find(
      (r) => r.tournament?._id.toString() === team.tournament?._id.toString()
    );

    return {
      _id: team?._id,
      name: team.tournament?.name,
      startDate: team.tournament?.startDate,
      endDate: team.tournament?.endDate,
      location: team.tournament?.location,
      status: team.tournament?.status,
      partner: team.partner,
      registeredGames: registration?.gameRegistrationDetails?.games || [],
      tournament: team.tournament,
      accessType: "partner",
    };
  });

  // Format organizer tournaments
  const organizerTournamentsFormatted = organizerTournaments.map((tournament) => {
    // Find registration for this tournament and user
    const registration = registrations.find(
      (r) => r.tournament?._id.toString() === tournament._id.toString()
    );

    // Find if user is also a partner for this tournament
    const partnerTeam = teams.find(
      (t) => t.tournament?._id.toString() === tournament._id.toString()
    );

    return {
      _id: tournament._id,
      name: tournament.name,
      startDate: tournament.startDate,
      endDate: tournament.endDate,
      location: tournament.location,
      status: tournament.status,
      partner: partnerTeam?.partner || null,
      registeredGames: registration?.gameRegistrationDetails?.games || [],
      tournament: tournament,
      accessType: "organizer",
    };
  });

  // Combine and remove duplicates (prefer organizer view if both exist)
  const combinedTournaments = [...partnerTournaments];
  const tournamentIdsSet = new Set(combinedTournaments.map((t) => t._id.toString()));

  for (const orgTournament of organizerTournamentsFormatted) {
    const id = orgTournament._id.toString();
    if (!tournamentIdsSet.has(id)) {
      combinedTournaments.push(orgTournament);
      tournamentIdsSet.add(id);
    }
  }

  return Response.json(
    new ApiResponse(
      200,
      combinedTournaments,
      "Fetched tournaments with user partner + organizer + registered games"
    )
  );
});
