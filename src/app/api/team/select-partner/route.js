import { Team } from "@/models/Team";
// import { Tournament } from "@/models/Tournament";
import { Registration } from "@/models/Registration";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { requireAuth } from "@/utils/server/auth";
import { parseForm } from "@/utils/server/parseForm";
import mongoose from "mongoose";

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(String(id));
}

export const POST = asyncHandler(async (req) => {
  const user = await requireAuth(req);

  const { fields } = await parseForm(req);
  const tournamentId = fields.tournamentId?.toString();
  const gameId = fields.gameId?.toString();
  const partnerIdRaw = fields.partnerId?.toString();
  const teamName = fields.teamName?.toString();

  if (!tournamentId || !gameId) {
    throw new ApiResponse(400, null, "tournamentId and gameId are required");
  }

  if (!isValidObjectId(tournamentId) || !isValidObjectId(gameId)) {
    throw new ApiResponse(400, null, "Invalid tournamentId or gameId");
  }

  let memberIds = [];

  if (Array.isArray(fields.memberIds)) {
    memberIds = fields.memberIds.flatMap((item) =>
      String(item)
        .split(",")
        .map((id) => id.trim())
    );
  } else if (typeof fields.memberIds === "string") {
    memberIds = String(fields.memberIds)
      .split(",")
      .map((id) => id.trim());
  }

  memberIds = memberIds
    .filter((id) => isValidObjectId(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  if (memberIds.length === 0) {
    throw new ApiResponse(400, null, "Invalid or missing memberIds");
  }

  const userIdStr = user._id.toString();
  if (!memberIds.some((m) => m.toString() === userIdStr)) {
    throw new ApiResponse(
      400,
      null,
      "Creator (authenticated user) must be included in members"
    );
  }

  if (!partnerIdRaw || !isValidObjectId(partnerIdRaw)) {
    throw new ApiResponse(400, null, "Invalid or missing partnerId");
  }
  const partnerId = new mongoose.Types.ObjectId(partnerIdRaw);

  if (!memberIds.some((m) => m.toString() === partnerId.toString())) {
    throw new ApiResponse(
      400,
      null,
      "Selected partner must be one of the members"
    );
  }


  const possibleTeams = await Team.find({
    tournament: tournamentId,
    game: gameId,
    createdBy: user?._id,
  });

  const exactTeam = possibleTeams.find(
    (t) => Array.isArray(t.members) && t.members.length === memberIds.length
  );


  if (exactTeam) {
    exactTeam.partner = partnerIdRaw;
    await exactTeam.save();

    const updatedTeam = await Team.findById(exactTeam._id)
      .populate("tournament")
      .populate("members", "firstname lastname username email")
      .populate("partner", "firstname lastname username email")
      .populate("createdBy", "firstname lastname username email");

    return Response.json(
      new ApiResponse(
        200,
        { team: updatedTeam },
        "Partner updated successfully"
      )
    );
  }

  const partnerTaken = await Team.findOne({
    tournament: tournamentId,
    game: gameId,
    partner: partnerId,
  });

  if (partnerTaken) {
    throw new ApiResponse(
      400,
      null,
      "Selected partner is already partnered in another team for this tournament/game"
    );
  }

  const [ownerReg, partnerReg] = await Promise.all([
    Registration.findOne({
      tournament: tournamentId,
      user: user._id,
      "gameRegistrationDetails.games": gameId,
    }).populate("gameRegistrationDetails.games"),
    Registration.findOne({
      tournament: tournamentId,
      user: partnerId,
      "gameRegistrationDetails.games": gameId,
    }).populate("gameRegistrationDetails.games"),
  ]);

  if (!ownerReg || !partnerReg) {
    throw new ApiResponse(
      400,
      null,
      "Both creator and selected partner must be registered for this game in the tournament"
    );
  }
  const lastTeam = await Team.findOne({
    tournament: tournamentId,
    game: gameId,
  })
    .sort({ serialNo: -1 })
    .select("serialNo");

  let newSerial = 1;
  if (lastTeam) {
    newSerial = parseInt(lastTeam.serialNo, 10) + 1;
  }
  const newTeam = await Team.create({
    tournament: new mongoose.Types.ObjectId(tournamentId),
    game: new mongoose.Types.ObjectId(gameId),
    members: memberIds,
    partner: partnerId,
    createdBy: user._id,
    serialNo: newSerial.toString(),
    name: `${teamName}-${newSerial}`,
  });

  const populatedTeam = await Team.findById(newTeam._id)
    .populate("tournament")
    .populate("members", "firstname lastname username email")
    .populate("partner", "firstname lastname username email")
    .populate("createdBy", "firstname lastname username email");

  return Response.json(
    new ApiResponse(
      201,
      {
        team: populatedTeam,
        tournament: populatedTeam?.tournament || null,
        ownerRegisteredGames: ownerReg?.gameRegistrationDetails?.games || [],
        partnerRegisteredGames:
          partnerReg?.gameRegistrationDetails?.games || [],
      },
      "Team created successfully"
    )
  );
});
