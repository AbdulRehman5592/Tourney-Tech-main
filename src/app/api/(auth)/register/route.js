import { User } from "@/models/User";
import { connectDB } from "@/lib/mongoose";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { ApiError } from "@/utils/server/ApiError";
import { asyncHandler } from "@/utils/server/asyncHandler";
// import crypto from "crypto";
import sendEmail from "@/constants/EmailProvider";
import { parseForm } from "@/utils/server/parseForm";

function sanitize(input) {
  if (typeof input !== "string") return "";
  return input.trim().replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export const POST = asyncHandler(async (req) => {
  await connectDB();
  const { fields } = await parseForm(req);

  // Email verification temporarily disabled
  // const otp = Math.floor(100000 + Math.random() * 900000);
  // const otpExpiry = Date.now() + 10 * 60 * 1000;

  const {
    firstname,
    lastname,
    email,
    username,
    password,
    city,
    stateCode,
    dob,
    phone,
    gender,
    avatar,
    club,
    subCity,
  } = fields;

  const clean = {
    firstname: sanitize(firstname),
    lastname: sanitize(lastname),
    email: sanitize(email),
    username: sanitize(username),
    password: sanitize(password),
    city: sanitize(city),
    stateCode: sanitize(stateCode),
    dob: sanitize(dob),
    phone: sanitize(phone),
    gender: sanitize(gender),
    avatar: sanitize(avatar),
    club: sanitize(club),
    subCity: sanitize(subCity),
  };

  // ✅ Required field validation
  const requiredFields = [
    "firstname",
    "lastname",
    "email",
    "password",
    "city",
    "stateCode",
    "dob",
    "phone",
    "gender",
  ];
  const missing = requiredFields.filter((key) => !clean[key]);

  if (missing.length > 0) {
    throw new ApiError(400, `Missing required fields: ${missing.join(", ")}`);
  }

  // ✅ Check for existing user
  const existingUser = await User.findOne({
    $or: [{ email: clean.email }, { username: clean.username }],
  }).select("-refreshToken -password");

  if (existingUser) {
    throw new ApiError(409, "Email or username already in use");
  }

  // ✅ Create user
  const user = new User({
    firstname: clean.firstname,
    lastname: clean.lastname,
    email: clean.email,
    username:
      clean.username.toLowerCase() || `${clean?.firstname} ${clean?.lastname}`,
    password: clean.password,
    city: clean.city,
    stateCode: clean.stateCode,
    dob: clean.dob,
    phone: clean.phone,
    gender: clean.gender,
    avatar: clean.avatar || undefined,
    club: clean.club,
    subCity: clean.subCity,
    isVerified: true, // Auto-verify since email verification is disabled
    // otp, // Email verification temporarily disabled
    // otpExpiry, // Email verification temporarily disabled
  });

  await user.save();

  // Email verification temporarily disabled
  // const emailContent = {
  //   from: `"Tourney Tech" <${process.env.EMAIL_USER}>`,
  //   to: email,
  //   subject: "Your Email Verification OTP",
  //   html: `
  //     <h2>Hello ${firstname}!</h2>
  //     <p>Your OTP for verification is:</p>
  //     <h1 style="letter-spacing:4px;">${otp}</h1>
  //     <p>This code will expire in 10 minutes.</p>
  //   `,
  // };

  // await sendEmail(emailContent);

  return Response.json(
    new ApiResponse(201, null, "Registration Successful! (Email verification disabled)")
  );

  // return setAuthCookies(res, accessToken, refreshToken);
});
