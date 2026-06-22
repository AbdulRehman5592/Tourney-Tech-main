import { connectDB } from "@/lib/mongoose";
import { User } from "@/models/User";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { ApiError } from "@/utils/server/ApiError";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { NextResponse } from "next/server";

export const POST = asyncHandler(async (req) => {
  await connectDB();
  const body = await req.json();
  const { email, otp } = body;

  if (!email || !otp) throw new ApiError(400, "Email and OTP are required");

  const user = await User.findOne({ email });
  if (!user) throw new ApiError(404, "User not found");

  if (user.isVerified)
    return NextResponse.json(
      new ApiResponse(200, null, "Email already verified")
    );

  // Check OTP validity
  if (user.otp !== Number(otp)) throw new ApiError(400, "Invalid OTP");

  if (user.otpExpiry < Date.now()) throw new ApiError(400, "OTP expired");

  // Mark verified and clear otp
  user.isVerified = true;
  user.otp = undefined;
  user.otpExpiry = undefined;
  await user.save();

  return NextResponse.json(
    new ApiResponse(200, null, "Email verified successfully!")
  );
});
