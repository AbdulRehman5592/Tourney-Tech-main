import mongoose from "mongoose";
import { Registration } from "@/models/Registration.js";
import { Tournament } from "@/models/Tournament.js";
import { User } from "@/models/User.js";
import { ApiError } from "@/utils/server/ApiError";

// Validates + normalizes the payment sub-document for either payment method.
// Online requires a receipt screenshot (receiptUrl) alongside the
// self-reported bank/transaction info, since none of it is otherwise
// verified -- the receipt is the one thing an admin can actually check
// against the bank statement. Cash just carries an optional player memo.
//
// `requireReceipt` is only turned on for the self-serve player flow -- an
// admin registering a walk-in player is vouching for the payment in person,
// so there's no screenshot to attach.
function buildPaymentDetails(paymentMethod, paymentDetails, requireReceipt) {
  if (paymentMethod === "online") {
    if (
      !paymentDetails ||
      !paymentDetails.bankId ||
      !paymentDetails.accountName ||
      !paymentDetails.transactionId ||
      (requireReceipt && !paymentDetails.receiptUrl) ||
      !mongoose.isValidObjectId(paymentDetails.bankId)
    ) {
      throw new ApiError(
        400,
        `Bank ID, Account Name, and Transaction ID${requireReceipt ? ", and a receipt screenshot," : ""} are required for online payments, and Bank ID must be valid.`
      );
    }
    return {
      bankId: new mongoose.Types.ObjectId(paymentDetails.bankId),
      accountName: paymentDetails.accountName,
      transactionId: paymentDetails.transactionId,
      note: paymentDetails.note || undefined,
      receiptUrl: paymentDetails.receiptUrl,
    };
  }

  return paymentDetails?.note ? { note: paymentDetails.note } : null;
}

// Shared "register this user for these games" logic, used by the self-serve
// POST /api/tournamentRegister route and by the admin register-player route
// (which can create the account first). Keeping it in one place means both
// entry points apply the same duplicate, payment and validation rules.
//
// `gameIds` here means "which specific scheduled slot(s)" -- i.e. each value
// must be a Tournament.games[]._id (gameConfigId), NOT the catalog Game id.
// The same catalog game can be scheduled more than once in a tournament as
// fully independent competitions (different time/entry fee/format), so the
// subdocument id is the only thing that actually identifies "which one".
//
// Throws ApiError on bad input; returns { registration, created }.
export async function createOrUpdateRegistration({
  tournamentId,
  userId,
  gameIds,
  paymentMethod,
  paymentDetails,
  requireReceipt = false,
}) {
  if (!tournamentId || !userId) {
    throw new ApiError(400, "Tournament ID and User ID are required.");
  }

  const normalizedGameConfigIds = Array.isArray(gameIds)
    ? gameIds
    : gameIds
      ? [gameIds]
      : [];

  if (!normalizedGameConfigIds.length) {
    throw new ApiError(400, "At least one Game ID is required.");
  }

  if (
    !mongoose.isValidObjectId(tournamentId) ||
    !mongoose.isValidObjectId(userId)
  ) {
    throw new ApiError(400, "Invalid Tournament ID or User ID.");
  }

  const tournament = await Tournament.findById(tournamentId);
  if (!tournament) {
    throw new ApiError(404, "Tournament not found.");
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  // Resolve + validate each requested slot against the tournament's actual
  // games[] -- each id must be a real scheduled instance, not just any
  // ObjectId (and definitely not a catalog Game id).
  const resolvedSlots = normalizedGameConfigIds.map((id) => {
    if (!id || !mongoose.isValidObjectId(id)) {
      throw new ApiError(400, `Game ID ${id} is invalid.`);
    }
    const slot = tournament.games.id(id);
    if (!slot) {
      throw new ApiError(404, `Game ${id} not found in this tournament.`);
    }
    return slot;
  });

  const validGameConfigIds = resolvedSlots.map((s) => s._id);
  const validCatalogGameIds = resolvedSlots.map((s) => s.game);

  const existingRegistration = await Registration.findOne({
    tournament: tournamentId,
    user: userId,
  });

  if (existingRegistration) {
    const existingConfigIds = (
      existingRegistration.gameRegistrationDetails?.gameConfigIds || []
    ).map((id) => id.toString());
    const requestedConfigIds = validGameConfigIds.map((id) => id.toString());
    const allRequestedAlreadyRegistered = requestedConfigIds.every((id) =>
      existingConfigIds.includes(id)
    );

    if (allRequestedAlreadyRegistered) {
      throw new ApiError(
        409,
        "You have already registered for this game in this tournament."
      );
    }

    // Merge with previously registered games instead of overwriting them,
    // so registering for game 2 doesn't drop the earlier game 1 record.
    const newConfigIds = validGameConfigIds.filter(
      (id) => !existingConfigIds.includes(id.toString())
    );
    const mergedConfigIds = [
      ...existingRegistration.gameRegistrationDetails.gameConfigIds,
      ...newConfigIds,
    ];
    const mergedCatalogIds = mergedConfigIds
      .map((configId) => tournament.games.id(configId)?.game)
      .filter(Boolean);

    const registration = await Registration.findByIdAndUpdate(
      existingRegistration._id,
      {
        gameRegistrationDetails: {
          games: mergedCatalogIds,
          gameConfigIds: mergedConfigIds,
          status: "pending",
          paid: false,
          paymentMethod: paymentMethod || "cash",
          paymentDetails: buildPaymentDetails(
            paymentMethod,
            paymentDetails,
            requireReceipt
          ),
        },
      },
      { new: true }
    );

    return { registration, created: false };
  }

  const gameRegistrationDetails = {
    games: validCatalogGameIds,
    gameConfigIds: validGameConfigIds,
    status: "pending",
    paid: false,
    paymentMethod: paymentMethod || "cash",
  };

  gameRegistrationDetails.paymentDetails = buildPaymentDetails(
    paymentMethod,
    paymentDetails,
    requireReceipt
  );

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
