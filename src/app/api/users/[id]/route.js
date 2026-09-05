// api/users/[id]/route.js

import { connectDB } from "@/lib/mongoose";
import { User } from "@/models/User";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { ApiError } from "@/utils/server/ApiError";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { requireAuth } from "@/utils/server/auth";
import { requireRole } from "@/utils/server/auth";
import { requireAdmin } from "@/utils/server/roleGuards";

// Admin-only: grant/revoke the global "may create their own tournaments"
// capability. Deliberately a separate field/route from the role enum
// (see requireTournamentCreator in roleGuards.js) rather than folding this
// into /api/users/[id]/role, which has its own drifted allowed-values list.
export const PATCH = asyncHandler(async (req, { params }) => {
  await connectDB();
  await requireAdmin();
  const { id } = await params;

  const body = await req.json();
  if (typeof body?.canCreateTournaments !== "boolean") {
    throw new ApiError(400, "canCreateTournaments (boolean) is required");
  }

  const user = await User.findByIdAndUpdate(
    id,
    { canCreateTournaments: body.canCreateTournaments },
    { new: true }
  ).select("-password -refreshToken -__v");
  if (!user) throw new ApiError(404, "User not found");

  return Response.json(new ApiResponse(200, user, "User updated successfully"));
});

export const GET = asyncHandler(async (_, { params }) => {
  await connectDB();

  const { id } = await params;
  const userInfo = await requireAuth();

  if (userInfo._id !== id) {
    await requireRole(userInfo, "admin"); // Only admin can fetch others
  }

  const user = await User.findById(id).select(
    "-password -refreshToken -accessToken -__v"
  );
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return Response.json(new ApiResponse(200, user, "Fetched user details"));
});
