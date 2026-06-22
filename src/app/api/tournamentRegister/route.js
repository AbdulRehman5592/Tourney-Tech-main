// import { Registration, GameRegistrationSchema } from "@/models/Registration.js";
import { Registration } from "@/models/Registration.js";
import { Tournament } from "@/models/Tournament.js";
// import { Team } from "@/models/Team.js";
import { ApiError } from "@/utils/server/ApiError";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { parseForm } from "@/utils/server/parseForm";
import { requireAuth } from "@/utils/server/auth";
import mongoose from "mongoose";
import "@/models/BankDetails";
import "@/models/Game";

export const POST = asyncHandler(async (req) => {
  const { fields } = await parseForm(req);
  const user = await requireAuth();

  const tournamentId = fields.tournamentId?.toString();
  const userId = user?._id;
  const gameIds = Array.isArray(fields.gameIds)
    ? fields.gameIds
    : fields.gameIds
      ? [fields.gameIds]
      : [];
  const paymentMethod = fields.paymentMethod?.toString();
  const paymentDetails =
    typeof fields.paymentDetails === "string"
      ? JSON.parse(fields.paymentDetails)
      : fields.paymentDetails;

  if (!tournamentId || !userId) {
    throw new ApiError(400, "Tournament ID and User ID are required.");
  }

  if (!gameIds.length) {
    throw new ApiError(400, "At least one Game ID is required.");
  }

  if (
    !mongoose.isValidObjectId(tournamentId) ||
    !mongoose.isValidObjectId(userId)
  ) {
    throw new ApiError(400, "Invalid Tournament ID or User ID.");
  }

  const validGameIds = gameIds.map((gameId) => {
    if (!gameId || !mongoose.isValidObjectId(gameId)) {
      throw new ApiError(400, `Game ID ${gameId} is invalid.`);
    }
    return new mongoose.Types.ObjectId(gameId);
  });

  const tournament = await Tournament.findById(tournamentId);
  if (!tournament) {
    throw new ApiError(404, "Tournament not found.");
  }

  const existingRegistration = await Registration.findOne({
    tournament: tournamentId,
    user: userId,
    "gameRegistrationDetails.games": { $all: validGameIds },
  });
  if (existingRegistration) {
    await Registration.findByIdAndUpdate(
      existingRegistration._id,
      {
        gameRegistrationDetails: {
          games: validGameIds,
          status: "pending",
          paid: false,
          paymentMethod: paymentMethod || "cash",
          paymentDetails: paymentMethod === "online" ? paymentDetails : null,
        },
      },
      { new: true }
    );

    return Response.json(
      new ApiResponse(200, null, "Registration updated successfully.")
    );
  }

  const gameRegistrationDetails = {
    games: validGameIds,
    status: "pending",
    paid: false,
    paymentMethod: paymentMethod || "cash",
  };

  if (paymentMethod === "online") {
    if (
      !paymentDetails ||
      !paymentDetails.bankId ||
      !paymentDetails.accountName ||
      !paymentDetails.transactionId ||
      !mongoose.isValidObjectId(paymentDetails.bankId)
    ) {
      throw new ApiError(
        400,
        "Bank ID, Account Name, and Transaction ID are required for online payments, and Bank ID must be valid."
      );
    }
    gameRegistrationDetails.paymentDetails = {
      bankId: new mongoose.Types.ObjectId(paymentDetails.bankId),
      accountName: paymentDetails.accountName,
      transactionId: paymentDetails.transactionId,
    };
  } else {
    gameRegistrationDetails.paymentDetails = null;
  }

  const registration = new Registration({
    tournament: new mongoose.Types.ObjectId(tournamentId),
    user: new mongoose.Types.ObjectId(userId),
    gameRegistrationDetails,
  });

  try {
    await registration.validate();
  } catch (validationError) {
    console.error(
      "Validation error:",
      JSON.stringify(validationError, null, 2)
    );
    throw new ApiError(400, `Validation failed: ${validationError.message}`);
  }

  await registration.save();

  return Response.json(
    new ApiResponse(
      201,
      registration,
      "Tournament registration created successfully"
    )
  );
});

export const GET = asyncHandler(async () => {
  const registrations = await Registration.find()
    .populate("tournament")
    .populate("user", "username email")
    .populate({
      path: "gameRegistrationDetails.games",
      model: "Game",
    })
    .populate({
      path: "gameRegistrationDetails.team",
      model: "Teams",
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
