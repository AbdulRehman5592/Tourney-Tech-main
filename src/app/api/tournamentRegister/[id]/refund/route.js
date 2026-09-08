import { connectDB } from "@/lib/mongoose";
import { Registration } from "@/models/Registration";
import { ApiError } from "@/utils/server/ApiError";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { requireAdmin } from "@/utils/server/roleGuards";
import mongoose from "mongoose";

// Admin resolves a pending refund request -- marks it processed (money sent
// back outside the app, e.g. cash or bank transfer) or denied. Only moves a
// registration that's actually cancelled and awaiting a decision.
export const PATCH = asyncHandler(async (req, { params }) => {
  await connectDB();
  await requireAdmin();

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid registration ID");
  }

  const { refundStatus, refundNote } = await req.json();
  if (!["processed", "denied"].includes(refundStatus)) {
    throw new ApiError(400, "refundStatus must be 'processed' or 'denied'");
  }

  const registration = await Registration.findById(id);
  if (!registration) throw new ApiError(404, "Registration not found");
  if (!registration.cancelled) {
    throw new ApiError(400, "This registration hasn't been cancelled");
  }
  if (registration.refundStatus !== "requested") {
    throw new ApiError(400, `This refund is already marked "${registration.refundStatus}"`);
  }

  registration.refundStatus = refundStatus;
  if (refundNote !== undefined) registration.refundNote = refundNote?.toString().trim();
  await registration.save();

  return Response.json(
    new ApiResponse(200, registration, `Refund marked as ${refundStatus}`)
  );
});
