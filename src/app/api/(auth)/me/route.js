import { connectDB } from "@/lib/mongoose";
import { User } from "@/models/User";
import { requireAuth } from "@/utils/server/auth";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { ApiError } from "@/utils/server/ApiError";

export const GET = asyncHandler(async () => {
  await connectDB();

  // 🔐 Check for access token & get user info
  const authUser = await requireAuth(); // { _id, email, username }

  const user = await User.findById(authUser._id).select(
    "-password -refreshToken"
  );

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return Response.json(
    new ApiResponse(200, { user }, "Current user fetched successfully")
  );
});
