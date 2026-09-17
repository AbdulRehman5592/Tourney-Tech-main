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

  const resolvedPaymentDetails = buildPaymentDetails(
    paymentMethod,
    paymentDetails,
    requireReceipt
  );

  const makeEntry = (slot) => ({
    game: slot.game,
    gameConfigId: slot._id,
    status: "pending",
    paid: false,
    paymentMethod: paymentMethod || "cash",
    paymentDetails: resolvedPaymentDetails,
  });

  const existingRegistration = await Registration.findOne({
    tournament: tournamentId,
    user: userId,
  });

  if (existingRegistration?.cancelled) {
    // A previously-cancelled registration is a clean slate, not something to
    // merge game entries into -- re-registering starts fresh with just the
    // newly-requested games, and clears the old cancellation state.
    existingRegistration.gameEntries = resolvedSlots.map(makeEntry);
    existingRegistration.cancelled = false;
    existingRegistration.cancelledAt = null;
    await existingRegistration.save();

    return { registration: existingRegistration, created: false };
  }

  if (existingRegistration) {
    const activeEntries = existingRegistration.gameEntries.filter(
      (e) => !e.removed && !e.cancelled
    );
    const existingConfigIds = activeEntries.map((e) => e.gameConfigId.toString());
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

    // Add only the genuinely new games as fresh pending entries -- every
    // existing entry's status/paid/team is left completely untouched, so
    // registering for game 2 never disturbs an already-approved game 1.
    // A game the player previously dropped (removed/cancelled entry) is
    // reactivated in place rather than duplicated.
    for (const slot of resolvedSlots) {
      const configIdStr = slot._id.toString();
      if (existingConfigIds.includes(configIdStr)) continue;

      const droppedEntry = existingRegistration.gameEntries.find(
        (e) =>
          e.gameConfigId.toString() === configIdStr && (e.removed || e.cancelled)
      );

      if (droppedEntry) {
        droppedEntry.status = "pending";
        droppedEntry.paid = false;
        droppedEntry.paymentMethod = paymentMethod || "cash";
        droppedEntry.paymentDetails = resolvedPaymentDetails;
        droppedEntry.removed = false;
        droppedEntry.removedAt = null;
        droppedEntry.removedReason = "";
        droppedEntry.cancelled = false;
        droppedEntry.cancelledAt = null;
        droppedEntry.refundStatus = "not_applicable";
        droppedEntry.team = null;
      } else {
        existingRegistration.gameEntries.push(makeEntry(slot));
      }
    }

    existingRegistration.cancelled = false;
    existingRegistration.cancelledAt = null;
    await existingRegistration.save();

    return { registration: existingRegistration, created: false };
  }

  const registration = new Registration({
    tournament: new mongoose.Types.ObjectId(tournamentId),
    user: new mongoose.Types.ObjectId(userId),
    gameEntries: resolvedSlots.map(makeEntry),
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
