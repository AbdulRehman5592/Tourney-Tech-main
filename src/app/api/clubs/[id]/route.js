import { Club } from "@/models/Club";
import { User } from "@/models/User";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { ApiError } from "@/utils/server/ApiError";
import { requireAdmin } from "@/utils/server/roleGuards";

// PATCH /api/clubs/:id -- rename/edit
export const PATCH = asyncHandler(async (req, context) => {
  await requireAdmin();
  const { id } = await context.params;
  const body = await req.json();

  const club = await Club.findById(id);
  if (!club) throw new ApiError(404, "Club not found");

  if (body.name !== undefined) {
    const name = body.name.toString().trim();
    if (!name) throw new ApiError(400, "Club name is required");
    const duplicate = await Club.findOne({ name, _id: { $ne: id } });
    if (duplicate) throw new ApiError(409, "A club with this name already exists");

    // User.club stores the club's name as free text -- keep existing users
    // pointed at the renamed club instead of orphaning them.
    if (name !== club.name) {
      await User.updateMany({ club: club.name }, { $set: { club: name } });
    }
    club.name = name;
  }
  if (body.city !== undefined) club.city = body.city.toString().trim() || undefined;
  if (body.state !== undefined) club.state = body.state.toString().trim() || undefined;

  await club.save();
  return Response.json(new ApiResponse(200, club, "Club updated"));
});

// DELETE /api/clubs/:id -- blocked if any user currently has this club set
export const DELETE = asyncHandler(async (_req, context) => {
  await requireAdmin();
  const { id } = await context.params;

  const club = await Club.findById(id);
  if (!club) throw new ApiError(404, "Club not found");

  const inUse = await User.countDocuments({ club: club.name });
  if (inUse > 0) {
    throw new ApiError(409, `Club is assigned to ${inUse} user(s) and can't be deleted`);
  }

  await club.deleteOne();
  return Response.json(new ApiResponse(200, null, "Club deleted"));
});
