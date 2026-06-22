import { User } from "@/models/User";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { parseForm } from "@/utils/server/parseForm";

import { asyncHandler } from "@/utils/server/asyncHandler";
import { requireAdmin } from "@/utils/server/roleGuards";

export const POST = asyncHandler(async (req) => {
  await requireAdmin();

  const { fields: body } = await parseForm(req);

  const {
    firstname,
    lastname,
    email,
    phone,
    gender,
    city,
    stateCode,
    dob,
    role,
    password,
    club,
    subCity,
  } = body;

  let { username } = body;

  if (!password) throw new ApiResponse(500, null, "Password is Required");

  if (!username) {
    username = firstname + " " + lastname;
  }

  const user = new User({
    firstname,
    lastname,
    email,
    username,
    phone,
    gender,
    city,
    stateCode,
    dob,
    role,
    password,
    subCity,
    club,
    isVerified: true,
  });

  await user.save();

  return Response.json(new ApiResponse(201, user, "User created successfully"));
});
