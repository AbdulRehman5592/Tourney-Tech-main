// src/app/api/users/[id]/role/route.js

import { connectDB } from "@/lib/mongoose";
import { User } from "@/models/User";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { ApiError } from "@/utils/server/ApiError";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { requireAuth } from "@/utils/server/auth";
import { requireRole } from "@/utils/server/auth";


export const PATCH = asyncHandler(async (req, { params }) => {
  await connectDB();

  const userInfo = await requireAuth(); // get the logged-in user
  await requireRole(userInfo, "admin"); // enforce admin access

  const userId = params.id;
  if (!userId) {
    throw new ApiError(400, "User ID is required in URL");
  }

  const { role } = await req.json();

  const validRoles = ["player", "manager", "admin"];
  if (!validRoles.includes(role)) {
    throw new ApiError(
      400,
      `Invalid role. Must be one of: ${validRoles.join(", ")}`
    );
  }

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { role },
    { new: true, runValidators: true }
  ).select("-password -refreshToken -__v -accessToken");

  if (!updatedUser) {
    throw new ApiError(404, "User not found");
  }

  return Response.json(
    new ApiResponse(200, updatedUser, `User role updated to ${role}`)
  );
});
