import { requireAuth } from "@/utils/server/auth";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { computeNationalRankings } from "@/utils/server/nationalRankings";

export const GET = asyncHandler(async (req) => {
  await requireAuth(req);
  const rankings = await computeNationalRankings();
  return Response.json(new ApiResponse(200, { rankings }, "National rankings fetched"));
});
