// import { connectDB } from "@/lib/mongoose";
import { User } from "@/models/User";
import { Tournament } from "@/models/Tournament";
import { Registration } from "@/models/Registration";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { ApiError } from "@/utils/server/ApiError";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { requireAuth } from "@/utils/server/auth";

const SELECT_FIELDS = "-password -refreshToken -accessToken -__v";

// A Full Admin sees everyone, unchanged. A promoted tournament director
// (User.canCreateTournaments) only sees users who registered for a
// tournament they're staff on, or users they personally added themselves --
// not the full directory, for privacy and to stop unsolicited registrations.
// Every existing caller of this endpoint (Manage Users, Register Player, the
// tournament staff picker, team-member pickers) gets scoped automatically
// with no client-side changes, since the server decides what "everyone"
// means per caller.
export const GET = asyncHandler(async () => {
  const userInfo = await requireAuth();

  if (userInfo.role === "admin") {
    const users = await User.find().select(SELECT_FIELDS).sort({ createdAt: -1 });
    return Response.json(new ApiResponse(200, users, "Fetched all users"));
  }

  if (!userInfo.canCreateTournaments) {
    throw new ApiError(403, "Access denied: insufficient permissions");
  }

  const staffTournaments = await Tournament.find(
    { "staff.user": userInfo._id },
    { _id: 1 }
  ).lean();
  const staffTournamentIds = staffTournaments.map((t) => t._id);

  const registrations = await Registration.find(
    { tournament: { $in: staffTournamentIds } },
    { user: 1 }
  ).lean();

  const createdUsers = await User.find(
    { createdBy: userInfo._id },
    { _id: 1 }
  ).lean();

  const visibleIds = [
    ...new Set(
      [
        ...registrations.map((r) => r.user?.toString()),
        ...createdUsers.map((u) => u._id.toString()),
      ].filter(Boolean)
    ),
  ];

  const users = await User.find({ _id: { $in: visibleIds } })
    .select(SELECT_FIELDS)
    .sort({ createdAt: -1 });

  return Response.json(new ApiResponse(200, users, "Fetched visible users"));
});
