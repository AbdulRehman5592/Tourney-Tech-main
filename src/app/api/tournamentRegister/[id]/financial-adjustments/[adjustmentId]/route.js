import { connectDB } from "@/lib/mongoose";
import { Registration } from "@/models/Registration";
import { ApiError } from "@/utils/server/ApiError";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { requireAdmin } from "@/utils/server/roleGuards";
import mongoose from "mongoose";

// Edit a manual adjustment's amount/reason. Only "manual" entries are
// editable here -- a "game_move" adjustment is a byproduct of an actual move
// action, not a free-standing record, so it isn't touched by this route.
export const PATCH = asyncHandler(async (req, context) => {
  await connectDB();
  await requireAdmin();

  const { id, adjustmentId } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid registration ID");
  }

  const registration = await Registration.findById(id);
  if (!registration) throw new ApiError(404, "Registration not found");

  const adjustment = registration.financialAdjustments.id(adjustmentId);
  if (!adjustment) throw new ApiError(404, "Adjustment not found");
  if (adjustment.type !== "manual") {
    throw new ApiError(400, "Only manual adjustments can be edited here");
  }

  const { amount, reason } = await req.json();

  if (amount !== undefined) {
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount === 0) {
      throw new ApiError(400, "amount must be a non-zero number");
    }
    adjustment.amount = numericAmount;
  }
  if (reason !== undefined) {
    if (!reason || !reason.toString().trim()) {
      throw new ApiError(400, "A reason is required for a manual adjustment");
    }
    adjustment.reason = reason.toString().trim();
  }

  await registration.save();

  return Response.json(
    new ApiResponse(200, registration, "Adjustment updated")
  );
});

// Remove a manual adjustment entirely -- only "manual" entries can be
// deleted, so a "game_move" record (the audit trail for an actual move
// action) can never be erased through this route.
export const DELETE = asyncHandler(async (req, context) => {
  await connectDB();
  await requireAdmin();

  const { id, adjustmentId } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid registration ID");
  }

  const registration = await Registration.findById(id);
  if (!registration) throw new ApiError(404, "Registration not found");

  const adjustment = registration.financialAdjustments.id(adjustmentId);
  if (!adjustment) throw new ApiError(404, "Adjustment not found");
  if (adjustment.type !== "manual") {
    throw new ApiError(400, "Only manual adjustments can be deleted here");
  }

  adjustment.deleteOne();
  await registration.save();

  return Response.json(
    new ApiResponse(200, null, "Adjustment deleted")
  );
});
