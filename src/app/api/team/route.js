import { asyncHandler } from "@/utils/server/asyncHandler";
import { parseForm } from "@/utils/server/parseForm";
import { requireAdmin } from "@/utils/server/roleGuards";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { Team } from "@/models/Team";
// import { TeamUp } from "@/models/TeamUp";
import { User } from "@/models/User"; // agar members check karna ho
import { Tournament } from "@/models/Tournament";
import { getNextSequence } from "@/lib/utils";
import { assignTeamNumber } from "@/utils/server/teamNumbering";
import mongoose from "mongoose";
import "@/models/BankDetails";
import "@/models/Game";

export const POST = asyncHandler(async (req) => {
  await requireAdmin();
  const { fields } = await parseForm(req);

  // `gameConfigId` is the specific scheduled instance (Tournament.games[]._id)
  // -- not the catalog game id, since the same catalog game can be scheduled
  // more than once in one tournament as fully independent competitions.
  const { logo, tournament, gameConfigId, members } = fields;

  if (!tournament || !gameConfigId || !members) {
    throw new ApiResponse(
      400,
      null,
      "Tournament, game and members are required"
    );
  }

  const memberIds = Array.isArray(members) ? members : [members];

  if (!memberIds.every((id) => mongoose.Types.ObjectId.isValid(id))) {
    throw new ApiResponse(400, null, "Invalid member IDs");
  }

  // Team size is dictated by the game's configured tournamentTeamType --
  // single_player games form a solo "team" of 1, double_player games need a pair.
  const tournamentDoc = await Tournament.findById(tournament).select("games");
  if (!tournamentDoc) throw new ApiResponse(404, null, "Tournament not found");
  const gameConfig = tournamentDoc.games?.id(gameConfigId);
  if (!gameConfig) throw new ApiResponse(404, null, "Game not configured for this tournament");
  const game = gameConfig.game;

  const expectedSize = gameConfig.tournamentTeamType === "single_player" ? 1 : 2;
  if (memberIds.length !== expectedSize) {
    throw new ApiResponse(
      400,
      null,
      `Exactly ${expectedSize} member${expectedSize > 1 ? "s are" : " is"} required to create a team for this game`
    );
  }

  // check if members are already in a team
  const existingTeam = await Team.findOne({
    tournament,
    gameConfigId,
    members: { $in: memberIds },
  });

  if (existingTeam) {
    throw new ApiResponse(
      400,
      null,
      "One or both users are already in a team for this tournament and game"
    );
  }

  const users = await User.find({ _id: { $in: memberIds } }).select(
    "username region"
  );

  if (users.length !== memberIds.length) {
    throw new ApiResponse(400, null, "All selected members must exist");
  }

  const userById = new Map(users.map((u) => [u._id.toString(), u]));
  const orderedUsers = memberIds.map((id) => userById.get(id.toString()));

  const teamName = orderedUsers.map((u) => u.username).join("_");
  const newSerial = await getNextSequence(`team-serial-${tournament}-${gameConfigId}`);

  // Region-based team numbering (RR-TTT). Order the region codes to match the
  // members order so primary/secondary are stable. A solo team just uses its
  // one player's region -- no partner to compare against.
  const memberRegions = orderedUsers.map((u) => u.region);
  const numbering = await assignTeamNumber(memberRegions);

  const team = await Team.create({
    name: teamName,
    logo: logo || null,
    tournament,
    game,
    gameConfigId,
    createdBy: memberIds[0],
    members: memberIds,
    serialNo: newSerial.toString(),
    partner: expectedSize === 2 ? memberIds[1] : undefined,
    ...numbering,
  });

  return Response.json(new ApiResponse(201, team, "Team created successfully"));
});

export const GET = asyncHandler(async (req) => {
  await requireAdmin();
  const { searchParams } = new URL(req.url);
  const tournament = searchParams.get("tournament");
  // The specific scheduled instance (Tournament.games[]._id) -- not the
  // catalog game id, so two independent competitions sharing a catalog game
  // never get pooled into one team list.
  const gameConfigId = searchParams.get("gameConfigId");
  const filter = {};
  if (tournament) filter.tournament = tournament;
  if (gameConfigId) filter.gameConfigId = gameConfigId;

  const teams = await Team.find(filter)
    .populate("game")
    .populate("tournament")
    .populate("createdBy", "firstname lastname username email")
    .populate("members", "firstname lastname username email")
    .sort({ createdAt: -1 })
    .lean();
  return Response.json(
    new ApiResponse(200, teams, "Teams fetched successfully")
  );
});
