import { Region } from "@/models/Region";
import { User } from "@/models/User";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { ApiError } from "@/utils/server/ApiError";
import { requireAdmin } from "@/utils/server/roleGuards";

// PATCH /api/regions/:id -- rename only; code is immutable once assigned
// (it's stamped onto existing Team/User docs already).
export const PATCH = asyncHandler(async (req, context) => {
  await requireAdmin();
  const { id } = await context.params;
  const body = await req.json();
  const name = body.name?.toString().trim();
  if (!name) throw new ApiError(400, "Region name is required");

  const duplicate = await Region.findOne({ name, _id: { $ne: id } });
  if (duplicate) throw new ApiError(409, "A region with this name already exists");

  const region = await Region.findByIdAndUpdate(id, { name }, { new: true, runValidators: true });
  if (!region) throw new ApiError(404, "Region not found");

  return Response.json(new ApiResponse(200, region, "Region updated"));
});

// DELETE /api/regions/:id -- blocked for built-in regions and for any region
// currently assigned to a player, so existing users/teams never get orphaned.
export const DELETE = asyncHandler(async (_req, context) => {
  await requireAdmin();
  const { id } = await context.params;

  const region = await Region.findById(id);
  if (!region) throw new ApiError(404, "Region not found");
  if (region.isBuiltIn) {
    throw new ApiError(400, "Built-in regions can't be deleted");
  }

  const inUse = await User.countDocuments({ region: region.code });
  if (inUse > 0) {
    throw new ApiError(409, `Region is assigned to ${inUse} user(s) and can't be deleted`);
  }

  await region.deleteOne();
  return Response.json(new ApiResponse(200, null, "Region deleted"));
});
