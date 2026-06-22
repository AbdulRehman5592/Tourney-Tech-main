import { Match } from "@/models/Match";
import { Team } from "@/models/Team";
import { Tournament } from "@/models/Tournament";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { parseForm } from "@/utils/server/parseForm";
import { requireAuth } from "@/utils/server/auth";
import "@/models/Game";

function getStageName(numTeams, round) {
  if (numTeams === 2) return "final";
  if (numTeams === 4) return "semi_final";
  if (numTeams >= 6) return `stage_${round - 1}`;
  return "semi_final"; // fallback
}

export const PATCH = asyncHandler(async (req, context) => {
  const user = await requireAuth(req);
  const matchId = context.params.id;
  const { fields } = await parseForm(req);
  const {
    teamAScore,
    teamBScore,
    teamAtotalWon,
    teamBtotalWon,
    teamAboston,
    teamBboston,
    teamAAgree,
    teamBAgree,
  } = fields;

  const match = await Match.findById(matchId).populate(
    "teamA teamB tournament game"
  );
  if (!match) throw new ApiResponse(404, null, "Match not found");

  // ✅ Role-based access
  // if (user.role !== "admin") {
  //   // Normal user → check if user belongs to teamA or teamB
  //   const userTeam = await Team.findOne({
  //     createdBy: user._id,
  //     tournament: match?.tournament?._id,
  //   });

  //   if (!userTeam) {
  //     throw new ApiResponse(403, null, "You are not the owner of any team");
  //   }

  //   // ✅ Check if this userTeam is playing in this match
  //   const isTeamA = match.teamA._id.toString() === userTeam._id.toString();
  //   const isTeamB = match.teamB._id.toString() === userTeam._id.toString();

  //   if (!isTeamA && !isTeamB) {
  //     throw new ApiResponse(
  //       403,
  //       null,
  //       "You are not the owner of this team or this match does not belong to your team"
  //     );
  //   }

  //   // ✅ Strict check: User cannot update the other team's score
  //   if (isTeamA) {
  //     if (teamBScore || teamBtotalWon) {
  //       throw new ApiResponse(
  //         403,
  //         null,
  //         "You cannot update opponent's score (Team B)"
  //       );
  //     }
  //     match.teamAScore = teamAScore;
  //     match.teamAtotalWon = teamAtotalWon;
  //     match.teamAboston = teamAboston;
  //   } else if (isTeamB) {
  //     if (teamAScore || teamAtotalWon) {
  //       throw new ApiResponse(
  //         403,
  //         null,
  //         "You cannot update opponent's score (Team A)"
  //       );
  //     }
  //     match.teamBScore = teamBScore;
  //     match.teamBtotalWon = teamBtotalWon;
  //     match.teamBboston = teamBboston;
  //   }

  //   // ✅ Check if both teams have submitted scores
  //   if (
  //     match.teamAScore !== undefined &&
  //     match.teamBScore !== undefined &&
  //     match.teamAScore !== null &&
  //     match.teamBScore !== null &&
  //     match.teamAScore > 0 &&
  //     match.teamBScore > 0
  //   ) {
  //     if (match.teamAScore > match.teamBScore) {
  //       match.winner = match.teamA._id;
  //       match.loser = match.teamB._id;
  //       match.status = "completed";
  //       match.completedAt = new Date();
  //     } else if (match.teamBScore > match.teamAScore) {
  //       match.winner = match.teamB._id;
  //       match.loser = match.teamA._id;
  //       match.status = "completed";
  //       match.completedAt = new Date();
  //     } else {
  //       throw new ApiResponse(
  //         400,
  //         null,
  //         "Draw not supported in knockout format"
  //       );
  //     }
  //   }
  // } else {
  //   // ✅ Admin can update both teams’ scores
  //   console.log("running Admin");
  //   match.teamAScore = teamAScore;
  //   match.teamBScore = teamBScore;
  //   match.teamAtotalWon = teamAtotalWon;
  //   match.teamBtotalWon = teamBtotalWon;
  //   match.teamAboston = teamAboston;
  //   match.teamBboston = teamBboston;
  //   match.completedAt = new Date();
  //   match.status = "completed";

  //   // ✅ Winner decide (after scores set)
  //   if (match.teamAScore > match.teamBScore) {
  //     match.winner = match.teamA._id;
  //     match.loser = match.teamB._id;
  //   } else if (match.teamBScore > match.teamAScore) {
  //     match.winner = match.teamB._id;
  //     match.loser = match.teamA._id;
  //   } else {
  //     throw new ApiResponse(400, null, "Draw not supported in knockout format");
  //   }
  // }

  if (user.role !== "admin") {
    const userTeam = await Team.findOne({
      createdBy: user._id,
      tournament: match?.tournament?._id,
    });

    if (!userTeam) {
      throw new ApiResponse(403, null, "You are not the owner of any team");
    }

    const isTeamA = match.teamA._id.toString() === userTeam._id.toString();
    const isTeamB = match.teamB._id.toString() === userTeam._id.toString();

    if (!isTeamA && !isTeamB) {
      throw new ApiResponse(
        403,
        null,
        "You are not the owner of this team or this match does not belong to your team"
      );
    }

    // ✅ Score update + Agree tracking
    if (isTeamA) {
      if (teamBScore || teamBtotalWon) {
        throw new ApiResponse(
          403,
          null,
          "You cannot update opponent's score (Team B)"
        );
      }
      match.teamAScore = teamAScore;
      match.teamAtotalWon = teamAtotalWon;
      match.teamAboston = teamAboston;
      match.teamAAgree = teamAAgree; // ✅ team A confirmed
    } else if (isTeamB) {
      if (teamAScore || teamAtotalWon) {
        throw new ApiResponse(
          403,
          null,
          "You cannot update opponent's score (Team A)"
        );
      }
      match.teamBScore = teamBScore;
      match.teamBtotalWon = teamBtotalWon;
      match.teamBboston = teamBboston;
      match.teamBAgree = teamBAgree; // ✅ team B confirmed
    }

    // ✅ Match completion only if both teams agree
    if (match.teamAAgree && match.teamBAgree) {
      if (
        match.teamAScore !== undefined &&
        match.teamBScore !== undefined &&
        match.teamAScore !== null &&
        match.teamBScore !== null
      ) {
        if (match.teamAScore > match.teamBScore) {
          match.winner = match.teamA._id;
          match.loser = match.teamB._id;
          match.status = "completed";
          match.completedAt = new Date();
        } else if (match.teamBScore > match.teamAScore) {
          match.winner = match.teamB._id;
          match.loser = match.teamA._id;
          match.status = "completed";
          match.completedAt = new Date();
        } else {
          throw new ApiResponse(
            400,
            null,
            "Draw not supported in knockout format"
          );
        }
      }
    } else {
      match.status = "pending"; // ✅ still waiting for the other team
    }
  } else {
    // ✅ Admin full control
    match.teamAScore = teamAScore;
    match.teamBScore = teamBScore;
    match.teamAtotalWon = teamAtotalWon;
    match.teamBtotalWon = teamBtotalWon;
    match.teamAboston = teamAboston;
    match.teamBboston = teamBboston;
    match.teamAAgree = teamAAgree;
    match.teamBAgree = teamBAgree;
    match.status = "completed";
    match.completedAt = new Date();

    if (match.teamAScore > match.teamBScore) {
      match.winner = match.teamA._id;
      match.loser = match.teamB._id;
    } else if (match.teamBScore > match.teamAScore) {
      match.winner = match.teamB._id;
      match.loser = match.teamA._id;
    } else {
      throw new ApiResponse(400, null, "Draw not supported in knockout format");
    }
  }

  await match.save();

  // ✅ Check if current round is complete
  const sameRoundMatches = await Match.find({
    tournament: match.tournament._id,
    game: match.game._id,
    round: match.round,
  });

  const allCompleted = sameRoundMatches.every((m) => m.status === "completed");

  if (allCompleted) {
    // ✅ If stage is "group" → Apply Top 50 logic
    if (match.stage === "group") {
      const allTeams = await Team.find({
        tournament: match.tournament._id,
        game: match.game._id,
      });

      // ✅ Calculate total scores for each team
      const teamScores = await Promise.all(
        allTeams.map(async (team) => {
          const scoreAggregation = await Match.aggregate([
            {
              $match: {
                tournament: match.tournament._id,
                game: match.game._id,
                stage: "group",
                status: "completed",
                $or: [{ teamA: team._id }, { teamB: team._id }],
              },
            },
            {
              $addFields: {
                teamScore: {
                  $cond: {
                    if: { $eq: ["$teamA", team._id] },
                    then: { $toInt: "$teamAScore" },
                    else: { $toInt: "$teamBScore" },
                  },
                },
              },
            },
            {
              $group: {
                _id: null,
                totalScore: { $sum: "$teamScore" },
              },
            },
          ]);
          const totalScore =
            scoreAggregation.length > 0
              ? scoreAggregation[0].totalScore || 0
              : 0;
          return { teamId: team._id, score: totalScore };
        })
      );

      // ✅ Sort descending by score
      teamScores.sort((a, b) => b.score - a.score);

      const halfCount = Math.floor(teamScores.length / 2);
      const topTeams = teamScores.slice(0, halfCount).map((t) => t.teamId);
      let nextRound = match.round + 1;
      let nextStage = getStageName(topTeams.length, nextRound);

      // ✅ Create matches for next round
      let matchNumber =
        (await Match.countDocuments({
          tournament: match.tournament._id,
          game: match.game._id,
        })) + 1;

      const shuffled = [...topTeams].sort(() => Math.random() - 0.5);
      for (let i = 0; i < shuffled.length; i += 2) {
        const teamA = shuffled[i];
        const teamB = shuffled[i + 1];

        if (!teamB) {
          await Match.create({
            tournament: match.tournament._id,
            game: match.game._id,
            round: nextRound,
            stage: nextStage,
            status: "completed",
            teamA,
            winner: teamA,
            matchNumber,
          });
        } else {
          await Match.create({
            tournament: match.tournament._id,
            game: match.game._id,
            round: nextRound,
            stage: nextStage,
            status: "pending",
            teamA,
            teamB,
            matchNumber,
          });
        }
        matchNumber++;
      }
    } else {
      // ✅ Normal knockout flow
      let winners = sameRoundMatches.map((m) => m.winner);

      const totalTeams = await Team.countDocuments({
        tournament: match.tournament._id,
        game: match.game._id,
      });
      const totalRounds = Math.ceil(Math.log2(totalTeams));
      const nextRound = match.round + 1;

      if (nextRound <= totalRounds) {
        const nextStage = getStageName(winners.length, nextRound);

        if (winners.length % 2 !== 0) {
          const byeTeam = winners.pop();
          winners.unshift(byeTeam);
        }

        let matchNumber =
          (await Match.countDocuments({
            tournament: match.tournament._id,
            game: match.game._id,
          })) + 1;

        for (let i = 0; i < winners.length; i += 2) {
          const teamA = winners[i];
          const teamB = winners[i + 1];

          if (!teamB) {
            await Match.create({
              tournament: match.tournament._id,
              game: match.game._id,
              round: nextRound,
              stage: nextStage,
              status: "completed",
              teamA,
              winner: teamA,
              matchNumber: matchNumber++,
            });
            continue;
          }

          await Match.create({
            tournament: match.tournament._id,
            game: match.game._id,
            round: nextRound,
            stage: nextStage,
            status: "pending",
            teamA,
            teamB,
            matchNumber: matchNumber++,
          });
        }
      } else {
        const lastWinner = winners[0];
        await Tournament.findByIdAndUpdate(match.tournament._id, {
          status: "completed",
          winner: lastWinner,
        });
      }
    }
  }

  return Response.json(
    new ApiResponse(
      200,
      match,
      `Match updated: ${match.teamA.name} vs ${match.teamB.name}`
    )
  );
});
