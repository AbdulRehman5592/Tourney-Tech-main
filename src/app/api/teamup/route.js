// import { Registration } from "@/models/Registration";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { requireAuth } from "@/utils/server/auth";
import "@/models/Game";
import { parseForm } from "@/utils/server/parseForm";
// import { ApiError } from "@/utils/server/ApiError";
import { TeamUp } from "@/models/TeamUp";
import { Team } from "@/models/Team";
import "@/models/Tournament";
import { Registration } from "@/models/Registration";
// import { User } from "@/models/User";

export const POST = asyncHandler(async (req) => {
  const user = await requireAuth(req);
  const { fields } = await parseForm(req);

  const to = fields.to?.toString();
  const tournamentId = fields.tournamentId?.toString();
  const gameId = fields.gameId?.toString();
  const message = fields.message?.toString();
  if (!to || !tournamentId || !gameId)
    throw new ApiResponse(
      400,
      null,
      "Receiver user (to) tournament and game is required"
    );

  if (to.toString() === user._id.toString())
    throw new ApiResponse(400, null, "Cannot send team-up request to yourself");

  const existRequest = await TeamUp.findOne({
    $or: [
      { from: user._id, to },
      { from: to, to: user._id },
    ],
    status: { $in: ["pending", "accepted"] },
    tournament: tournamentId,
    gameId
  });
  if (existRequest)
    throw new ApiResponse(400, null, "Team-up request already exists");

  const request = await TeamUp.create({
    from: user._id,
    to,
    message,
    tournament: tournamentId,
    gameId
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
    .populate("tournament")
    .populate("gameId")
    .lean();

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
  const requestsWithGames = requests.map((req) => {
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
