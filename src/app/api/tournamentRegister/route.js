// import { Registration, GameRegistrationSchema } from "@/models/Registration.js";
import { connectDB } from "@/lib/mongoose.js";
import { Registration } from "@/models/Registration.js";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { parseForm } from "@/utils/server/parseForm";
import { requireAuth } from "@/utils/server/auth";
import { requireAdmin } from "@/utils/server/roleGuards";
import { createOrUpdateRegistration } from "@/utils/server/tournamentRegistration";
import "@/models/BankDetails";
import "@/models/Game";
import "@/models/Team";

export const POST = asyncHandler(async (req) => {
  await connectDB();
  const { fields } = await parseForm(req);
  const requester = await requireAuth();

  const tournamentId = fields.tournamentId?.toString();
  const requestedUserId = fields.userId?.toString();
  const userId = requestedUserId || requester?._id?.toString();
  const gameIds = fields.gameIds;
  const paymentMethod = fields.paymentMethod?.toString();
  const paymentDetails =
    typeof fields.paymentDetails === "string"
      ? JSON.parse(fields.paymentDetails)
      : fields.paymentDetails;

  if (requestedUserId && requestedUserId !== requester?._id?.toString()) {
    await requireAdmin();
  }

  const { registration, created } = await createOrUpdateRegistration({
    tournamentId,
    userId,
    gameIds,
    paymentMethod,
    paymentDetails,
  });

  if (!created) {
    return Response.json(
      new ApiResponse(200, null, "Registration updated successfully.")
    );
  }

  return Response.json(
    new ApiResponse(
      201,
      registration,
      "Tournament registration created successfully"
    )
  );
});

export const GET = asyncHandler(async () => {
  await connectDB();
  const registrations = await Registration.find()
    .populate("tournament")
    .populate("user", "username email")
    .populate({
      path: "gameRegistrationDetails.games",
      model: "Game",
    })
    .populate({
      path: "gameRegistrationDetails.team",
      model: "Team",
      strictPopulate: false,
    })
    .populate({
      path: "gameRegistrationDetails.paymentDetails.bankId",
      model: "BankDetails",
      strictPopulate: false,
    })
    .sort({ createdAt: -1 })
    .lean();

  return Response.json(
    new ApiResponse(200, registrations, "Registrations fetched successfully")
  );
});
