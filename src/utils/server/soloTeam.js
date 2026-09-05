// Shared "create a one-person team for a single_player game" logic, used by
// the player's self-service POST /api/team/create-solo and by the admin
// check-in bulk action (which auto-creates a solo team for an approved
// registrant who hasn't formed one yet, rather than blocking check-in on a
// separate manual step).

import { Team } from "@/models/Team";
import { Registration } from "@/models/Registration";
import { User } from "@/models/User";
import { ApiError } from "@/utils/server/ApiError";
import { getNextSequence } from "@/lib/utils";
import { assignTeamNumber } from "@/utils/server/teamNumbering";
import mongoose from "mongoose";

// `tournament` must be an already-loaded Tournament document (callers
// already have one in hand at every call site). Throws ApiError on bad
// input; returns the created (unpopulated) Team document.
export async function createSoloTeam({ tournament, gameConfigId, userId }) {
  const gameConfig = tournament.games.id(gameConfigId);
  if (!gameConfig) throw new ApiError(404, "Game not found in this tournament");
  if (gameConfig.tournamentTeamType !== "single_player") {
    throw new ApiError(400, "This game is not a single-player game");
  }

  const registration = await Registration.findOne({
    tournament: tournament._id,
    user: userId,
    "gameRegistrationDetails.gameConfigIds": gameConfigId,
  });
  if (!registration) {
    throw new ApiError(400, "This player is not registered for this game in this tournament");
  }

  const existingTeam = await Team.findOne({
    tournament: tournament._id,
    gameConfigId,
    members: userId,
  });
  if (existingTeam) return existingTeam;

  const me = await User.findById(userId).select("username region");
  const newSerial = await getNextSequence(
    `team-serial-${tournament._id}-${gameConfigId}`
  );
  const numbering = await assignTeamNumber([me.region]);

  const team = await Team.create({
    tournament: new mongoose.Types.ObjectId(tournament._id),
    game: gameConfig.game,
    gameConfigId,
    members: [userId],
    createdBy: userId,
    serialNo: newSerial.toString(),
    name: me.username,
    ...numbering,
  });

  registration.gameRegistrationDetails.team = team._id;
  await registration.save();

  return team;
}
