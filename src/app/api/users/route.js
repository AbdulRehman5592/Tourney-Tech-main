// import { connectDB } from "@/lib/mongoose";
import { User } from "@/models/User";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { requireAuth } from "@/utils/server/auth";
import { requireRole } from "@/utils/server/auth";

export const GET = asyncHandler(async () => {
  const userInfo = await requireAuth();
  await requireRole(userInfo, "admin");

  const users = await User.find().select(
    "-password -refreshToken -accessToken -__v"
  ).sort({ createdAt: -1 });

  return Response.json(new ApiResponse(200, users, "Fetched all users"));
});
