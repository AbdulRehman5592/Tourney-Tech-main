// /api/teamup/[id]/payment
//
// The requestor (`from`) of an accepted doubles/mixed-doubles pair submits how
// they paid the per-pair cost they owe. Admin approval happens separately via
// /api/admin/doubles/[id]/approve-payment.

import { TeamUp } from "@/models/TeamUp";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { requireAuth } from "@/utils/server/auth";
import { parseForm } from "@/utils/server/parseForm";

export const PATCH = asyncHandler(async (req, context) => {
  const user = await requireAuth();
  const { id } = await context.params;
  const { fields } = await parseForm(req);

  const method = fields.method?.toString();
  const transactionId = fields.transactionId?.toString();
  const bankId = fields.bankId?.toString();
  const accountName = fields.accountName?.toString();

  if (!["cash", "online"].includes(method)) {
    throw new ApiResponse(400, null, "method must be 'cash' or 'online'");
  }

  const request = await TeamUp.findById(id);
  if (!request) {
    throw new ApiResponse(404, null, "Team-up request not found");
  }
  if (request.from.toString() !== user._id.toString()) {
    throw new ApiResponse(403, null, "Only the requestor owes payment for this pair");
  }
  if (request.status !== "accepted") {
    throw new ApiResponse(400, null, "Payment can only be submitted for an accepted pair");
  }

  request.payment = {
    ...request.payment.toObject(),
    method,
    transactionId: transactionId || undefined,
    bankId: method === "online" ? bankId || undefined : undefined,
    accountName: accountName || undefined,
    paid: true,
    // Re-submitting payment info requires a fresh admin look.
    approved: false,
    approvedBy: undefined,
    approvedAt: undefined,
  };
  await request.save();

  return Response.json(
    new ApiResponse(200, { request }, "Payment submitted, awaiting admin approval")
  );
});
