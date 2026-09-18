import { connectDB } from "@/lib/mongoose";
import { Registration } from "@/models/Registration";
import { ApiError } from "@/utils/server/ApiError";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { requireAdmin } from "@/utils/server/roleGuards";
import mongoose from "mongoose";

// Admin resolves a pending refund request for ONE game entry -- marks it
// processed (money sent back outside the app, e.g. cash or bank transfer)
// or denied. Only moves an entry that's actually cancelled/removed and
// awaiting a decision; every other entry on the registration is untouched.
export const PATCH = asyncHandler(async (req, { params }) => {
  await connectDB();
  await requireAdmin();

  const { id, entryId } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid registration ID");
  }

  const { refundStatus, refundNote } = await req.json();
  if (!["processed", "denied"].includes(refundStatus)) {
    throw new ApiError(400, "refundStatus must be 'processed' or 'denied'");
  }

  const registration = await Registration.findById(id);
  if (!registration) throw new ApiError(404, "Registration not found");

  const entry = registration.gameEntries.id(entryId);
  if (!entry) throw new ApiError(404, "Game entry not found");
  if (!entry.removed && !entry.cancelled) {
    throw new ApiError(400, "This game entry hasn't been dropped");
  }
  if (entry.refundStatus !== "requested") {
    throw new ApiError(400, `This refund is already marked "${entry.refundStatus}"`);
  }

  entry.refundStatus = refundStatus;
  if (refundNote !== undefined) entry.refundNote = refundNote?.toString().trim();
  await registration.save();

  return Response.json(
    new ApiResponse(200, registration, `Refund marked as ${refundStatus}`)
  );
});
