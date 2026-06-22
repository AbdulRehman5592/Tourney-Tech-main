import { BankDetails } from "@/models/BankDetails";
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

  const bankDetailsExist = await BankDetails.findById(id);

  if (!bankDetailsExist) throw new ApiError(404, "Bank details not found");

  const updateData = {
    bankName: fields.bankName?.toString() ?? bankDetailsExist.bankName,
    accountNumber:
      fields.accountNumber?.toString() ?? bankDetailsExist.accountNumber,
    accountHolder:
      fields.accountHolder?.toString() ?? bankDetailsExist.accountHolder,
  };

  const updatedBankDetails = await BankDetails.findByIdAndUpdate(
    id,
    updateData,
    { new: true }
  );

  return Response.json(
    new ApiResponse(
      200,
      updatedBankDetails,
      "Bank details updated successfully"
    )
  );
});

export const DELETE = asyncHandler(async (_, context) => {
  await requireAdmin();

  const { id } = context.params;
  if (!id) throw new ApiError(400, "ID parameter is missing");

  const bankDetailsExist = await BankDetails.findById(id);
  if (!bankDetailsExist) throw new ApiError(404, "Bank details not found");

  await BankDetails.findByIdAndDelete(id);

  return Response.json(
    new ApiResponse(200, null, "Bank details deleted successfully")
  );
});
