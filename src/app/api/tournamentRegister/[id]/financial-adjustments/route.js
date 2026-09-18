import { connectDB } from "@/lib/mongoose";
import { Registration } from "@/models/Registration";
import { ApiError } from "@/utils/server/ApiError";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { requireAdmin } from "@/utils/server/roleGuards";
import mongoose from "mongoose";

// Admin-only manual accounting correction -- a free-form log entry (e.g. a
// cash adjustment, a fee waiver) not tied to a game move. Stays a log, not a
// payment ledger, same as the existing "game_move" adjustments: it never
// touches any gameEntry's `paid`, and collecting/refunding the amount is a
// manual step outside the app.
export const POST = asyncHandler(async (req, context) => {
  await connectDB();
  const admin = await requireAdmin();

  const { id } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid registration ID");
  }

  const { amount, reason, gameConfigId } = await req.json();

  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount === 0) {
    throw new ApiError(400, "amount must be a non-zero number");
  }
  if (!reason || !reason.toString().trim()) {
    throw new ApiError(400, "A reason is required for a manual adjustment");
  }
  if (gameConfigId && !mongoose.Types.ObjectId.isValid(gameConfigId)) {
    throw new ApiError(400, "Invalid gameConfigId");
  }

  const registration = await Registration.findById(id);
  if (!registration) throw new ApiError(404, "Registration not found");

  registration.financialAdjustments.push({
    type: "manual",
    gameConfigId: gameConfigId || undefined,
    amount: numericAmount,
    reason: reason.toString().trim(),
    createdBy: admin._id,
  });
  await registration.save();

  return Response.json(
    new ApiResponse(201, registration, "Adjustment recorded")
  );
});
