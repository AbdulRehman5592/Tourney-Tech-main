import { connectDB } from "@/lib/mongoose";
import { User } from "@/models/User";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { ApiError } from "@/utils/server/ApiError";
import { asyncHandler } from "@/utils/server/asyncHandler";
import sendEmail from "@/constants/EmailProvider";

export const POST = asyncHandler(async (req) => {
  await connectDB();
  const { email } = await req.json();

  if (!email) throw new ApiError(400, "Email is required");

  const user = await User.findOne({ email });
  if (!user) throw new ApiError(404, "User not found");

  // Generate OTP
  const otp = Math.floor(100000 + Math.random() * 900000);
  const otpExpiry = Date.now() + 10 * 60 * 1000; // 10 min

  // Save OTP in DB
  user.otp = otp;
  user.otpExpiry = otpExpiry;
  await user.save();

  // Send Email
  const emailContent = {
    from: `"Tourney Tech" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Password Reset OTP - Tourney Tech",
    html: `
      <h2>Hi ${user.firstname || "User"}!</h2>
      <p>Your password reset OTP is:</p>
      <h1 style="letter-spacing:4px;">${otp}</h1>
      <p>This code will expire in 10 minutes.</p>
    `,
  };

  await sendEmail(emailContent);

  return Response.json(
    new ApiResponse(200, null, "OTP sent successfully to your email")
  );
});
