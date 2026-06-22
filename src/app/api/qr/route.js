import { uploadQrToCloudinary } from "@/utils/server/cloudinary";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { ApiError } from "@/utils/server/ApiError";
import { asyncHandler } from "@/utils/server/asyncHandler";

// GET or POST /api/test/qr?url=https://example.com
export const GET = asyncHandler(async (req) => {
  const { searchParams } = new URL(req.url);
  const urlToEncode = searchParams.get("url");

  if (!urlToEncode) {
    throw new ApiError(400, "Missing 'url' query parameter");
  }

  const uploadedUrl = await uploadQrToCloudinary(urlToEncode);

  return Response.json(
    new ApiResponse(
      200,
      { qrUrl: uploadedUrl },
      "QR code generated and uploaded"
    )
  );
});

// Optional POST version if you want to test using raw JSON body
export const POST = asyncHandler(async (req) => {
  const body = await req.json();
  const urlToEncode = body.url;

  if (!urlToEncode) {
    throw new ApiError(400, "Missing 'url' in JSON body");
  }

  const uploadedUrl = await uploadQrToCloudinary(urlToEncode);

  return Response.json(
    new ApiResponse(
      200,
      { qrUrl: uploadedUrl },
      "QR code generated and uploaded"
    )
  );
});
