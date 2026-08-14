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

// Resolves & validates a tournament's game config for a doubles/mixed_doubles
// request -- shared by any flow that proposes a pairing (direct TeamUp
// requests and invite-link creation) before it's known who the partner is,
// since the gender check can only run once both sides are known (accept time).
export function getEnabledGameConfig(tournament, gameId, mode) {
  if (!tournament) throw new ApiError(404, "Tournament not found");

  const gameConfig = tournament.games.find((g) => g.game.toString() === gameId);
  if (!gameConfig) throw new ApiError(404, "Game not found in this tournament");

  if (mode === "doubles" && !gameConfig.doublesEnabled)
    throw new ApiError(400, "Doubles is not enabled for this game");
  if (mode === "mixed_doubles" && !gameConfig.mixedDoublesEnabled)
    throw new ApiError(400, "Mixed doubles is not enabled for this game");

  return gameConfig;
}
