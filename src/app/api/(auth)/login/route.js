// src\app\api\auth\login\route.js

import { connectDB } from "@/lib/mongoose";
import { User } from "@/models/User";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { ApiError } from "@/utils/server/ApiError";
import { asyncHandler } from "@/utils/server/asyncHandler";
import {
  setAuthCookies,
  generateAccessToken,
  generateRefreshToken,
} from "@/utils/server/tokens";

import { NextResponse } from "next/server";

/**
 * Basic string sanitization (trims and escapes input)
 */
function sanitize(input) {
  if (typeof input !== "string") return "";
  return input.trim().replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export const POST = asyncHandler(async (req) => {
  // ✅ Connect to DB
  try {
    await connectDB();
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
    throw new ApiError(500, "Database connection failed", err);
  }

  // ✅ Parse and sanitize request body
  let body;
  try {
    body = await req.json();
  } catch (err) {
    throw new ApiError(400, "Invalid JSON body", err);
  }

  const { email, username, password } = body;
  const clean = {
    email: sanitize(email),
    username: sanitize(username),
    password: sanitize(password),
  };

  if (!clean.password || (!clean.email && !clean.username)) {
    throw new ApiError(400, "Email or username and password are required");
  }

  // ✅ Find user by email or username
  const user = await User.findOne({
    $or: [{ email: clean.email }, { username: clean.username }],
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // ✅ Check password
  const isPasswordValid = await user.isPasswordCorrect(clean.password);
  
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid credentials");
  }

  // ✅ Generate tokens
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  console.log("refresh Token:------------------", refreshToken);

  // ✅ Save refreshToken in DB
  user.refreshToken = refreshToken;

  if (!user?.isVerified) {
    throw new ApiError(401, "User is not verified");
  }

  await user.save({ validateBeforeSave: false });

  // ✅ Return sanitized user
  const safeUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const res = NextResponse.json(
    new ApiResponse(
      201,
      {
        user: safeUser,
      },
      "User logged in successfully"
    )
  );

  // ✅ Set cookies before returning response
  return setAuthCookies(res, accessToken, refreshToken);
});
