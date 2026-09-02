// /api/invites/[token] -- public lookup (landing page) + inviter-only cancel

import "@/models/Game";
import { Invite } from "@/models/Invite";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { ApiError } from "@/utils/server/ApiError";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { requireAuth } from "@/utils/server/auth";

// No requireAuth here on purpose -- the whole point of the link is that the
// recipient isn't logged in (or doesn't even have an account) yet. Only
// non-sensitive fields are returned.
export const GET = asyncHandler(async (_, context) => {
  const { token } = await context.params;

  const invite = await Invite.findOne({ token })
    .populate("inviter", "firstname lastname username")
    .populate({ path: "tournament", populate: { path: "games.game", select: "name platform" } });

  if (!invite) {
    throw new ApiError(404, "Invite not found");
  }

  // invite.gameId is the specific scheduled instance (Tournament.games[]._id),
  // not the catalog game id.
  const gameConfig = invite.tournament?.games?.id(invite.gameId);

  const isExpired = invite.status === "pending" && invite.expiresAt < new Date();

  return Response.json(
    new ApiResponse(
      200,
      {
        token: invite.token,
        status: invite.status,
        isExpired,
        inviterId: invite.inviter?._id,
        inviterName: `${invite.inviter?.firstname || ""} ${invite.inviter?.lastname || ""}`.trim(),
        tournamentName: invite.tournament?.name || "Tournament",
        gameName: gameConfig?.game?.name || null,
        mode: invite.mode,
        message: invite.message || "",
      },
      "Invite fetched"
    )
  );
});

export const DELETE = asyncHandler(async (_, context) => {
  const user = await requireAuth();
  const { token } = await context.params;

  const invite = await Invite.findOne({ token });
  if (!invite) {
    throw new ApiError(404, "Invite not found");
  }
  if (invite.inviter.toString() !== user._id.toString()) {
    throw new ApiError(403, "Not authorized to cancel this invite");
  }

  invite.status = "cancelled";
  await invite.save();

  return Response.json(new ApiResponse(200, { invite }, "Invite cancelled"));
});
