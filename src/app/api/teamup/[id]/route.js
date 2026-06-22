// /api/teamup/[id]

// import { getNextSequence } from "@/lib/utils";
import { Registration } from "@/models/Registration";

// import { Team } from "@/models/Team";
import { TeamUp } from "@/models/TeamUp";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { requireAuth } from "@/utils/server/auth";
import { parseForm } from "@/utils/server/parseForm";

export const PATCH = asyncHandler(async (req, context) => {
  const user = await requireAuth();
  const { id } = context.params;
  const { fields } = await parseForm(req);
  const status = fields.status?.toString();

  if (!["accepted", "rejected"].includes(status)) {
    throw new ApiResponse(400, null, "Invalid status value");
  }

  const request = await TeamUp.findById(id)
    .populate("from", "firstname lastname username email")
    .populate("to", "firstname lastname username email");

  if (!request) {
    throw new ApiResponse(404, null, "Team-up request not found");
  }

  if (request.to?._id.toString() !== user._id.toString()) {
    throw new ApiResponse(403, null, "Not authorized to update this request");
  }

  request.status = status;
  await request.save();

  if (status === "accepted") {
    const fromReg = await Registration.findOne({
      user: request.from,
      tournament: request.tournament,
    });
    const toReg = await Registration.findOne({
      user: request.to,
      tournament: request.tournament,
    });

    if (!fromReg || !toReg) {
      throw new ApiResponse(
        400,
        null,
        "Both users must be registered in a tournament"
      );
    }

    if (fromReg.tournament?.toString() !== toReg.tournament?.toString()) {
      throw new ApiResponse(
        400,
        null,
        "Both users must be registered in the same tournament"
      );
    }

    // const commonTournament = fromReg.tournament;

    const fromGames = fromReg.gameRegistrationDetails?.games?.flatMap((d) => d);
    const toGames = toReg.gameRegistrationDetails?.games?.flatMap((d) => d);

    const commonGame = fromGames.find((g) =>
      toGames.map((x) => x.toString()).includes(g.toString())
    );

    if (!commonGame) {
      throw new ApiResponse(
        400,
        null,
        "Both users must be registered in the same game"
      );
    }

    
  }

  return Response.json(
    new ApiResponse(
      200,
      { request },
      status === "accepted"
        ? "Team-up request accepted and team updated/created"
        : "Team-up request updated"
    )
  );
});

export const DELETE = asyncHandler(async (_, context) => {
  const user = await requireAuth();
  const { id } = context.params;

  const request = await TeamUp.findById(id);

  if (!request) {
    throw new ApiResponse(404, null, "Team-up request not found");
  }

  // Only sender or receiver can delete
  if (
    request.from.toString() !== user._id.toString() &&
    request.to.toString() !== user._id.toString()
  ) {
    throw new ApiResponse(403, null, "Not authorized to delete this request");
  }

  await request.deleteOne();

  return Response.json(
    new ApiResponse(200, null, "Team-up request deleted successfully")
  );
});
