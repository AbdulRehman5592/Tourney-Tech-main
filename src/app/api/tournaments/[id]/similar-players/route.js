import { Registration } from "@/models/Registration";
import { TeamUp } from "@/models/TeamUp";
// import { Tournament } from "@/models/Tournament";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { requireAuth } from "@/utils/server/auth";
import "@/models/Game";

export const GET = asyncHandler(async () => {
  const user = await requireAuth();

  // ✅ Current user ki registrations laao
  const currentUserRegistrations = await Registration.find({
    user: user?._id,
    gameEntries: { $elemMatch: { status: "approved", removed: { $ne: true } } },
  })
    .populate({
      path: "tournament",
      model: "Tournament",
      select: "games", // only games needed
    })
    .populate({
      path: "gameEntries.game",
      model: "Game",
    });

  if (!currentUserRegistrations || currentUserRegistrations.length === 0) {
    return Response.json(
      new ApiResponse(404, null, "User is not registered in any tournament")
    );
  }

  let allMatchedUsers = [];

  for (const reg of currentUserRegistrations) {
    // ✅ Tournament me check karo ke iske games me koi "double_player" type hai ya nahi
    const tournament = reg.tournament;
    if (
      !tournament ||
      !Array.isArray(tournament.games) ||
      !tournament.games.some((g) => g.tournamentTeamType === "double_player")
    ) {
      continue; // agar double_player game nahi hai to skip
    }

    const tournamentId = reg.tournament._id;

    const gameIds = (reg.gameEntries || [])
      .filter((e) => e.status === "approved" && !e.removed)
      .map((e) => e.game?._id || e.game);

    const matchingRegistrations = await Registration.find({
      tournament: tournamentId,
      gameEntries: {
        $elemMatch: { game: { $in: gameIds }, status: "approved", removed: { $ne: true } },
      },
      user: { $ne: user._id },
    })
      .populate({
        path: "user",
        model: "User",
        select: "-password -refreshToken -accessToken -__v",
      })
      .populate({
        path: "gameEntries.game",
        model: "Game",
      });

    const matchedUsers = matchingRegistrations.map((r) => r.user);
    allMatchedUsers = [...allMatchedUsers, ...matchedUsers];
  }

  const uniqueMatchedUsers = Array.from(
    new Map(allMatchedUsers.map((u) => [u._id.toString(), u])).values()
  );

  // ✅ Pending requests nikaalo
  const pendingRequests = await TeamUp.find({
    from: user._id,
    status: "pending",
  }).select("to");

  // ✅ Accepted requests nikaalo
  const acceptedRequests = await TeamUp.find({
    $or: [{ from: user._id }, { to: user._id }],
    status: "accepted",
  }).select("from to");

  const pendingUserIds = new Set(
    pendingRequests.map((req) => req.to.toString())
  );

  const acceptedUserIds = new Set(
    acceptedRequests.flatMap((req) => [
      req.from.toString(),
      req.to.toString(),
    ])
  );

  const matchedUsersWithFlags = uniqueMatchedUsers.map((u) => ({
    ...u.toObject(),
    isSendRequest: pendingUserIds.has(u._id.toString()),
    alreadyMember: acceptedUserIds.has(u._id.toString()),
  }));

  return Response.json(
    new ApiResponse(
      200,
      { currentUser: user, matchedUsers: matchedUsersWithFlags },
      "Fetched users with same tournament and same games (only double_player tournaments)"
    )
  );
});
