import { User } from "@/models/User";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { ApiError } from "@/utils/server/ApiError";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { parseForm } from "@/utils/server/parseForm";

export const POST = asyncHandler(async (req) => {
  const { fields } = await parseForm(req);
  const { email, otp, newPassword } = fields;

  if (!email || !otp || !newPassword)
    throw new ApiError(400, "Email, OTP, and new password are required");

  const user = await User.findOne({ email });
  if (!user) throw new ApiError(404, "User not found");

  if (user.otp !== Number(otp)) throw new ApiError(400, "Invalid OTP");
  if (Date.now() > user.otpExpiry) throw new ApiError(400, "OTP expired");

  // ✅ Let pre-save hook hash password
  user.password = newPassword;
  user.otp = undefined;
  user.otpExpiry = undefined;
  user.isVerified = true;

  await user.save();

  return Response.json(
    new ApiResponse(200, null, "Password reset successfully")
  );
});
