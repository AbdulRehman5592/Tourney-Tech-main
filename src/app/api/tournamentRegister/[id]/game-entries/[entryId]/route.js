import { connectDB } from "@/lib/mongoose";
import { Registration } from "@/models/Registration";
import { ApiError } from "@/utils/server/ApiError";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { parseForm } from "@/utils/server/parseForm";
import { requireAdmin } from "@/utils/server/roleGuards";

// Approve/reject (or just annotate) ONE game entry within a registration --
// every other game entry on the same registration is left untouched, unlike
// the old whole-registration status PATCH this replaces.
export const PATCH = asyncHandler(async (req, context) => {
  await connectDB();
  const admin = await requireAdmin();
  const { id, entryId } = await context.params;
  if (!id || !entryId) throw new ApiError(400, "ID parameters are missing");

  const { fields } = await parseForm(req);

  const status = fields.status?.toString();
  const adminNote = fields.adminNote?.toString();

  if (status !== undefined && !["pending", "approved", "rejected"].includes(status)) {
    return Response.json(new ApiResponse(400, null, "Invalid status value"), { status: 400 });
  }
  if (status === undefined && adminNote === undefined) {
    return Response.json(new ApiResponse(400, null, "Nothing to update"), { status: 400 });
  }

  const registration = await Registration.findById(id);
  if (!registration) {
    return Response.json(new ApiResponse(404, null, "Registration not found"), { status: 404 });
  }

  const entry = registration.gameEntries.id(entryId);
  if (!entry) {
    return Response.json(new ApiResponse(404, null, "Game entry not found"), { status: 404 });
  }

  if (status !== undefined) {
    entry.status = status;
    entry.paid = status === "approved";
    // Audit trail for "Paid in Full" -- who verified the payment and when,
    // captured automatically rather than as a separate admin step.
    entry.verifiedBy = status === "approved" ? admin._id : null;
    entry.verifiedAt = status === "approved" ? new Date() : null;
  }
  // Admin's private note (e.g. "paid Sarah cash at check-in") -- independent
  // of status so it can be jotted down without also having to touch the
  // approve/reject decision.
  if (adminNote !== undefined) {
    entry.adminNote = adminNote;
  }

  await registration.save();

  const updated = await Registration.findById(id)
    .populate("tournament")
    .populate("user", "username email")
    .populate("gameEntries.game")
    .populate("gameEntries.team")
    .populate("gameEntries.paymentDetails.bankId")
    .lean();

  return Response.json(
    new ApiResponse(200, updated, "Status updated successfully")
  );
});
