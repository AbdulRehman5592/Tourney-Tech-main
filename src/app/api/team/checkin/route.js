// src\app\api\team\checkin\route.js
//
// Staff single/bulk check-in (or uncheck) for teams in one tournament game.
// `teamIds` flips already-formed teams; `registrationIds` is for an approved
// solo registrant with no Team-of-one yet -- the team is created on the fly
// (see createSoloTeam) and checked in in the same pass, so an admin running
// the door alone doesn't need a separate "form team" step first.

import { Tournament } from "@/models/Tournament";
import { Team } from "@/models/Team";
import { Registration } from "@/models/Registration";
import { requireAuth } from "@/utils/server/auth";
import { requireTournamentStaff } from "@/utils/server/tournamentPermissions";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { ApiError } from "@/utils/server/ApiError";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { createSoloTeam } from "@/utils/server/soloTeam";
import { hasRejectedRegistration } from "@/utils/server/registrationEligibility";
import mongoose from "mongoose";

const STAFF_ROLES = ["admin", "owner", "organizer", "manager", "support"];

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(String(id));
}

export const POST = asyncHandler(async (req) => {
  const user = await requireAuth(req);
  const body = await req.json();

  const tournamentId = body?.tournamentId?.toString();
  const gameConfigId = body?.gameConfigId?.toString();
  const teamIds = Array.isArray(body?.teamIds) ? body.teamIds : [];
  const registrationIds = Array.isArray(body?.registrationIds)
    ? body.registrationIds
    : [];
  const checkedIn = body?.checkedIn === true || body?.checkedIn === "true";

  if (!tournamentId || !gameConfigId) {
    throw new ApiError(400, "tournamentId and gameConfigId are required");
  }
  if (!teamIds.length && !registrationIds.length) {
    throw new ApiError(400, "At least one team or registration is required");
  }

  await requireTournamentStaff(tournamentId, user, STAFF_ROLES);

  const tournament = await Tournament.findById(tournamentId);
  if (!tournament) throw new ApiError(404, "Tournament not found");
  const gameConfig = tournament.games.id(gameConfigId);
  if (!gameConfig) throw new ApiError(404, "Game not found in this tournament");

  const results = [];
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  const record = (id, status, message) => {
    results.push({ id, status, message });
    if (status === "updated") updated += 1;
    else if (status === "skipped") skipped += 1;
    else failed += 1;
  };

  for (const teamId of teamIds) {
    if (!isValidObjectId(teamId)) {
      record(teamId, "failed", "Invalid team id");
      continue;
    }
    try {
      const team = await Team.findOne({
        _id: teamId,
        tournament: tournamentId,
        gameConfigId,
      });
      if (!team) {
        record(teamId, "failed", "Team not found for this tournament/game");
        continue;
      }
      if (team.checkedIn === checkedIn) {
        record(teamId, "skipped", `Already ${checkedIn ? "checked in" : "checked out"}`);
        continue;
      }
      if (
        checkedIn &&
        (await hasRejectedRegistration({ tournamentId, gameConfigId, userIds: team.members }))
      ) {
        record(teamId, "failed", "This team's registration for this game was rejected");
        continue;
      }
      team.checkedIn = checkedIn;
      team.checkedInAt = checkedIn ? new Date() : undefined;
      team.checkedInBy = checkedIn ? user._id : undefined;
      await team.save();
      record(teamId, "updated", checkedIn ? "Checked in" : "Checked out");
    } catch (err) {
      record(teamId, "failed", err?.message || "Could not update team");
    }
  }

  // Solo registrants with no team yet -- only meaningful when checking IN
  // (there's no team to check back out of).
  if (checkedIn) {
    for (const registrationId of registrationIds) {
      if (!isValidObjectId(registrationId)) {
        record(registrationId, "failed", "Invalid registration id");
        continue;
      }
      try {
        const registration = await Registration.findOne({
          _id: registrationId,
          tournament: tournamentId,
          "gameRegistrationDetails.gameConfigIds": gameConfigId,
        });
        if (!registration) {
          record(registrationId, "failed", "Registration not found for this tournament/game");
          continue;
        }
        if (
          registration.gameRegistrationDetails?.status === "rejected"
        ) {
          record(registrationId, "failed", "This registration was rejected");
          continue;
        }
        const team = await createSoloTeam({
          tournament,
          gameConfigId,
          userId: registration.user,
        });
        team.checkedIn = true;
        team.checkedInAt = new Date();
        team.checkedInBy = user._id;
        await team.save();
        record(registrationId, "updated", "Team created and checked in");
      } catch (err) {
        record(registrationId, "failed", err?.message || "Could not check in");
      }
    }
  }

  return Response.json(
    new ApiResponse(
      200,
      { summary: { total: results.length, updated, skipped, failed }, results },
      `${updated} updated, ${skipped} skipped, ${failed} failed`
    )
  );
});
