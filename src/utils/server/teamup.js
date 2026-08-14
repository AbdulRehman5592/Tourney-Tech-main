import { TeamUp } from "@/models/TeamUp";
import { ApiError } from "@/utils/server/ApiError";
import { getEnabledGameConfig, isMixedDoublesGenderOk } from "@/utils/server/doublesConfig";

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
