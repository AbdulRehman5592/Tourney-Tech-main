// Cross-tournament, per-player national ranking. Points are awarded per
// tournament-game using the tiered table-count scale published at
// https://dmvcardtel.com/2026-top-players/ ("POINT VALUE ASSESSED (BASED ON
// TOURNAMENT TABLE COUNT)"): larger events are worth proportionally more.
// Whether a tournament counts at all is Tourney Techs Staff's call
// (Tournament.nationallyRanked) -- not tied to its bracket/rotation format.
// Within a ranked tournament, only round_robin/mesh/standard games have a
// defined "top 4" (the same standings math already used by the
// per-tournament standings page); single/double elimination brackets don't
// score points yet since there's no placement logic for them built out.
import { Tournament } from "@/models/Tournament";
import { Team } from "@/models/Team";
import { Match } from "@/models/Match";
import { Game } from "@/models/Game";
import { ExternalRankingAward } from "@/models/ExternalRankingAward";
import {
  computeStandingsRoundRobin,
  computeStandingsMesh,
  STANDINGS_ELIGIBLE_FORMATS,
} from "@/utils/server/tournamentBracket";

// The official point schedule -- shared by native tournament scoring and the
// manual external-award entry form, so both derive points the exact same
// way instead of duplicating the tier table. The PDF flags sub-5 and 100+
// table events as an unresolved ranking policy gap; the top tier stays
// open-ended here (matching existing native-event behavior) and the 100+
// case is instead blocked at the door for external awards specifically, via
// the `max: 100` bound on ExternalRankingAward.tableCount.
export const POINTS_TABLE = [
  { minTables: 20, maxTables: Infinity, points: [25, 20, 15, 10] },
  { minTables: 10, maxTables: 19, points: [20, 15, 10, 5] },
  { minTables: 5, maxTables: 9, points: [8, 6, 4, 2] },
];

// `placementIndex` is 0-based (0 = 1st place ... 3 = 4th place).
export function pointsForPlacement(tableCount, placementIndex) {
  const tier = POINTS_TABLE.find((t) => tableCount >= t.minTables && tableCount <= t.maxTables);
  return tier ? tier.points[placementIndex] ?? 0 : 0;
}

function playerName(user) {
  const full = [user.firstname, user.lastname].filter(Boolean).join(" ").trim();
  return full || user.username || "Unknown";
}

// Rankings are kept strictly per GameType (Bid Whist, Spades, Pinochle,
// Bridge, etc.) -- a player's totals in one game must never mix with
// another, per the "one User ID + one Game = one ranking record" rule.
// `gameTypeName` is required so a caller can never accidentally get a
// cross-game blend. A single GameType can back several catalog Game entries
// (e.g. "Bid Whist" scheduled as both a Kitty and a No-Kitty variant), so all
// of them count toward the same national ranking.
export async function computeNationalRankings(gameTypeName) {
  if (!gameTypeName) {
    throw new Error("computeNationalRankings requires a gameTypeName");
  }

  const gamesOfType = await Game.find({ gameType: gameTypeName }).select("_id").lean();
  const gameIds = new Set(gamesOfType.map((g) => g._id.toString()));
  if (!gameIds.size) {
    return [];
  }

  const tournaments = await Tournament.find({
    status: { $in: ["ongoing", "completed"] },
    nationallyRanked: true,
  })
    .select("games status")
    .lean();

  const players = new Map();
  const ensurePlayer = (user) => {
    const id = user._id.toString();
    if (!players.has(id)) {
      players.set(id, {
        userId: id,
        name: playerName(user),
        // State, not city -- a single city is too small a pool to rank
        // players against meaningfully.
        state: user.stateCode || "",
        totalPoints: 0,
        checkedInCount: 0,
        totalTeamCount: 0,
        top4Count: 0,
        history: [],
      });
    }
    return players.get(id);
  };

  for (const tournament of tournaments) {
    for (const gameConfig of tournament.games || []) {
      if (!gameIds.has(gameConfig.game?.toString())) continue;

      const allTeams = await Team.find({
        tournament: tournament._id,
        gameConfigId: gameConfig._id,
      })
        .populate("members", "firstname lastname username stateCode")
        .lean();
      if (!allTeams.length) continue;

      for (const team of allTeams) {
        for (const member of team.members || []) {
          if (!member?._id) continue;
          const p = ensurePlayer(member);
          p.totalTeamCount += 1;
          if (team.checkedIn) p.checkedInCount += 1;
        }
      }

      if (!STANDINGS_ELIGIBLE_FORMATS.includes(gameConfig.format)) continue;

      const checkedInTeams = allTeams.filter((t) => t.checkedIn);
      if (checkedInTeams.length < 2) continue;

      const matches = await Match.find({
        tournament: tournament._id,
        gameConfigId: gameConfig._id,
        stage: "round1",
      }).lean();
      if (!matches.length || !matches.every((m) => m.status === "completed")) continue;

      const criteria = gameConfig.winCriteria || "wins";
      const ranked =
        gameConfig.format === "mesh"
          ? computeStandingsMesh(matches, checkedInTeams, criteria)
          : computeStandingsRoundRobin(matches, checkedInTeams, criteria);

      const teamById = new Map(checkedInTeams.map((t) => [t._id.toString(), t]));
      const tableCount = Math.ceil(checkedInTeams.length / 2);
      const completedAt = matches.reduce(
        (max, m) => (m.completedAt && new Date(m.completedAt) > max ? new Date(m.completedAt) : max),
        new Date(0)
      );

      ranked.slice(0, 4).forEach((row, index) => {
        const team = teamById.get(row.teamId);
        if (!team) return;
        const points = pointsForPlacement(tableCount, index);
        if (!points) return;
        for (const member of team.members || []) {
          if (!member?._id) continue;
          const p = ensurePlayer(member);
          p.top4Count += 1;
          p.totalPoints += points;
          p.history.push({ completedAt, points });
        }
      });
    }
  }

  // Fold in manually-entered awards for events run outside Tourney Techs --
  // same player pool, same points/top4/history treatment as a native
  // placement, so they sit in the same national ranking rather than a
  // separate track.
  const externalAwards = await ExternalRankingAward.find({ gameType: gameTypeName })
    .populate("user", "firstname lastname username stateCode")
    .lean();

  for (const award of externalAwards) {
    if (!award.user?._id) continue;
    const p = ensurePlayer(award.user);
    p.totalTeamCount += 1;
    p.checkedInCount += 1;
    p.top4Count += 1;
    p.totalPoints += award.points;
    p.history.push({ completedAt: award.eventDate, points: award.points });
  }

  const rows = [...players.values()].map((p) => {
    p.history.sort((a, b) => a.completedAt - b.completedAt);
    const last = p.history[p.history.length - 1];
    const prev = p.history[p.history.length - 2];
    const trend =
      !last || !prev ? "flat" : last.points > prev.points ? "up" : last.points < prev.points ? "down" : "flat";
    return {
      userId: p.userId,
      name: p.name,
      state: p.state,
      overallPoints: p.totalPoints,
      events: p.checkedInCount,
      top4: p.top4Count,
      attendancePct: p.totalTeamCount ? Math.round((p.checkedInCount / p.totalTeamCount) * 100) : 0,
      trend,
    };
  });

  rows.sort(
    (a, b) =>
      b.overallPoints - a.overallPoints || b.top4 - a.top4 || b.attendancePct - a.attendancePct
  );
  return rows.map((r, i) => ({ ...r, rank: i + 1 }));
}
