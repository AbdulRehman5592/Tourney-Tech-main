import { asyncHandler } from "@/utils/server/asyncHandler";
import { parseForm } from "@/utils/server/parseForm";
import { requireAdmin } from "@/utils/server/roleGuards";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { Team } from "@/models/Team";
// import { TeamUp } from "@/models/TeamUp";
import { User } from "@/models/User"; // agar members check karna ho
import mongoose from "mongoose";
import "@/models/BankDetails";
import "@/models/Game";
import "@/models/Tournament";

export const POST = asyncHandler(async (req) => {
  await requireAdmin();
  const { fields } = await parseForm(req);

  const { logo, tournament, game, members } = fields;

  if (!tournament || !game || !members) {
    throw new ApiResponse(
      400,
      null,
      "Tournament, game and members are required"
    );
  }

  const memberIds = Array.isArray(members) ? members : [members];

  if (memberIds.length !== 2) {
    throw new ApiResponse(
      400,
      null,
      "Exactly 2 members are required to create a team"
    );
  }

  if (!memberIds.every((id) => mongoose.Types.ObjectId.isValid(id))) {
    throw new ApiResponse(400, null, "Invalid member IDs");
  }

  // check if members are already in a team
  const existingTeam = await Team.findOne({
    tournament,
    game,
    members: { $in: memberIds },
  });

  if (existingTeam) {
    throw new ApiResponse(
      400,
      null,
      "One or both users are already in a team for this tournament and game"
    );
  }

  const users = await User.find({ _id: { $in: memberIds } }).select("username");

  if (users.length !== 2) {
    throw new ApiResponse(400, null, "Both users must exist");
  }

  const teamName = `${users[0].username}_${users[1].username}`;
  const lastTeam = await Team.findOne({ tournament, game })
    .sort({ serialNo: -1 })
    .select("serialNo");

  let newSerial = 1;
  if (lastTeam) {
    newSerial = parseInt(lastTeam.serialNo, 10) + 1;
  }

  const team = await Team.create({
    name: teamName,
    logo: logo || null,
    tournament,
    game,
    createdBy: memberIds[0],
    members: memberIds,
    serialNo: newSerial.toString(),
    partner: memberIds[1],
  });

  return Response.json(new ApiResponse(201, team, "Team created successfully"));
});

export const GET = asyncHandler(async () => {
  await requireAdmin();
  const teams = await Team.find()
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
