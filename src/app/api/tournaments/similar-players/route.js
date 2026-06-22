import { Registration } from "@/models/Registration";
import { TeamUp } from "@/models/TeamUp";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { requireAuth } from "@/utils/server/auth";
import "@/models/Game";
import "@/models/Tournament";

export const GET = asyncHandler(async () => {
  const user = await requireAuth();

  // ✅ Current user ki registrations laao
  const currentUserRegistrations = await Registration.find({
    user: user?._id,
    "gameRegistrationDetails.status": "approved",
  })
    .populate({
      path: "tournament",
      model: "Tournament",
      select: "games", // only games needed
    })
    .populate({
      path: "gameRegistrationDetails.games",
      model: "Game",
    });

  if (!currentUserRegistrations || currentUserRegistrations.length === 0) {
    return Response.json(
      new ApiResponse(404, null, "User is not registered in any tournament")
    );
  }

  let allMatchedUsersWithDetails = [];

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

    const gameDetailsArray = Array.isArray(reg.gameRegistrationDetails)
      ? reg.gameRegistrationDetails
      : [reg.gameRegistrationDetails].filter(Boolean);

    const gameIds = gameDetailsArray.flatMap((d) =>
      (Array.isArray(d.games) ? d.games : [d.games]).map((g) => g._id || g)
    );

    const matchingRegistrations = await Registration.find({
      tournament: tournamentId,
      "gameRegistrationDetails.games": { $in: gameIds },
      "gameRegistrationDetails.status": "approved",
      user: { $ne: user._id },
    })
      .populate({
        path: "user",
        model: "User",
        select: "-password -refreshToken -accessToken -__v",
      })
      .populate({
        path: "gameRegistrationDetails.games",
        model: "Game",
      })
      .populate({
        path: "tournament",
        model: "Tournament",
        select: "name games",
      });

    // 👇 har registration ko ek structured object banate hain
    for (const r of matchingRegistrations) {
      allMatchedUsersWithDetails.push({
        user: r.user,
        tournament: {
          _id: r.tournament._id,
          name: r.tournament.name,
        },
        games: r.gameRegistrationDetails.games.flatMap((d) => d),
      });
    }
  }

  // ✅ Unique users ke saath tournaments + games merge karo
  const userTournamentGameMap = new Map();

  for (const entry of allMatchedUsersWithDetails) {
    const userId = entry.user._id.toString();
    if (!userTournamentGameMap.has(userId)) {
      userTournamentGameMap.set(userId, {
        ...entry.user.toObject(),
        tournaments: [],
      });
    }

    const existing = userTournamentGameMap.get(userId);

    // check karo ke tournament already added hai ya nahi
    const existingTournament = existing.tournaments.find(
      (t) => t._id.toString() === entry.tournament._id.toString()
    );

    if (existingTournament) {
      // agar tournament already hai to uske games merge kar do
      const gameIds = new Set(
        existingTournament.games.map((g) => g._id.toString())
      );
      for (const g of entry.games) {
        if (!gameIds.has(g._id.toString())) {
          existingTournament.games.push(g);
        }
      }
    } else {
      existing.tournaments.push({
        _id: entry.tournament._id,
        name: entry.tournament.name,
        games: entry.games,
      });
    }

    userTournamentGameMap.set(userId, existing);
  }

  const matchedUsersWithTournamentGames = Array.from(
    userTournamentGameMap.values()
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
    acceptedRequests.flatMap((req) => [req.from.toString(), req.to.toString()])
  );

  // ✅ Flags add karo
  const matchedUsersWithFlags = matchedUsersWithTournamentGames.map((u) => ({
    ...u,
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
