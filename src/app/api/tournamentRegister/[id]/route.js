import { Registration } from "@/models/Registration";
import { ApiError } from "@/utils/server/ApiError";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { parseForm } from "@/utils/server/parseForm";
import { requireAdmin } from "@/utils/server/roleGuards";


export const PATCH = asyncHandler(async (req, context) => {
  await requireAdmin();
  const { id } = context.params;
  if (!id) throw new ApiError(400, "ID parameter is missing");

  const { fields } = await parseForm(req);

  const status = fields.status?.toString();

  if (!["pending", "approved", "rejected"].includes(status)) {
    return Response.json(new ApiResponse(400, null, "Invalid status value"));
  }

  const registration = await Registration.findByIdAndUpdate(
    id,
    {
      "gameRegistrationDetails.status": status,
      "gameRegistrationDetails.paid": status === "approved",
    },
    { new: true }
  )
    .populate("tournament")
    .populate("user", "username email")
    .populate("gameRegistrationDetails.games")
    .populate("gameRegistrationDetails.team")
    .populate("gameRegistrationDetails.paymentDetails.bankId")
    .lean();

  if (!registration) {
    return Response.json(new ApiResponse(404, null, "Registration not found"));
  }

  return Response.json(
    new ApiResponse(200, registration, "Status updated successfully")
  );
});
