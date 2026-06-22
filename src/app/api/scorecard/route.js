// GET /api/scoreboard
import { Match } from "@/models/Match";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { asyncHandler } from "@/utils/server/asyncHandler";
import "@/models/Team";

export const GET = asyncHandler(async (req) => {
  const { searchParams } = new URL(req.url);
  const tournamentId = searchParams.get("tournamentId");
  const gameId = searchParams.get("gameId");

  if (!tournamentId || !gameId) {
    throw new ApiResponse(400, null, "Tournament ID and Game ID required");
  }

  // ✅ Fetch matches
  const matches = await Match.find({ tournament: tournamentId, game: gameId })
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

    // Match info
    const matchData = {
      matchNumber: match.matchNumber,
      teamA: match.teamA?.name || "TBD",
      teamB: match.teamB?.name || "TBD",
      teamAScore: match.teamAScore ?? 0,
      teamBScore: match.teamBScore ?? 0,
      winner: match.winner ? match.winner.name : null,
      status: match.status,
      teamACity: match.teamA?.createdBy?.city || null,
      teamBCity: match.teamB?.createdBy?.city || null,
      teamABoston: match.teamAboston,
      teamBBoston: match.teamBboston
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
    rounds: scoreboard,
  };

  return Response.json(
    new ApiResponse(200, responseData, "Scoreboard & rankings fetched successfully")
  );
});
