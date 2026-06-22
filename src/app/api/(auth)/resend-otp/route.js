import { User } from "@/models/User";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { ApiError } from "@/utils/server/ApiError";
import { asyncHandler } from "@/utils/server/asyncHandler";
import sendEmail from "@/constants/EmailProvider";
import { parseForm } from "@/utils/server/parseForm";

function sanitize(input) {
  if (typeof input !== "string") return "";
  return input.trim().replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export const POST = asyncHandler(async (req) => {
  const { fields } = await parseForm(req);
  const email = sanitize(fields?.email);

  if (!email) {
    throw new ApiError(400, "Email is required to resend OTP");
  }

  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(404, "User not found with this email");
  }

  const otp = Math.floor(100000 + Math.random() * 900000);
  const otpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes

  user.otp = otp;
  user.otpExpiry = otpExpiry;
  await user.save();

  const emailContent = {
    from: `"Tourney Tech" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Resend: Your Email Verification OTP",
    html: `
      <h2>Hello ${user.firstname}!</h2>
      <p>Your new OTP for verification is:</p>
      <h1 style="letter-spacing:4px;">${otp}</h1>
      <p>This code will expire in 10 minutes.</p>
    `,
  };

  await sendEmail(emailContent);

  return Response.json(
    new ApiResponse(200, null, "New OTP sent successfully!")
  );
});
