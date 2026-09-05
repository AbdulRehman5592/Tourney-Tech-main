// import { Registration, GameRegistrationSchema } from "@/models/Registration.js";
import { connectDB } from "@/lib/mongoose.js";
import { Registration } from "@/models/Registration.js";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { parseForm } from "@/utils/server/parseForm";
import { requireAuth } from "@/utils/server/auth";
import { requireAdmin } from "@/utils/server/roleGuards";
import { createOrUpdateRegistration } from "@/utils/server/tournamentRegistration";
import { uploadOnCloudinary } from "@/utils/server/cloudinary";
import "@/models/BankDetails";
import "@/models/Game";
import "@/models/Team";

export const POST = asyncHandler(async (req) => {
  await connectDB();
  const { fields, files } = await parseForm(req);
  const requester = await requireAuth();

  const tournamentId = fields.tournamentId?.toString();
  const requestedUserId = fields.userId?.toString();
  const userId = requestedUserId || requester?._id?.toString();
  let gameIds = fields.gameIds;
  if (typeof gameIds === "string") {
    try {
      gameIds = JSON.parse(gameIds);
    } catch {
      // not JSON -- leave as the single id string it already is
    }
  }
  const paymentMethod = fields.paymentMethod?.toString();
  const paymentDetails =
    typeof fields.paymentDetails === "string"
      ? JSON.parse(fields.paymentDetails)
      : fields.paymentDetails;

  if (requestedUserId && requestedUserId !== requester?._id?.toString()) {
    await requireAdmin();
  }

  // Screenshot of the transfer, required for online payments -- gives
  // organizers something to actually check the transaction ID against.
  if (paymentMethod === "online") {
    const receiptFile = Array.isArray(files?.receipt)
      ? files.receipt[0]
      : files?.receipt;
    if (receiptFile?.filepath) {
      const uploaded = await uploadOnCloudinary(
        receiptFile.filepath,
        "payment-receipts"
      );
      if (paymentDetails) {
        paymentDetails.receiptUrl = uploaded?.secure_url;
      }
    }
  }

  const { registration, created } = await createOrUpdateRegistration({
    tournamentId,
    userId,
    gameIds,
    paymentMethod,
    paymentDetails,
    requireReceipt: true,
  });

  if (!created) {
    return Response.json(
      new ApiResponse(200, null, "Registration updated successfully.")
    );
  }

  return Response.json(
    new ApiResponse(
      201,
      registration,
      "Tournament registration created successfully"
    )
  );
});

export const GET = asyncHandler(async (req) => {
  await connectDB();

  const tournamentId = new URL(req.url).searchParams.get("tournamentId");

  // Self-serve lookup: "am I already registered, and for which games?"
  if (tournamentId) {
    const requester = await requireAuth();

    const registration = await Registration.findOne({
      tournament: tournamentId,
      user: requester._id,
    })
      .populate({
        path: "gameRegistrationDetails.games",
        model: "Game",
      })
      .lean();

    return Response.json(
      new ApiResponse(200, registration, "Registration fetched successfully")
    );
  }

  const registrations = await Registration.find()
    .populate("tournament")
    .populate("user", "username email")
    .populate({
      path: "gameRegistrationDetails.games",
      model: "Game",
    })
    .populate({
      path: "gameRegistrationDetails.team",
      model: "Team",
      strictPopulate: false,
    })
    .populate({
      path: "gameRegistrationDetails.paymentDetails.bankId",
      model: "BankDetails",
      strictPopulate: false,
    })
    .sort({ createdAt: -1 })
    .lean();

  // Flag transaction IDs reused across more than one registration -- a real
  // one should never appear twice, so a repeat is a strong signal someone
  // copy-pasted a screenshot/ID from another registration.
  const transactionIdCounts = {};
  for (const r of registrations) {
    const txnId = r.gameRegistrationDetails?.paymentDetails?.transactionId;
    if (txnId) {
      transactionIdCounts[txnId] = (transactionIdCounts[txnId] || 0) + 1;
    }
  }
  for (const r of registrations) {
    const txnId = r.gameRegistrationDetails?.paymentDetails?.transactionId;
    if (r.gameRegistrationDetails?.paymentDetails) {
      r.gameRegistrationDetails.paymentDetails.isDuplicateTransactionId =
        !!txnId && transactionIdCounts[txnId] > 1;
    }
  }

  return Response.json(
    new ApiResponse(200, registrations, "Registrations fetched successfully")
  );
});
