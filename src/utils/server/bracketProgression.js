import { Match } from "@/models/Match";

// Drops a resolved winner/loser into the empty slot of its pre-generated target
// match (identified by round+slot, per the bracket built at round1/playoff generation).
// If that target is itself a "pass-through" bye (structurally only ever gets one
// occupant -- see analyzeBracket in tournamentBracket.js), it auto-advances that
// occupant immediately instead of waiting for a second team that will never arrive.
export async function routeIntoTarget(match, teamId, target) {
  if (!target || !teamId) return;

  const targetMatch = await Match.findOne({
    tournament: match.tournament._id || match.tournament,
    game: match.game._id || match.game,
    round: target.round,
    slot: target.match,
  });
  if (!targetMatch) return;

  if (!targetMatch.teamA) {
    targetMatch.teamA = teamId;
  } else if (!targetMatch.teamB) {
    targetMatch.teamB = teamId;
  } else {
    return;
  }

  if (targetMatch.isBye && targetMatch.status !== "completed") {
    targetMatch.status = "completed";
    targetMatch.winner = teamId;
    targetMatch.completedAt = new Date();
    await targetMatch.save();
    await routeIntoTarget(targetMatch, teamId, targetMatch.winTarget);
    return;
  }

  await targetMatch.save();
}

// After generating a bracket, any bye matches are already marked completed
// with a winner -- propagate those winners into their target match's slot,
// same as a human-completed match would trigger via routeIntoTarget.
export async function propagateByeWinners(createdMatches) {
  for (const match of createdMatches) {
    if (match.status === "completed" && match.winTarget) {
      await routeIntoTarget(match, match.winner, match.winTarget);
    }
  }
}
