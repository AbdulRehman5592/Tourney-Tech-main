// Cross-tournament, per-player national ranking. Points are awarded per
// tournament-game using the tiered table-count scale published at
// https://dmvcardtel.com/2026-top-players/ ("POINT VALUE ASSESSED (BASED ON
// TOURNAMENT TABLE COUNT)"): larger events are worth proportionally more.
// Only round_robin/mesh/standard formats have a defined "top 4" (the same
// standings math already used by the per-tournament standings page) --
// single/double elimination brackets are excluded from point-scoring since
// there's no existing placement logic for them to reuse safely, though a
// team's participation there still counts toward attendance.
import { Tournament } from "@/models/Tournament";
import { Team } from "@/models/Team";
import { Match } from "@/models/Match";
import {
  computeStandingsRoundRobin,
  computeStandingsMesh,
} from "@/utils/server/tournamentBracket";

const POINTS_TABLE = [
  { minTables: 20, maxTables: Infinity, points: [25, 20, 15, 10] },
  { minTables: 10, maxTables: 19, points: [20, 15, 10, 5] },
  { minTables: 5, maxTables: 9, points: [8, 6, 4, 2] },
];

function pointsForPlacement(tableCount, placementIndex) {
  const tier = POINTS_TABLE.find((t) => tableCount >= t.minTables && tableCount <= t.maxTables);
  return tier ? tier.points[placementIndex] ?? 0 : 0;
}

function playerName(user) {
  const full = [user.firstname, user.lastname].filter(Boolean).join(" ").trim();
  return full || user.username || "Unknown";
}

export async function computeNationalRankings() {
  const tournaments = await Tournament.find({ status: { $in: ["ongoing", "completed"] } })
    .select("games status")
    .lean();

  const players = new Map();
  const ensurePlayer = (user) => {
    const id = user._id.toString();
    if (!players.has(id)) {
      players.set(id, {
        userId: id,
        name: playerName(user),
        city: user.city || "",
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
      const allTeams = await Team.find({
        tournament: tournament._id,
        gameConfigId: gameConfig._id,
      })
        .populate("members", "firstname lastname username city")
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

      if (!["round_robin", "mesh", "standard"].includes(gameConfig.format)) continue;

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

  const rows = [...players.values()].map((p) => {
    p.history.sort((a, b) => a.completedAt - b.completedAt);
    const last = p.history[p.history.length - 1];
    const prev = p.history[p.history.length - 2];
    const trend =
      !last || !prev ? "flat" : last.points > prev.points ? "up" : last.points < prev.points ? "down" : "flat";
    return {
      userId: p.userId,
      name: p.name,
      city: p.city,
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
