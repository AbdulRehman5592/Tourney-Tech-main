import { asyncHandler } from "@/utils/server/asyncHandler";
import { requireAdmin } from "@/utils/server/roleGuards";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { Team } from "@/models/Team";
import mongoose from "mongoose";

// ✅ Partial Update Team
export const PATCH = asyncHandler(async (req, { params }) => {
  await requireAdmin();

  const { id } = params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiResponse(400, null, "Invalid team ID");
  }

  const body = await req.json();
  const { name, logo, members } = body;

  const team = await Team.findById(id);
  if (!team) {
    throw new ApiResponse(404, null, "Team not found");
  }

  // Validation for members
  if (members && members.length !== 2) {
    throw new ApiResponse(400, null, "Exactly 2 members are required");
  }

  // Update only provided fields
  if (name) team.name = name;
  if (logo !== undefined) team.logo = logo;
  if (members) team.members = members;

  await team.save();

  return Response.json(
    new ApiResponse(200, team, "Team updated successfully")
  );
});

// ✅ Delete Team
export const DELETE = asyncHandler(async (req, { params }) => {
  await requireAdmin();

  const { id } = params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiResponse(400, null, "Invalid team ID");
  }

  const team = await Team.findByIdAndDelete(id);
  if (!team) {
    throw new ApiResponse(404, null, "Team not found");
  }

  return Response.json(
    new ApiResponse(200, null, "Team deleted successfully")
  );
});
