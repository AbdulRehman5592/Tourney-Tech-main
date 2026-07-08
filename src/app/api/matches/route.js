import { Team } from "@/models/Team";
import { Match } from "@/models/Match";
import { Tournament } from "@/models/Tournament";
import { BracketGroup } from "@/models/BracketGroup";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { requireAuth } from "@/utils/server/auth";
import { parseForm } from "@/utils/server/parseForm";
import {
  buildSingleElimination,
  buildDoubleElimination,
  buildRoundRobin,
  buildMesh,
} from "@/utils/server/tournamentBracket";
import { propagateByeWinners } from "@/utils/server/bracketProgression";
import "@/models/Game";

export const POST = asyncHandler(async (req) => {
  const user = await requireAuth(req);

  const { fields } = await parseForm(req);
  const { tournamentId: tournament, gameId: game } = fields;

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

  const validFormats = ["single_elimination", "double_elimination", "round_robin", "mesh"];
  if (!validFormats.includes(existingGameConfig.format)) {
    throw new ApiResponse(400, null, "Unknown tournament format");
  }

  const teams = await Team.find({ tournament, game });
  if (teams.length < 2) {
    throw new ApiResponse(400, null, "Not enough teams to create matches");
  }

  const matchDocs = [];
  const bracketGroups = [];

  if (existingGameConfig.format === "single_elimination") {
    matchDocs.push(...buildSingleElimination(teams));
  } else if (existingGameConfig.format === "double_elimination") {
    matchDocs.push(...buildDoubleElimination(teams));
  } else if (existingGameConfig.format === "round_robin") {
    matchDocs.push(...buildRoundRobin(teams));
  } else if (existingGameConfig.format === "mesh") {
    const groups = buildMesh(teams, existingGameConfig.meshGroupCount);
    for (const group of groups) {
      bracketGroups.push(group);
    }
  }

  // Atomically claim the pending -> in_progress transition so two concurrent
  // requests (e.g. duplicate effect fires, double-clicks) can't both pass the
  // "not generated yet" check and each create a full duplicate bracket.
  const tournamentDoc = await Tournament.findOneAndUpdate(
    { _id: tournament, games: { $elemMatch: { game, round1Status: "pending" } } },
    { $set: { "games.$[g].round1Status": "in_progress" } },
    { arrayFilters: [{ "g.game": game }], new: true }
  );
  if (!tournamentDoc) {
    throw new ApiResponse(400, null, "Round 1 has already been generated for this game");
  }

  const gameConfig = tournamentDoc.games.find((v) => v?.game.toString() === game);

  for (const group of bracketGroups) {
    const bracketGroup = await BracketGroup.create({
      tournament,
      game,
      name: group.groupName,
      order: group.groupIndex,
      bracketSide: "pool",
    });
    group.matches.forEach((m) => {
      m.bracketGroup = bracketGroup._id;
    });
    matchDocs.push(...group.matches);
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
