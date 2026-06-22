import { connectDB } from "@/lib/mongoose";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { ApiError } from "@/utils/server/ApiError";
import { asyncHandler } from "@/utils/server/asyncHandler";

export const GET = asyncHandler(async () => {
  try {
    await connectDB();
  } catch (err) {
    throw new ApiError(500, "Database connection failed", err);
  }

  return Response.json(
    new ApiResponse(
      200,
      {
        db: "connected",
        timestamp: new Date().toISOString(),
      },
      "API and Database are healthy"
    )
  );
});
