// src\app\api\tournaments\[id]\games\[gid]\checkin\route.js
//
// Check-in for one specific scheduled game (Tournament.games[]._id): staff
// open/close the window, and read the roster of teams (checked in or not)
// plus any approved solo registrant who hasn't formed a team yet.

import { Tournament } from "@/models/Tournament";
import { Team } from "@/models/Team";
import { Registration } from "@/models/Registration";
import { requireAuth } from "@/utils/server/auth";
import { requireTournamentStaff } from "@/utils/server/tournamentPermissions";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { ApiError } from "@/utils/server/ApiError";
import { ApiResponse } from "@/utils/server/ApiResponse";
import "@/models/User";

const STAFF_ROLES = ["admin", "owner", "organizer", "manager", "support"];

export const PATCH = asyncHandler(async (req, context) => {
  const user = await requireAuth(req);
  const params = await context.params;
  const tournamentId = params.id;
  const gameConfigId = params.gid;

  await requireTournamentStaff(tournamentId, user, STAFF_ROLES);

  const body = await req.json();
  const open = body?.open === true || body?.open === "true";

  const tournament = await Tournament.findById(tournamentId);
  if (!tournament) throw new ApiError(404, "Tournament not found");
  const gameConfig = tournament.games.id(gameConfigId);
  if (!gameConfig) throw new ApiError(404, "Game not found in this tournament");

  gameConfig.checkInOpen = open;
  await tournament.save();

  return Response.json(
    new ApiResponse(
      200,
      { checkInOpen: gameConfig.checkInOpen },
      open ? "Check-in opened" : "Check-in closed"
    )
  );
});

export const GET = asyncHandler(async (req, context) => {
  const user = await requireAuth(req);
  const params = await context.params;
  const tournamentId = params.id;
  const gameConfigId = params.gid;

  await requireTournamentStaff(tournamentId, user, STAFF_ROLES);

  const tournament = await Tournament.findById(tournamentId);
  if (!tournament) throw new ApiError(404, "Tournament not found");
  const gameConfig = tournament.games.id(gameConfigId);
  if (!gameConfig) throw new ApiError(404, "Game not found in this tournament");

  const teams = await Team.find({ tournament: tournamentId, gameConfigId })
    .populate("members", "firstname lastname username email")
    .populate("checkedInBy", "username")
    .sort({ name: 1 })
    .lean();

  // Solo games only: an approved registrant with no Team-of-one yet can't be
  // checked in directly (there's nothing to flip `checkedIn` on) -- surfaced
  // separately so the admin UI can auto-create the team as part of check-in
  // instead of blocking on a second manual step.
  let pendingTeamFormation = [];
  if (gameConfig.tournamentTeamType === "single_player") {
    const teamMemberIds = new Set(
      teams.flatMap((t) => (t.members || []).map((m) => m._id.toString()))
    );

    const registrations = await Registration.find({
      tournament: tournamentId,
      "gameRegistrationDetails.status": "approved",
      "gameRegistrationDetails.gameConfigIds": gameConfigId,
    }).populate("user", "firstname lastname username email");

    pendingTeamFormation = registrations
      .filter((r) => r.user && !teamMemberIds.has(r.user._id.toString()))
      .map((r) => ({
        registrationId: r._id,
        userId: r.user._id,
        name:
          `${r.user.firstname || ""} ${r.user.lastname || ""}`.trim() ||
          r.user.username,
        email: r.user.email,
      }));
  }

  return Response.json(
    new ApiResponse(
      200,
      { checkInOpen: gameConfig.checkInOpen, teams, pendingTeamFormation },
      "Check-in roster fetched"
    )
  );
});
