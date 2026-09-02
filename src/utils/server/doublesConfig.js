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

// Resolves & validates a tournament's game config for a team-up/doubles/
// mixed_doubles request -- shared by any flow that proposes a pairing (direct
// TeamUp requests and invite-link creation) before it's known who the partner
// is, since the gender check can only run once both sides are known (accept
// time). `gameConfigId` is the specific scheduled instance
// (Tournament.games[]._id), not the catalog game id -- the same catalog game
// can be scheduled more than once in one tournament as fully independent
// competitions with their own doubles/mixed-doubles settings.
export function getEnabledGameConfig(tournament, gameConfigId, mode) {
  if (!tournament) throw new ApiError(404, "Tournament not found");

  const gameConfig = tournament.games.id(gameConfigId);
  if (!gameConfig) throw new ApiError(404, "Game not found in this tournament");

  // "team" pairs up the real roster team for a double_player game -- distinct
  // from the doubles/mixed_doubles side-pot overlay, which any game type can
  // enable independently of its tournamentTeamType.
  if (mode === "team" && gameConfig.tournamentTeamType !== "double_player")
    throw new ApiError(400, "Team Up is only available for double-player games");
  if (mode === "doubles" && !gameConfig.doublesEnabled)
    throw new ApiError(400, "Doubles is not enabled for this game");
  if (mode === "mixed_doubles" && !gameConfig.mixedDoublesEnabled)
    throw new ApiError(400, "Mixed doubles is not enabled for this game");

  return gameConfig;
}
