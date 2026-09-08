import { asyncHandler } from "@/utils/server/asyncHandler";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { ApiError } from "@/utils/server/ApiError";
import { requireTourneyTechStaff } from "@/utils/server/roleGuards";
import { Tournament } from "@/models/Tournament";
import mongoose from "mongoose";

// Narrow, dedicated toggle for Tournament.nationallyRanked -- deliberately
// its own route (rather than folded into the general PATCH
// /api/tournaments/[id], which is admin-only) so Tourney Techs Staff can
// flip this without needing full admin access.
export const PATCH = asyncHandler(async (req, { params }) => {
  await requireTourneyTechStaff();

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid tournament ID");
  }

  const { nationallyRanked } = await req.json();
  if (typeof nationallyRanked !== "boolean") {
    throw new ApiError(400, "nationallyRanked (boolean) is required");
  }

  const tournament = await Tournament.findByIdAndUpdate(
    id,
    { nationallyRanked },
    { new: true }
  ).select("_id name nationallyRanked");
  if (!tournament) throw new ApiError(404, "Tournament not found");

  return Response.json(
    new ApiResponse(
      200,
      tournament,
      nationallyRanked ? "Tournament now counts toward national rankings" : "Tournament excluded from national rankings"
    )
  );
});
