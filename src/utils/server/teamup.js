import { TeamUp } from "@/models/TeamUp";
import { Team } from "@/models/Team";
import { Registration } from "@/models/Registration";
import { User } from "@/models/User";
import { ApiError } from "@/utils/server/ApiError";
import { getEnabledGameConfig, isMixedDoublesGenderOk } from "@/utils/server/doublesConfig";
import { assignTeamNumber } from "@/utils/server/teamNumbering";
import { getNextSequence } from "@/lib/utils";

// Doubles/mixed doubles is a side-pot overlay, not a roster change -- so two
// players who are ALREADY teammates on the real roster Team for this
// tournament/game instance aren't allowed to also pair up in the side pot
// together. `gameConfigId` is the specific scheduled instance
// (Tournament.games[]._id), not the catalog game id.
export async function assertNotAlreadyTeammates({ tournamentId, gameConfigId, userAId, userBId }) {
  const existingTeam = await Team.findOne({
    tournament: tournamentId,
    gameConfigId,
    members: { $all: [userAId, userBId] },
  });

  if (existingTeam) {
    throw new ApiError(
      400,
      "You're already teamed up together for this game -- doubles is only for players on different teams."
    );
  }
}

// Shared accept-time validation for a doubles/mixed_doubles pairing between
// two real users -- used both when accepting an existing pending TeamUp
// request and when an invite-link invitee accepts (which creates the TeamUp
// record directly at status "accepted"). Throws ApiError on any violation;
// otherwise returns the cost/payment snapshot to attach to the TeamUp doc.
export async function validateAcceptedPairing({
  tournament,
  gameId,
  mode,
  fromUser,
  toUser,
  excludeRequestId,
}) {
  const gameConfig = getEnabledGameConfig(tournament, gameId, mode);

  if (mode === "mixed_doubles" && !isMixedDoublesGenderOk(fromUser?.gender, toUser?.gender)) {
    throw new ApiError(400, "Mixed doubles requires opposite genders");
  }

  await assertNotAlreadyTeammates({
    tournamentId: tournament._id,
    gameConfigId: gameId,
    userAId: fromUser?._id,
    userBId: toUser?._id,
  });

  // A player can hold at most one *accepted* partner per tournament/game/mode
  // at a time (they can still have any number of other pending requests).
  const conflictQuery = (userId) => ({
    ...(excludeRequestId ? { _id: { $ne: excludeRequestId } } : {}),
    tournament: tournament._id,
    gameId,
    mode,
    status: "accepted",
    $or: [{ from: userId }, { to: userId }],
  });

  const [fromConflict, toConflict] = await Promise.all([
    TeamUp.findOne(conflictQuery(fromUser?._id)),
    TeamUp.findOne(conflictQuery(toUser?._id)),
  ]);

  if (toConflict) {
    throw new ApiError(
      400,
      "You already have an accepted partner for this game. Drop your current partner before accepting a new one."
    );
  }

  if (fromConflict) {
    throw new ApiError(
      400,
      `${fromUser?.firstname || "This player"} already has an accepted partner for this game and can't be paired again until they drop it.`
    );
  }

  return {
    costOwed: mode === "mixed_doubles" ? gameConfig?.mixedDoublesCost || 0 : gameConfig?.doublesCost || 0,
    payment: { method: "cash", paid: false, approved: false },
  };
}

// Accept-time handling for a "team" mode TeamUp request: forms the real
// roster Team for a double_player game -- isolated from the doubles/
// mixed_doubles side-pot overlay above, which never touches Team/TeamMember.
// Both players must already be registered for the game (mirrors the manual
// /api/team/select-partner flow this replaces for the request-based path).
export async function createTeamForAcceptedTeamUp({ tournament, gameId, fromUser, toUser }) {
  const gameConfig = getEnabledGameConfig(tournament, gameId, "team");

  const [fromReg, toReg] = await Promise.all([
    Registration.findOne({
      tournament: tournament._id,
      user: fromUser._id,
      "gameRegistrationDetails.gameConfigIds": gameId,
    }),
    Registration.findOne({
      tournament: tournament._id,
      user: toUser._id,
      "gameRegistrationDetails.gameConfigIds": gameId,
    }),
  ]);

  if (!fromReg || !toReg) {
    throw new ApiError(
      400,
      "Both players must register for this game before the team can be created."
    );
  }

  const existingTeam = await Team.findOne({
    tournament: tournament._id,
    gameConfigId: gameId,
    members: { $in: [fromUser._id, toUser._id] },
  });

  if (existingTeam) {
    throw new ApiError(
      400,
      "One of you already has a team for this game. Drop that team before accepting a new Team Up request."
    );
  }

  const [fromRegionUser, toRegionUser] = await Promise.all([
    User.findById(fromUser._id).select("region firstname username"),
    User.findById(toUser._id).select("region firstname username"),
  ]);

  const newSerial = await getNextSequence(
    `team-serial-${tournament._id}-${gameId}`
  );
  const numbering = await assignTeamNumber([fromRegionUser?.region, toRegionUser?.region]);

  const teamNameBase = `${fromRegionUser?.firstname || fromRegionUser?.username || "Player"}_${
    toRegionUser?.firstname || toRegionUser?.username || "Player"
  }`;

  const team = await Team.create({
    tournament: tournament._id,
    game: gameConfig.game,
    gameConfigId: gameId,
    members: [fromUser._id, toUser._id],
    partner: toUser._id,
    createdBy: fromUser._id,
    serialNo: newSerial.toString(),
    name: `${teamNameBase}-${newSerial}`,
    ...numbering,
  });

  return team;
}
