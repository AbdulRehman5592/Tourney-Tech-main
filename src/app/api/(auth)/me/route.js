import { connectDB } from "@/lib/mongoose";
import { User } from "@/models/User";
import { requireAuth } from "@/utils/server/auth";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { ApiError } from "@/utils/server/ApiError";
import { resolveRegionCodeAsync } from "@/utils/server/regionLookup";
import bcrypt from "bcrypt";

export const GET = asyncHandler(async () => {
  await connectDB();

  // 🔐 Check for access token & get user info
  const authUser = await requireAuth(); // { _id, email, username }

  const user = await User.findById(authUser._id).select(
    "-password -refreshToken"
  );

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return Response.json(
    new ApiResponse(200, { user }, "Current user fetched successfully")
  );
});

// Fields a user is allowed to edit on their own profile -- deliberately
// excludes role/accountStatus/isVerified/etc so self-service edits can't
// escalate privileges or reinstate a suspended account.
const SELF_EDITABLE_FIELDS = [
  "firstname",
  "lastname",
  "username",
  "email",
  "phone",
  "gender",
  "dob",
  "city",
  "stateCode",
  "club",
];

export const PATCH = asyncHandler(async (req) => {
  await connectDB();
  const authUser = await requireAuth();
  const body = await req.json();

  const updates = {};
  for (const field of SELF_EDITABLE_FIELDS) {
    if (field in body && body[field] !== undefined) {
      updates[field] = typeof body[field] === "string" ? body[field].trim() : body[field];
    }
  }

  // Region is stored as a 2-digit code but the profile form (like signup)
  // lets the user pick it by name -- resolve the same way registration does.
  if ("region" in body) {
    updates.region = await resolveRegionCodeAsync(body.region);
  }

  if (updates.email || updates.username) {
    const dupConditions = [];
    if (updates.email) dupConditions.push({ email: updates.email.toLowerCase() });
    if (updates.username) dupConditions.push({ username: updates.username.toLowerCase() });
    const existing = await User.findOne({
      _id: { $ne: authUser._id },
      $or: dupConditions,
    });
    if (existing) throw new ApiError(409, "Email or username already in use");
  }

  if (body.password) {
    const salt = await bcrypt.genSalt(10);
    updates.password = await bcrypt.hash(body.password, salt);
  }

  const updated = await User.findByIdAndUpdate(authUser._id, updates, {
    new: true,
  }).select("-password -refreshToken");

  if (!updated) {
    throw new ApiError(404, "User not found");
  }

  return Response.json(
    new ApiResponse(200, { user: updated }, "Profile updated successfully")
  );
});
