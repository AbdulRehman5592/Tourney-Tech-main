import { asyncHandler } from "@/utils/server/asyncHandler";
import { requireAdmin } from "@/utils/server/roleGuards";
import { parseForm } from "@/utils/server/parseForm";
import { User } from "@/models/User";
import { Registration } from "@/models/Registration";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { ApiError } from "@/utils/server/ApiError";
import bcrypt from "bcrypt";

export const PATCH = asyncHandler(async (req, context) => {
  await requireAdmin();

  const { fields } = await parseForm(req);

  const { id } = await context.params;
  if (!id) throw new ApiError(400, "ID parameter is missing");
  
  const userExist = await User.findById(id);

  if (!userExist) {
    throw new ApiError(404, "user not exist");
  }

  if (fields.password) {
    const salt = await bcrypt.genSalt(10);
    fields.password = await bcrypt.hash(fields.password, salt);
  }

  const response = await User.findByIdAndUpdate(
    id,
    { ...fields },
    { new: true }
  );

  return Response.json(
    new ApiResponse(200, { user: response }, "User updated successfully")
  );
});

export const DELETE = asyncHandler(async (_, context) => {
  await requireAdmin();

  const { id } = await context?.params;

  if (!id) throw new ApiError(400, "ID parameter is missing");

  const response = await User.findByIdAndDelete(id);

  if (!response) throw new ApiError(404, "User not found");

  // Mirror the tournament-delete cascade so a removed user doesn't leave
  // dangling Registration docs (user ref pointing at nothing) behind.
  await Registration.deleteMany({ user: id });

  return Response.json(
    new ApiResponse(200, { user: response }, "User Deleted Successfully")
  );
});
