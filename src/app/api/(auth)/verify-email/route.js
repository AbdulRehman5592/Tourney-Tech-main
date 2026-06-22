import { User } from "@/models/User";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { asyncHandler } from "@/utils/server/asyncHandler";

export const GET = asyncHandler(async (req) => {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  const user = await User.findOne({ verificationToken: token });
  if (!user) {
    return Response.json(
      new ApiResponse(400, null, "Invalid or expired token")
    );
  }

  user.isVerified = true;
  user.verificationToken = undefined;

  await user.save();

  return Response.json(
    new ApiResponse(
      200,
      null,
      "Email verified successfully. You can now log in."
    )
  );
});
