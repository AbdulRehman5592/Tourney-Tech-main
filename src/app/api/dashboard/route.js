import { Tournament } from "@/models/Tournament";
import { User } from "@/models/User";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { asyncHandler } from "@/utils/server/asyncHandler";
// import { requireAuth } from "@/utils/server/auth";
import { requireAdmin } from "@/utils/server/roleGuards";

export const GET = asyncHandler(async () => {
  await requireAdmin();

  const totalUsers = await User.countDocuments();
  const totalTournaments = await Tournament.countDocuments();
  const ongoingTournament = await Tournament.countDocuments({
    status: "ongoing",
  });
  const newSignUpUsers = await User.countDocuments({
    createdAt: {
      $gte: new Date(new Date().setDate(new Date().getDate() - 7)),
    },
  });
  const upcomingTournaments = await Tournament.countDocuments({
    status: "upcoming",
  });

  const completedTournament = await Tournament.countDocuments({
    status: "completed",
  });

  return Response.json(
    new ApiResponse(
      200,
      {
        totalUsers,
        totalTournaments,
        ongoingTournament,
        newSignUpUsers,
        upcomingTournaments,
        completedTournament,
      },
      "Dashboard data fetched successfully"
    )
  );
});
