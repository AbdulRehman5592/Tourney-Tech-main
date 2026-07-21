import { Team } from "@/models/Team";
import { Match } from "@/models/Match";
import { Tournament } from "@/models/Tournament";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { requireAuth } from "@/utils/server/auth";
import { parseForm } from "@/utils/server/parseForm";
import {
  buildSingleElimination,
  buildSingleEliminationWithProtectedSeed,
  buildDoubleElimination,
  buildRoundRobin,
  buildMesh,
  buildStandardRotation,
  assignTableNumbers,
} from "@/utils/server/tournamentBracket";
import { propagateByeWinners } from "@/utils/server/bracketProgression";
import "@/models/Game";
import "@/models/BracketGroup";

export const POST = asyncHandler(async (req) => {
  const user = await requireAuth(req);

  const { fields } = await parseForm(req);
  const { tournamentId: tournament, gameId: game, protectedSeedTeamId } = fields;

  if (!tournament || !game) {
    throw new ApiResponse(400, null, "Tournament ID and Game ID are required");
  }

  const existingTournament = await Tournament.findById(tournament);
  if (!existingTournament) {
    throw new ApiResponse(404, null, "Tournament not found");
  }
  const existingGameConfig = existingTournament.games?.find(
    (v) => v?.game.toString() === game
  );
  if (!existingGameConfig) throw new ApiResponse(400, null, "Game not found");

  const validFormats = [
    "single_elimination",
    "double_elimination",
    "round_robin",
    "mesh",
    "standard",
  ];
  if (!validFormats.includes(existingGameConfig.format)) {
    throw new ApiResponse(400, null, "Unknown tournament format");
  }

  const teams = await Team.find({ tournament, game });
  if (teams.length < 2) {
    throw new ApiResponse(400, null, "Not enough teams to create matches");
  }

  const matchDocs = [];

  if (existingGameConfig.format === "single_elimination") {
    if (existingGameConfig.rewardByeType && existingGameConfig.rewardByeType !== "none" && protectedSeedTeamId) {
      matchDocs.push(
        ...buildSingleEliminationWithProtectedSeed(teams, {
          protectedTeamId: protectedSeedTeamId,
          byeDepth: existingGameConfig.rewardByeType,
        })
      );
    } else {
      matchDocs.push(...buildSingleElimination(teams));
    }
  } else if (existingGameConfig.format === "double_elimination") {
    matchDocs.push(...buildDoubleElimination(teams));
  } else if (existingGameConfig.format === "round_robin") {
    matchDocs.push(...buildRoundRobin(teams));
  } else if (existingGameConfig.format === "mesh") {
    matchDocs.push(...buildMesh(teams, { rounds: existingGameConfig.meshRounds }));
  } else if (existingGameConfig.format === "standard") {
    // A fixed round count builds the whole schedule up front, same as mesh;
    // left unset, only round 1 is built -- later rounds come one at a time
    // from the next-round endpoint until the admin declines "another round?".
    matchDocs.push(
      ...buildStandardRotation(teams, {
        direction: existingGameConfig.standardDirection,
        fromRound: 1,
        count: existingGameConfig.standardRounds || 1,
      })
    );
  }

  // Atomically claim the pending -> in_progress transition so two concurrent
  // requests (e.g. duplicate effect fires, double-clicks) can't both pass the
  // "not generated yet" check and each create a full duplicate bracket.
  const inProgressUpdate = { "games.$[g].round1Status": "in_progress" };
  if (
    existingGameConfig.format === "single_elimination" &&
    existingGameConfig.rewardByeType &&
    existingGameConfig.rewardByeType !== "none" &&
    protectedSeedTeamId
  ) {
    inProgressUpdate["games.$[g].protectedSeedTeam"] = protectedSeedTeamId;
  }

  const tournamentDoc = await Tournament.findOneAndUpdate(
    { _id: tournament, games: { $elemMatch: { game, round1Status: "pending" } } },
    { $set: inProgressUpdate },
    { arrayFilters: [{ "g.game": game }], new: true }
  );
  if (!tournamentDoc) {
    throw new ApiResponse(400, null, "Round 1 has already been generated for this game");
  }

  const gameConfig = tournamentDoc.games.find((v) => v?.game.toString() === game);

  // Table numbers: elimination brackets number continuously through the whole
  // event; mesh and standard both reuse the same table numbers every round
  // (their `slot` field already *is* the table number, by construction).
  if (["mesh", "standard"].includes(existingGameConfig.format)) {
    matchDocs.forEach((m) => {
      m.tableNumber = m.isBye ? undefined : m.slot;
    });
  } else {
    assignTableNumbers(matchDocs);
  }

  const existingCount = await Match.countDocuments({ tournament, game });
  let matchNumber = existingCount + 1;

  const created = [];
  for (const m of matchDocs) {
    const match = await Match.create({
      tournament,
      game,
      matchNumber: matchNumber++,
      admin: user._id,
      ...m,
    });
    created.push(match);
  }

  // Byes are pre-resolved (status "completed", winner set) at generation time --
  // propagate them into the next round now instead of waiting on a human match.
  await propagateByeWinners(created);

  return Response.json(
    new ApiResponse(
      201,
      created,
      `Round 1 (${gameConfig.format}) matches created successfully`
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
