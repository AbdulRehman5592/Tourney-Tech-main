// /api/invites -- generate a shareable invite link for a not-yet-registered
// partner (see /api/invites/[token] and /api/invites/[token]/respond)

import crypto from "crypto";
import { Invite } from "@/models/Invite";
import { Tournament } from "@/models/Tournament";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { ApiError } from "@/utils/server/ApiError";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { requireAuth } from "@/utils/server/auth";
import { parseForm } from "@/utils/server/parseForm";
import { getEnabledGameConfig } from "@/utils/server/doublesConfig";

export const POST = asyncHandler(async (req) => {
  const user = await requireAuth();
  const { fields } = await parseForm(req);

  const tournamentId = fields.tournamentId?.toString();
  const gameId = fields.gameId?.toString();
  const mode = fields.mode?.toString();
  const message = fields.message?.toString();

  if (!tournamentId || !gameId)
    throw new ApiError(400, "Tournament and game are required");
  if (!["doubles", "mixed_doubles"].includes(mode))
    throw new ApiError(400, "mode must be 'doubles' or 'mixed_doubles'");

  const tournament = await Tournament.findById(tournamentId);
  // Same tournament/game/mode-enabled validation as a direct TeamUp request --
  // the gender rule can't be checked yet since the invitee doesn't exist.
  getEnabledGameConfig(tournament, gameId, mode);

  const token = crypto.randomBytes(24).toString("hex");

  const invite = await Invite.create({
    token,
    inviter: user._id,
    tournament: tournamentId,
    gameId,
    mode,
    message,
  });

  return Response.json(
    new ApiResponse(201, { invite }, "Invite link created")
  );
});
