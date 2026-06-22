import { asyncHandler } from "@/utils/server/asyncHandler";
import { requireAdmin } from "@/utils/server/roleGuards";
import { parseForm } from "@/utils/server/parseForm";
import { User } from "@/models/User";
import { ApiResponse } from "@/utils/server/ApiResponse";
import bcrypt from "bcrypt";

export const PATCH = asyncHandler(async (req, context) => {
  await requireAdmin();

  const { fields } = await parseForm(req);

  const { id } = context.params;
  if (!id) throw new ApiError(400, "ID parameter is missing");
  
  const userExist = await User.findById(id);

  if (!userExist) {
    throw new ApiResponse(404, null, "user not exist");
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

  return Response.json(
    new ApiResponse(200, { user: response }, "User Deleted Successfully")
  );
});
