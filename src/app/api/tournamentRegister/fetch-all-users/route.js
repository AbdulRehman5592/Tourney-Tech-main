import { Registration } from "@/models/Registration";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { requireAdmin } from "@/utils/server/roleGuards";
import "@/models/Game";

export const GET = asyncHandler(async () => {
  await requireAdmin();

  const fetchAllRegisterdUsersInTournament = await Registration.find()
    .populate("user")
    .populate({
      path: "gameRegistrationDetails.games",
      model: "Game",
    })
    .populate("tournament");

  return Response.json(
    new ApiResponse(
      200,
      fetchAllRegisterdUsersInTournament,
      "Registrations fetched successfully"
    )
  );
});
