// api/users/[id]/route.js

import { connectDB } from "@/lib/mongoose";
import { User } from "@/models/User";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { ApiError } from "@/utils/server/ApiError";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { requireAuth } from "@/utils/server/auth";
import { requireRole } from "@/utils/server/auth";
import { requireAdmin } from "@/utils/server/roleGuards";

// Admin-only: grant/revoke global capability flags -- "may create their own
// tournaments" and "Tourney Techs Staff" (general entrusted operations
// work, e.g. deciding which tournaments count toward national rankings).
// Deliberately separate fields/route from the role enum (see
// requireTournamentCreator/requireTourneyTechStaff in roleGuards.js) rather
// than folding these into /api/users/[id]/role, which has its own drifted
// allowed-values list.
export const PATCH = asyncHandler(async (req, { params }) => {
  await connectDB();
  await requireAdmin();
  const { id } = await params;

  const body = await req.json();
  const update = {};
  if (body?.canCreateTournaments !== undefined) {
    if (typeof body.canCreateTournaments !== "boolean") {
      throw new ApiError(400, "canCreateTournaments must be a boolean");
    }
    update.canCreateTournaments = body.canCreateTournaments;
  }
  if (body?.isTourneyTechStaff !== undefined) {
    if (typeof body.isTourneyTechStaff !== "boolean") {
      throw new ApiError(400, "isTourneyTechStaff must be a boolean");
    }
    update.isTourneyTechStaff = body.isTourneyTechStaff;
  }
  if (Object.keys(update).length === 0) {
    throw new ApiError(400, "canCreateTournaments or isTourneyTechStaff (boolean) is required");
  }

  const user = await User.findByIdAndUpdate(id, update, { new: true }).select(
    "-password -refreshToken -__v"
  );
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
