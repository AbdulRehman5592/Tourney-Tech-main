import { requireAuth } from "@/utils/server/auth";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { ApiError } from "@/utils/server/ApiError";
import { computeNationalRankings } from "@/utils/server/nationalRankings";

export const GET = asyncHandler(async (req) => {
  await requireAuth(req);

  const { searchParams } = new URL(req.url);
  const gameType = searchParams.get("gameType");
  if (!gameType) {
    throw new ApiError(400, "A gameType is required to fetch national rankings.");
  }

  const rankings = await computeNationalRankings(gameType);
  return Response.json(new ApiResponse(200, { rankings }, "National rankings fetched"));
});
