import mongoose from "mongoose";
import { Registration } from "@/models/Registration.js";
import { Tournament } from "@/models/Tournament.js";
import { User } from "@/models/User.js";
import { ApiError } from "@/utils/server/ApiError";

// Shared "register this user for these games" logic, used by the self-serve
// POST /api/tournamentRegister route and by the admin register-player route
// (which can create the account first). Keeping it in one place means both
// entry points apply the same duplicate, payment and validation rules.
//
// Throws ApiError on bad input; returns { registration, created }.
export async function createOrUpdateRegistration({
  tournamentId,
  userId,
  gameIds,
  paymentMethod,
  paymentDetails,
}) {
  if (!tournamentId || !userId) {
    throw new ApiError(400, "Tournament ID and User ID are required.");
  }

  const normalizedGameIds = Array.isArray(gameIds)
    ? gameIds
    : gameIds
      ? [gameIds]
      : [];

  if (!normalizedGameIds.length) {
    throw new ApiError(400, "At least one Game ID is required.");
  }

  if (
    !mongoose.isValidObjectId(tournamentId) ||
    !mongoose.isValidObjectId(userId)
  ) {
    throw new ApiError(400, "Invalid Tournament ID or User ID.");
  }

  const validGameIds = normalizedGameIds.map((gameId) => {
    if (!gameId || !mongoose.isValidObjectId(gameId)) {
      throw new ApiError(400, `Game ID ${gameId} is invalid.`);
    }
    return new mongoose.Types.ObjectId(gameId);
  });

  const tournament = await Tournament.findById(tournamentId);
  if (!tournament) {
    throw new ApiError(404, "Tournament not found.");
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  const existingRegistration = await Registration.findOne({
    tournament: tournamentId,
    user: userId,
  });

  if (existingRegistration) {
    const existingGames = (
      existingRegistration.gameRegistrationDetails?.games || []
    ).map((game) => game.toString());
    const requestedGames = validGameIds.map((gameId) => gameId.toString());
    const allRequestedAlreadyRegistered = requestedGames.every((gameId) =>
      existingGames.includes(gameId)
    );

    if (allRequestedAlreadyRegistered) {
      throw new ApiError(
        409,
        "You have already registered for this game in this tournament."
      );
    }

    // Merge with previously registered games instead of overwriting them,
    // so registering for game 2 doesn't drop the earlier game 1 record.
    const mergedGameIds = [
      ...existingRegistration.gameRegistrationDetails.games,
      ...validGameIds.filter((gameId) => !existingGames.includes(gameId.toString())),
    ];

    const registration = await Registration.findByIdAndUpdate(
      existingRegistration._id,
      {
        gameRegistrationDetails: {
          games: mergedGameIds,
          status: "pending",
          paid: false,
          paymentMethod: paymentMethod || "cash",
          paymentDetails: paymentMethod === "online" ? paymentDetails : null,
        },
      },
      { new: true }
    );

    return { registration, created: false };
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
    console.error("Validation error:", JSON.stringify(validationError, null, 2));
    throw new ApiError(400, `Validation failed: ${validationError.message}`);
  }

  await registration.save();

  return { registration, created: true };
}
