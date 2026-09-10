import { connectDB } from "@/lib/mongoose";
import { Registration } from "@/models/Registration";
import { ApiError } from "@/utils/server/ApiError";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { parseForm } from "@/utils/server/parseForm";
import { requireAdmin } from "@/utils/server/roleGuards";


export const PATCH = asyncHandler(async (req, context) => {
  await connectDB();
  const admin = await requireAdmin();
  const { id } = await context.params;
  if (!id) throw new ApiError(400, "ID parameter is missing");

  const { fields } = await parseForm(req);

  const status = fields.status?.toString();
  const adminNote = fields.adminNote?.toString();

  if (status !== undefined && !["pending", "approved", "rejected"].includes(status)) {
    return Response.json(new ApiResponse(400, null, "Invalid status value"), { status: 400 });
  }
  if (status === undefined && adminNote === undefined) {
    return Response.json(new ApiResponse(400, null, "Nothing to update"), { status: 400 });
  }

  const update = {};
  if (status !== undefined) {
    update["gameRegistrationDetails.status"] = status;
    update["gameRegistrationDetails.paid"] = status === "approved";
    // Audit trail for "Paid in Full" -- who verified the payment and when,
    // captured automatically rather than as a separate admin step.
    update.verifiedBy = status === "approved" ? admin._id : null;
    update.verifiedAt = status === "approved" ? new Date() : null;
  }
  // Admin's private note (e.g. "paid Sarah cash at check-in") -- independent
  // of status so it can be jotted down without also having to touch the
  // approve/reject decision.
  if (adminNote !== undefined) {
    update["gameRegistrationDetails.adminNote"] = adminNote;
  }

  const registration = await Registration.findByIdAndUpdate(id, update, {
    new: true,
  })
    .populate("tournament")
    .populate("user", "username email")
    .populate("gameRegistrationDetails.games")
    .populate("gameRegistrationDetails.team")
    .populate("gameRegistrationDetails.paymentDetails.bankId")
    .lean();

  if (!registration) {
    return Response.json(new ApiResponse(404, null, "Registration not found"), { status: 404 });
  }

  return Response.json(
    new ApiResponse(200, registration, "Status updated successfully")
  );
});
