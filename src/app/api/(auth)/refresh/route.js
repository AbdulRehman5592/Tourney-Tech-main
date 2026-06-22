// src\app\api\auth\refresh\route.js

import { connectDB } from "@/lib/mongoose";
import { User } from "@/models/User";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { ApiError } from "@/utils/server/ApiError";
import { asyncHandler } from "@/utils/server/asyncHandler";
import {
  verifyRefreshToken,
  generateAccessToken,
  generateRefreshToken,
  setAuthCookies,
} from "@/utils/server/tokens";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const POST = asyncHandler(async () => {
  await connectDB();

  // ✅ Get refreshToken from cookies
  const cookieStore = await cookies();
  const incomingRefreshToken = cookieStore.get("refreshToken")?.value;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Refresh token is missing.");
  }

  // ✅ Verify refreshToken
  const decoded = verifyRefreshToken(incomingRefreshToken);
  if (!decoded) {
    throw new ApiError(401, "Invalid or expired refresh token.");
  }

  // ✅ Find user
  const user = await User.findById(decoded._id);
  if (!user || user.refreshToken !== incomingRefreshToken) {
    throw new ApiError(401, "Refresh token mismatch.");
  }

  // ✅ Generate new tokens
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  // ✅ Save new refreshToken to DB
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  const res = NextResponse.json(
    new ApiResponse(200, { accessToken }, "Access token refreshed")
  );

  // ✅ Set new cookies
  return setAuthCookies(res, accessToken, refreshToken);
});
