import { Team } from "@/models/Team";
import { Match } from "@/models/Match";
import { computeStandingsRoundRobin } from "@/utils/server/tournamentBracket";

const CRITERIA_FIELD = { wins: "wins", points: "pointsFor", hands: "handsFor" };

// Ranks doubles/mixed-doubles pairs by summing each side's individual score.
// "Individual score" is read from whichever bracket Team the player belongs
// to -- their own solo team for single_player, or their real 2-person team's
// shared score for double_player (both members inherit the same team score).
// Pairing itself never creates/touches a Team; this only reads existing
// bracket results and sums them for the pair.
export async function computePairStandings({ tournamentId, gameId, winCriteria = "wins", pairs }) {
  const userIds = [
    ...new Set(pairs.flatMap((p) => [p.fromUserId.toString(), p.toUserId.toString()])),
  ];

  const teams = await Team.find({
    tournament: tournamentId,
    game: gameId,
    members: { $in: userIds },
  }).lean();

  const teamIdByUser = new Map();
  for (const team of teams) {
    for (const member of team.members || []) {
      teamIdByUser.set(member.toString(), team._id.toString());
    }
  }

  const matches = await Match.find({
    tournament: tournamentId,
    game: gameId,
    status: "completed",
  }).lean();

  const stats = computeStandingsRoundRobin(matches, teams, winCriteria);
  const statsByTeam = new Map(stats.map((s) => [s.teamId, s]));
  const field = CRITERIA_FIELD[winCriteria] || "wins";

  const scoreForUser = (userId) => {
    const teamId = teamIdByUser.get(userId.toString());
    const teamStats = teamId ? statsByTeam.get(teamId) : null;
    return teamStats ? teamStats[field] || 0 : 0;
  };

  const results = pairs.map((p) => {
    const fromScore = scoreForUser(p.fromUserId);
    const toScore = scoreForUser(p.toUserId);
    return { ...p, fromScore, toScore, combinedScore: fromScore + toScore };
  });

  results.sort((a, b) => b.combinedScore - a.combinedScore);
  results.forEach((r, i) => {
    r.rank = i + 1;
  });
  return results;
}
