import { ApiError } from "@/utils/server/ApiError";

// Doubles/Mixed Doubles are a single_player-only overlay (paired players still
// play their own solo matches; see TournamentGameSchema.doublesEnabled). Shared
// by the tournament create/edit/add-game routes so the rule stays consistent.
export function validateDoublesConfig({
  tournamentTeamType,
  doublesEnabled,
  doublesCost,
  mixedDoublesEnabled,
  mixedDoublesCost,
}) {
  if ((doublesEnabled || mixedDoublesEnabled) && tournamentTeamType !== "single_player") {
    throw new ApiError(
      400,
      "Doubles / Mixed Doubles can only be enabled for single_player games"
    );
  }
  if (doublesEnabled && !(Number(doublesCost) > 0)) {
    throw new ApiError(400, "doublesCost must be a positive number when doubles is enabled");
  }
  if (mixedDoublesEnabled && !(Number(mixedDoublesCost) > 0)) {
    throw new ApiError(
      400,
      "mixedDoublesCost must be a positive number when mixed doubles is enabled"
    );
  }
}

// Mixed doubles requires opposite genders -- but only blocks when BOTH sides
// are the same specific binary gender. "other"/unset is exempt and may pair
// with anyone (confirmed product decision).
export function isMixedDoublesGenderOk(genderA, genderB) {
  if (genderA === "male" && genderB === "male") return false;
  if (genderA === "female" && genderB === "female") return false;
  return true;
}
