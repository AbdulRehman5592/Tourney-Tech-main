import { connectDB } from "@/lib/mongoose";
import { User } from "@/models/User";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { clearAuthCookies } from "@/utils/server/tokens";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { ApiError } from "@/utils/server/ApiError";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyRefreshToken } from "@/utils/server/tokens";

export const POST = asyncHandler(async () => {
  await connectDB();

  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("refreshToken")?.value;

  if (!refreshToken) {
    throw new ApiError(401, "Refresh token missing");
  }

  // ✅ Remove refreshToken from DB
  const decoded = verifyRefreshToken(refreshToken);
  if (decoded) {
    await User.findByIdAndUpdate(decoded._id, {
      $unset: { refreshToken: 1 },
    });
  }

  // ✅ Clear cookies
  await clearAuthCookies();

  // ✅ Return response
  return NextResponse.json(
    new ApiResponse(200, null, "Logged out successfully")
  );
});
