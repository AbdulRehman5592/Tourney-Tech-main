// import { Registration } from "@/models/Registration";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { asyncHandler } from "@/utils/server/asyncHandler";
import "@/models/Game";
import { requireAuth } from "@/utils/server/auth";
import { Tournament } from "@/models/Tournament";
import { Team } from "@/models/Team";

export const GET = asyncHandler(async (_, context) => {
  const id = context.params?.id;
  const user = await requireAuth();

  if (!id) throw new ApiResponse(400, null, "ID parameter is missing");

  let registeredGames;

  if (user?.role === "admin") {
    registeredGames = await Tournament.findById(id).populate("games.game");
  } else {
    const existUserTeam = await Team.find({
      tournament: id,
      members: { $in: [user?._id] },
    });

    if (existUserTeam) {
      registeredGames = await Tournament.findById(id).populate("games.game");
    }
  }

  return Response.json(
    new ApiResponse(
      200,
      registeredGames,
      "Registered Games fetched successfully"
    )
  );
});
