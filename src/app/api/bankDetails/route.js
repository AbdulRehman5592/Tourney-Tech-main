import { BankDetails } from "@/models/BankDetails";
import { ApiError } from "@/utils/server/ApiError";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { parseForm } from "@/utils/server/parseForm";
import { requireAdmin } from "@/utils/server/roleGuards";

export const POST = asyncHandler(async (req) => {
  await requireAdmin();
  const { fields } = await parseForm(req);

  const bankName = fields.bankName?.toString();
  const accountNumber = fields.accountNumber?.toString();
  const accountHolder = fields.accountHolder?.toString();

  if (!bankName || !accountNumber || !accountHolder) {
    throw new ApiError(400, "Bank details are required.");
  }

  const bankDetails = await BankDetails.create({
    bankName,
    accountHolder,
    accountNumber,
  });

  return Response.json(
    new ApiResponse(201, bankDetails, "Bank details created successfully")
  );
});

export const GET = asyncHandler(async () => {
  const bankDetails = await BankDetails.find().sort({ createdAt: -1 }).lean();

  return Response.json(
    new ApiResponse(200, bankDetails, "Bank details fetched successfully")
  );
  
});
