// api/users/[id]/route.js

import { connectDB } from "@/lib/mongoose";
import { User } from "@/models/User";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { ApiError } from "@/utils/server/ApiError";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { requireAuth } from "@/utils/server/auth";
import { requireRole } from "@/utils/server/auth";

export const GET = asyncHandler(async (_, { params }) => {
  await connectDB();

  const userInfo = await requireAuth();

  if (userInfo._id !== params.id) {
    await requireRole(userInfo, "admin"); // Only admin can fetch others
  }

  const user = await User.findById(params.id).select(
    "-password -refreshToken -accessToken -__v"
  );
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return Response.json(new ApiResponse(200, user, "Fetched user details"));
});
