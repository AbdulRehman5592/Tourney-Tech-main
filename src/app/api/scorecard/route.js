// GET /api/scoreboard
import { Match } from "@/models/Match";
import { Game } from "@/models/Game";
import { GameType } from "@/models/GameType";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { asyncHandler } from "@/utils/server/asyncHandler";
import "@/models/Team";

// Fallback layout when the game has no configured GameType, matching the
// classic Spades columns the app shipped with before game types existed.
const DEFAULT_SCORE_FIELDS = [
  { key: "score", label: "Score", isPrimary: true },
  { key: "hands", label: "Hands Won" },
  { key: "boston", label: "Bostons" },
];

export const GET = asyncHandler(async (req) => {
  const { searchParams } = new URL(req.url);
  const tournamentId = searchParams.get("tournamentId");
  // The specific scheduled instance (Tournament.games[]._id) -- not the
  // catalog game id, so two independent competitions sharing a catalog game
  // never get combined into one scoreboard.
  const gameConfigId = searchParams.get("gameId");

  if (!tournamentId || !gameConfigId) {
    throw new ApiResponse(400, null, "Tournament ID and Game ID required");
  }

  // ✅ Fetch matches
  const matches = await Match.find({ tournament: tournamentId, gameConfigId })
    .populate([
      {
        path: "teamA",
        populate: {
          path: "createdBy",
          select: "firstname lastname username email city",
        },
      },
      {
        path: "teamB",
        populate: {
          path: "createdBy",
          select: "firstname lastname username email city",
        },
      },
      { path: "winner" },
      { path: "loser" },
    ])
    .sort({ round: 1, matchNumber: 1 });

  if (!matches.length) {
    return Response.json(new ApiResponse(200, [], "No matches found"));
  }

  // Resolve this game's score-column layout so the results table can render
  // the same columns as the score-entry form (e.g. Score/Hands/Bostons, or
  // whatever a custom game type defines). `matches[0].game` is the catalog
  // game id (every match here already shares one, via gameConfigId).
  const game = await Game.findById(matches[0].game).select("gameType").lean();
  const gameType = game?.gameType
    ? await GameType.findOne({ name: game.gameType }).lean()
    : null;
  const scoreFields = gameType?.scoreFields?.length ? gameType.scoreFields : DEFAULT_SCORE_FIELDS;

  // ✅ Group by rounds
  const scoreboard = {};
  const teamScores = {}; // For calculating total score per team

  for (let match of matches) {
    // Create round group
    if (!scoreboard[match.round]) {
      scoreboard[match.round] = {
        stage: match.stage,
        matches: [],
      };
    }

    // Dynamic per-game-type score maps (e.g. { score, hands, boston }), filled
    // in with the legacy columns for older matches that predate the map.
    const teamAScoresMap = match.teamAScores ? Object.fromEntries(match.teamAScores) : {};
    const teamBScoresMap = match.teamBScores ? Object.fromEntries(match.teamBScores) : {};
    for (const f of scoreFields) {
      if (teamAScoresMap[f.key] === undefined) {
        teamAScoresMap[f.key] = f.isPrimary
          ? match.teamAScore ?? 0
          : f.key === "boston"
          ? match.teamAboston ?? 0
          : f.key === "hands"
          ? match.teamAtotalWon ?? 0
          : undefined;
      }
      if (teamBScoresMap[f.key] === undefined) {
        teamBScoresMap[f.key] = f.isPrimary
          ? match.teamBScore ?? 0
          : f.key === "boston"
          ? match.teamBboston ?? 0
          : f.key === "hands"
          ? match.teamBtotalWon ?? 0
          : undefined;
      }
    }

    // Match info
    const matchData = {
      matchNumber: match.matchNumber,
      tableNumber: match.tableNumber ?? null,
      teamA: match.teamA?.name || "TBD",
      teamB: match.teamB?.name || "TBD",
      teamAScore: match.teamAScore ?? 0,
      teamBScore: match.teamBScore ?? 0,
      winner: match.winner ? match.winner.name : null,
      status: match.status,
      teamACity: match.teamA?.createdBy?.city || null,
      teamBCity: match.teamB?.createdBy?.city || null,
      teamAScores: teamAScoresMap,
      teamBScores: teamBScoresMap,
    };

    // Push match data into round
    scoreboard[match.round].matches.push(matchData);

    // ✅ Track team scores for overall ranking
    if (match.teamA) {
      const name = match.teamA.name;
      teamScores[name] = (teamScores[name] || 0) + (match.teamAScore ?? 0);
    }
    if (match.teamB) {
      const name = match.teamB.name;
      teamScores[name] = (teamScores[name] || 0) + (match.teamBScore ?? 0);
    }
  }

  // ✅ Sort matches inside each round based on highest score
  for (let round in scoreboard) {
    scoreboard[round].matches.sort((a, b) => {
      const aMaxScore = Math.max(a.teamAScore || 0, a.teamBScore || 0);
      const bMaxScore = Math.max(b.teamAScore || 0, b.teamBScore || 0);
      return bMaxScore - aMaxScore; // Highest scorer match on top
    });
  }

  // ✅ Calculate Overall Team Ranking
  const ranking = Object.entries(teamScores)
    .map(([teamName, totalScore]) => ({ teamName, totalScore }))
    .sort((a, b) => b.totalScore - a.totalScore);

  const topScorer = ranking.length ? ranking[0] : null;

  // ✅ Final response structure
  const responseData = {
    topScorer,
    ranking,
    scoreFields,
    rounds: scoreboard,
  };

  return Response.json(
    new ApiResponse(200, responseData, "Scoreboard & rankings fetched successfully")
  );
});
