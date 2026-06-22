import { Team } from "@/models/Team";
import { Match } from "@/models/Match";
import { Tournament } from "@/models/Tournament";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { requireAuth } from "@/utils/server/auth";
import { parseForm } from "@/utils/server/parseForm";
import "@/models/Game";

function shuffleArray(array) {
  return array
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);
}

function generateLimitedMatches(teams, totalRounds) {
  const schedule = [];
  const matches = [];
  const teamMatchesCount = new Map();

  // initialize counter
  teams.forEach((t) => teamMatchesCount.set(t._id.toString(), 0));

  const allPairs = [];

  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      const teamA = teams[i];
      const teamB = teams[j];

      // sirf alag region wali teams
      if (teamA.owner?.city && teamB.owner?.city && teamA.owner.city === teamB.owner.city) {
        continue;
      }

      allPairs.push([teamA, teamB]);
    }
  }

  const shuffledPairs = shuffleArray(allPairs);

  for (const [teamA, teamB] of shuffledPairs) {
    const countA = teamMatchesCount.get(teamA._id.toString()) || 0;
    const countB = teamMatchesCount.get(teamB._id.toString()) || 0;

    if (countA < totalRounds && countB < totalRounds) {
      matches.push([teamA, teamB]);
      teamMatchesCount.set(teamA._id.toString(), countA + 1);
      teamMatchesCount.set(teamB._id.toString(), countB + 1);
    }
  }

  // ab matches ko rounds me distribute kar dete hain
  const matchesPerRound = Math.ceil(matches.length / totalRounds);
  for (let r = 0; r < totalRounds; r++) {
    const start = r * matchesPerRound;
    const end = Math.min(start + matchesPerRound, matches.length);
    schedule.push(matches.slice(start, end));
  }

  return schedule;
}


export const POST = asyncHandler(async (req) => {
  const user = await requireAuth(req);

  const { fields } = await parseForm(req);
  const { tournamentId: tournament, gameId: game } = fields;

  if (!tournament || !game) {
    throw new ApiResponse(400, null, "Tournament ID and Game ID are required");
  }

  const tournamentDoc = await Tournament.findById(tournament);
  if (!tournamentDoc) {
    throw new ApiResponse(404, null, "Tournament not found");
  }

  const gameDetail = tournamentDoc.games?.find(
    (v) => v?.game.toString() === game
  );
  if (!gameDetail) throw new ApiResponse(400, null, "Game not found");

  const teams = await Team.find({ tournament, game });
  if (teams.length < 2) {
    throw new ApiResponse(400, null, "Not enough teams to create matches");
  }

  const originalN = teams.length;
  const totalRounds = gameDetail.rounds || originalN - 1; 

  const existingMatches = await Match.find({ tournament, game });
  let matchNumber = existingMatches.length + 1;

  const matches = [];

  const schedule = generateLimitedMatches(teams, totalRounds);

  for (let roundNum = 1; roundNum <= totalRounds; roundNum++) {
    const roundFixtures = schedule[roundNum - 1] || []; 

    const shuffledRound = shuffleArray([...roundFixtures]);

    for (const [teamA, teamB] of shuffledRound) {
      const existingPair = await Match.findOne({
        tournament,
        game,
        $or: [
          { teamA: teamA._id, teamB: teamB._id },
          { teamA: teamB._id, teamB: teamA._id },
        ],
      });
      if (existingPair) continue;

      const match = await Match.create({
        tournament,
        game,
        matchNumber,
        round: 1,
        stage: "group",
        teamA: teamA._id,
        teamB: teamB._id,
        admin: user._id,
      });

      matches.push(match);
      matchNumber++;
    }
  }

  return Response.json(
    new ApiResponse(
      201,
      matches,
      `Group matches created successfully for ${totalRounds} rounds`
    )
  );
});

export const GET = asyncHandler(async (req) => {
  const { searchParams } = new URL(req.url);
  const tournamentId = searchParams.get("tournamentId");

  const filter = {};
  if (tournamentId) filter.tournament = tournamentId;

 const matches = await Match.find(filter)
  .populate("tournament")
  .populate("game")
  .populate("bracketGroup")
  .populate({
    path: "teamA",
    populate: {
      path: "createdBy",
      select: "firstname lastname username email city", // jo fields chahiye wo select karo
    },
  })
  .populate({
    path: "teamB",
    populate: {
      path: "createdBy",
      select: "firstname lastname username email city",
    },
  })
  .populate("admin");


  return Response.json(
    new ApiResponse(200, matches, "Matches fetched successfully")
  );
});
