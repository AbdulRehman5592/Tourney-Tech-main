import { asyncHandler } from "@/utils/server/asyncHandler";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { ApiError } from "@/utils/server/ApiError";
import { requireAdmin } from "@/utils/server/roleGuards";
import { ExternalRankingAward } from "@/models/ExternalRankingAward";
import mongoose from "mongoose";

// Lets an admin remove a manually-entered award, e.g. to fix a mistaken
// entry -- there's no separate edit screen, so correcting one means
// deleting it and re-adding it with the right values.
export const DELETE = asyncHandler(async (req, { params }) => {
  await requireAdmin();

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid award ID");
  }

  const award = await ExternalRankingAward.findByIdAndDelete(id);
  if (!award) {
    throw new ApiError(404, "Award not found");
  }

  return Response.json(new ApiResponse(200, null, "Award removed"));
});
