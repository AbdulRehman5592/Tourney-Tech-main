import { connectDB } from "@/lib/mongoose";
import { Registration } from "@/models/Registration";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { requireAdmin } from "@/utils/server/roleGuards";

// Admin refund queue: every registration with at least one dropped game
// entry (player-cancelled or admin-removed), most recent first. Not just
// refund-eligible ones -- this doubles as the general cancellation log so
// admins can see who dropped what, even when nothing is owed back. A
// registration can appear here while still active for its OTHER games.
export const GET = asyncHandler(async () => {
  await connectDB();
  await requireAdmin();

  const registrations = await Registration.find({
    gameEntries: { $elemMatch: { $or: [{ cancelled: true }, { removed: true }] } },
  })
    .populate("tournament", "name status startDate")
    .populate("user", "firstname lastname username email")
    .populate({ path: "gameEntries.game", model: "Game" })
    .sort({ updatedAt: -1 })
    .lean();

  return Response.json(
    new ApiResponse(200, registrations, "Cancelled registrations fetched successfully")
  );
});
