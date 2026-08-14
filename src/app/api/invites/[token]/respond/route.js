// /api/invites/[token]/respond -- the invitee (now signed up/logged in)
// accepts or rejects the pairing proposed by the invite link.

import { Invite } from "@/models/Invite";
import { TeamUp } from "@/models/TeamUp";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { ApiError } from "@/utils/server/ApiError";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { requireAuth } from "@/utils/server/auth";
import { parseForm } from "@/utils/server/parseForm";
import { validateAcceptedPairing } from "@/utils/server/teamup";

export const POST = asyncHandler(async (req, context) => {
  const user = await requireAuth();
  const { token } = await context.params;
  const { fields } = await parseForm(req);
  const action = fields.action?.toString();

  if (!["accept", "reject"].includes(action)) {
    throw new ApiError(400, "action must be 'accept' or 'reject'");
  }

  const invite = await Invite.findOne({ token })
    .populate("tournament")
    .populate("inviter", "firstname lastname username gender");

  if (!invite) {
    throw new ApiError(404, "Invite not found");
  }
  if (invite.status !== "pending") {
    throw new ApiError(400, "This invite has already been responded to");
  }
  if (invite.expiresAt < new Date()) {
    throw new ApiError(400, "This invite link has expired");
  }
  if (invite.inviter._id.toString() === user._id.toString()) {
    throw new ApiError(400, "You can't respond to your own invite");
  }

  if (action === "reject") {
    invite.status = "rejected";
    invite.invitee = user._id;
    await invite.save();

    return Response.json(new ApiResponse(200, { invite }, "Invite declined"));
  }

  const { costOwed, payment } = await validateAcceptedPairing({
    tournament: invite.tournament,
    gameId: invite.gameId,
    mode: invite.mode,
    fromUser: invite.inviter,
    toUser: user,
    excludeRequestId: null,
  });

  const teamUp = await TeamUp.create({
    from: invite.inviter._id,
    to: user._id,
    tournament: invite.tournament._id,
    gameId: invite.gameId,
    mode: invite.mode,
    message: invite.message,
    status: "accepted",
    costOwed,
    payment,
  });

  invite.status = "accepted";
  invite.invitee = user._id;
  invite.teamUp = teamUp._id;
  await invite.save();

  return Response.json(
    new ApiResponse(200, { invite, teamUp }, "Invite accepted — you're paired up!")
  );
});
