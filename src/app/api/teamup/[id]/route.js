// /api/teamup/[id]

import { Tournament } from "@/models/Tournament";
import { TeamUp } from "@/models/TeamUp";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { requireAuth } from "@/utils/server/auth";
import { parseForm } from "@/utils/server/parseForm";
import { validateAcceptedPairing } from "@/utils/server/teamup";

export const PATCH = asyncHandler(async (req, context) => {
  const user = await requireAuth();
  const { id } = await context.params;
  const { fields } = await parseForm(req);
  const status = fields.status?.toString();

  if (!["accepted", "rejected"].includes(status)) {
    throw new ApiResponse(400, null, "Invalid status value");
  }

  const request = await TeamUp.findById(id)
    .populate("from", "firstname lastname username email gender")
    .populate("to", "firstname lastname username email gender");

  if (!request) {
    throw new ApiResponse(404, null, "Team-up request not found");
  }

  if (request.to?._id.toString() !== user._id.toString()) {
    throw new ApiResponse(403, null, "Not authorized to update this request");
  }

  if (status === "accepted") {
    // Pairing up no longer requires either side to already be registered for
    // the tournament/game (see POST /api/teamup) -- resolve the game/cost
    // straight off the tournament's own config instead of registration data.
    const tournament = await Tournament.findById(request.tournament);
    if (!tournament) {
      throw new ApiResponse(400, null, "Tournament not found");
    }

    // Snapshot the pair's cost at accept time (owed by `from`, the requestor)
    // and initialize payment tracking. Doubles is a scoring overlay only --
    // no Team/TeamMember gets created; paired players keep playing their own
    // solo matches in the bracket untouched.
    const { costOwed, payment } = await validateAcceptedPairing({
      tournament,
      gameId: request.gameId,
      mode: request.mode,
      fromUser: request.from,
      toUser: request.to,
      excludeRequestId: request._id,
    });
    request.costOwed = costOwed;
    request.payment = payment;
  }

  request.status = status;
  await request.save();

  return Response.json(
    new ApiResponse(
      200,
      { request },
      status === "accepted"
        ? "Team-up request accepted"
        : "Team-up request updated"
    )
  );
});

export const DELETE = asyncHandler(async (_, context) => {
  const user = await requireAuth();
  const { id } = await context.params;

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
