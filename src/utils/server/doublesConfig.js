import { ApiError } from "@/utils/server/ApiError";

// Doubles/Mixed Doubles are a scoring overlay on top of a game's real bracket
// play -- available for both single_player (bracket "team" = 1 player) and
// double_player (bracket team = 2 players, both credited with the team's
// score) games. Paired players are never moved into a new bracket team;
// pairing is a separate, voluntary combination of two players' existing
// scores. Shared by the tournament create/edit/add-game routes so the rule
// stays consistent.
export function validateDoublesConfig({
  doublesEnabled,
  doublesCost,
  mixedDoublesEnabled,
  mixedDoublesCost,
}) {
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
