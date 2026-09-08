import { connectDB } from "@/lib/mongoose";
import { Registration } from "@/models/Registration";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { requireAdmin } from "@/utils/server/roleGuards";

// Admin refund queue: every cancelled registration, most recent first. Not
// just refund-eligible ones -- this doubles as the general cancellation log
// so admins can see who dropped out of what, even when nothing is owed back.
export const GET = asyncHandler(async () => {
  await connectDB();
  await requireAdmin();

  const registrations = await Registration.find({ cancelled: true })
    .populate("tournament", "name status startDate")
    .populate("user", "firstname lastname username email")
    .populate({ path: "gameRegistrationDetails.games", model: "Game" })
    .sort({ cancelledAt: -1 })
    .lean();

  return Response.json(
    new ApiResponse(200, registrations, "Cancelled registrations fetched successfully")
  );
});
