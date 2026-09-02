// /api/admin/doubles/[id]/approve-payment
//
// Admin confirms (or reverts) that a doubles pair's cost has been paid --
// mirrors the existing tournamentRegister approval pattern, but scoped to a
// single TeamUp pair's payment sub-document.

import { TeamUp } from "@/models/TeamUp";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { requireAdmin } from "@/utils/server/roleGuards";
import { parseForm } from "@/utils/server/parseForm";

export const PATCH = asyncHandler(async (req, context) => {
  const admin = await requireAdmin();
  const { id } = await context.params;
  const { fields } = await parseForm(req);

  const approved = fields.approved === "true" || fields.approved === true;

  const request = await TeamUp.findById(id);
  if (!request) {
    throw new ApiResponse(404, null, "Team-up request not found");
  }
  if (request.status !== "accepted") {
    throw new ApiResponse(400, null, "Only an accepted pair can have its payment approved");
  }
  if (request.mode === "team") {
    throw new ApiResponse(400, null, "Payment does not apply to Team Up requests");
  }

  request.payment.approved = approved;
  request.payment.approvedBy = approved ? admin._id : undefined;
  request.payment.approvedAt = approved ? new Date() : undefined;
  // Admin recording a cash payment directly (player may not have used the
  // self-service submission endpoint).
  if (approved) request.payment.paid = true;

  await request.save();

  return Response.json(new ApiResponse(200, { request }, "Payment approval updated"));
});
