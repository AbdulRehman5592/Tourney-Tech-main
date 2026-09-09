import { ApiResponse } from "@/utils/server/ApiResponse";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { requireAuth } from "@/utils/server/auth";
import "@/models/Game";
import { parseForm } from "@/utils/server/parseForm";
import { TeamUp } from "@/models/TeamUp";
import { Team } from "@/models/Team";
import { Tournament } from "@/models/Tournament";
import { Registration } from "@/models/Registration";
import { User } from "@/models/User";
import { isMixedDoublesGenderOk, getEnabledGameConfig } from "@/utils/server/doublesConfig";
import { assertNotAlreadyTeammates } from "@/utils/server/teamup";

export const POST = asyncHandler(async (req) => {
  const user = await requireAuth(req);
  const { fields } = await parseForm(req);

  const to = fields.to?.toString();
  const tournamentId = fields.tournamentId?.toString();
  const gameId = fields.gameId?.toString();
  const message = fields.message?.toString();
  const mode = fields.mode?.toString();
  if (!to || !tournamentId || !gameId)
    throw new ApiResponse(
      400,
      null,
      "Receiver user (to) tournament and game is required"
    );

  if (!["team", "doubles", "mixed_doubles"].includes(mode))
    throw new ApiResponse(400, null, "mode must be 'team', 'doubles' or 'mixed_doubles'");

  if (to.toString() === user._id.toString())
    throw new ApiResponse(400, null, "Cannot send team-up request to yourself");

  const tournament = await Tournament.findById(tournamentId);
  getEnabledGameConfig(tournament, gameId, mode);

  if (mode === "mixed_doubles") {
    const toUser = await User.findById(to).select("gender");
    if (!isMixedDoublesGenderOk(user.gender, toUser?.gender))
      throw new ApiResponse(400, null, "Mixed doubles requires opposite genders");
  }

  // Doubles/mixed doubles is a side-pot overlay only -- players already
  // rostered together as teammates aren't eligible to also pair up here.
  if (mode === "doubles" || mode === "mixed_doubles") {
    await assertNotAlreadyTeammates({
      tournamentId,
      gameConfigId: gameId,
      userAId: user._id,
      userBId: to,
    });
  }

  // Team Up is a site-wide directory: any user can propose pairing with any
  // other user for any tournament/game that has doubles enabled, whether or
  // not either side has registered yet. This is deliberate -- someone unsure
  // they can find a partner may not register at all, so letting them line up
  // a partner first is meant to drive registrations, not gate on them.
  const existRequest = await TeamUp.findOne({
    $or: [
      { from: user._id, to },
      { from: to, to: user._id },
    ],
    status: { $in: ["pending", "accepted"] },
    tournament: tournamentId,
    gameId,
    mode,
  });
  if (existRequest)
    throw new ApiResponse(400, null, "Team-up request already exists");

  const request = await TeamUp.create({
    from: user._id,
    to,
    message,
    tournament: tournamentId,
    gameId,
    mode,
  });

  return Response.json(
    new ApiResponse(201, request, "Team-up request sent successfully")
  );
});

export const GET = asyncHandler(async () => {
  const user = await requireAuth();

  // get requests (pending + accepted)
  const requests = await TeamUp.find({
    $or: [{ from: user._id }, { to: user._id }],
    status: { $in: ["pending", "accepted"] },
  })
    .populate("from", "firstname lastname username email")
    .populate("to", "firstname lastname username email")
    .populate({ path: "tournament", populate: { path: "games.game", select: "name platform" } })
    .sort({ createdAt: -1 })
    .lean();

  // `gameId` is stored as a plain string (not a ref) -- it's the specific
  // scheduled instance (Tournament.games[]._id), not the catalog game id, so
  // resolve the actual game name/platform straight off that subdocument.
  // This works whether or not either side has ever registered.
  const requestsWithGame = requests.map((req) => {
    const gameConfig = req.tournament?.games?.find(
      (g) => g._id?.toString() === req.gameId
    );
    return {
      ...req,
      game: gameConfig?.game || null,
      eventTitle: gameConfig?.eventTitle || null,
    };
  });

  const userIds = [
    ...new Set([
      ...requests.map((r) => r.from._id.toString()),
      ...requests.map((r) => r.to._id.toString()),
    ]),
  ];

  const tournamentIds = [
    ...new Set(
      requests
        .filter((r) => r.tournament) // only requests with tournament
        .map((r) => r.tournament._id.toString())
    ),
  ];

  // Fetch registrations of only these users
  const registrations = await Registration.find({
    user: { $in: userIds },
    tournament: { $in: tournamentIds },
  })
    .populate("tournament")
    .populate("gameRegistrationDetails.games")
    .lean();

  // Merge games into requests only if BOTH from & to are registered in same tournament
  const requestsWithGames = requestsWithGame.map((req) => {
    const fromReg = registrations.find(
      (r) =>
        r.user.toString() === req.from._id.toString() &&
        r.tournament?._id.toString() === req.tournament?._id.toString()
    );

    const toReg = registrations.find(
      (r) =>
        r.user.toString() === req.to._id.toString() &&
        r.tournament?._id.toString() === req.tournament?._id.toString()
    );

    // Only merge if both registered
    if (fromReg && toReg) {
      return {
        ...req,
        fromGames: fromReg?.gameRegistrationDetails?.games || [],
        toGames: toReg?.gameRegistrationDetails?.games || [],
        // The specific scheduled instance(s) each side registered for
        // (Tournament.games[]._id) -- what actually determines "do they
        // share a registration for this game", since the catalog game id
        // alone can't tell two independent instances apart.
        fromGameConfigIds: (fromReg?.gameRegistrationDetails?.gameConfigIds || []).map((id) =>
          id.toString()
        ),
        toGameConfigIds: (toReg?.gameRegistrationDetails?.gameConfigIds || []).map((id) =>
          id.toString()
        ),
      };
    }

    // Otherwise return as is
    return req;
  });

  const acceptedUserIds = requests
    .filter((r) => r.status === "accepted")
    .flatMap((r) => [r.from._id.toString(), r.to._id.toString()]);

  let teams = [];
  if (acceptedUserIds.length > 0) {
    teams = await Team.find({
      members: { $in: acceptedUserIds },
    })
      .populate("game")
      .populate("tournament")
      .populate("createdBy", "firstname lastname username email")
      .populate("members", "firstname lastname username email")
      .lean();
  }

  return Response.json(
    new ApiResponse(
      200,
      { requests: requestsWithGames, teams },
      "Fetched team-up requests & teams"
    )
  );
});
