import { ImageGallery } from "@/models/ImageGallery";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { uploadOnCloudinary } from "@/utils/server/cloudinary";
import { requireAdmin } from "@/utils/server/roleGuards";

// const { asyncHandler } = require("@/utils/server/asyncHandler");
// const { parseForm } = require("@/utils/server/parseForm");

import { asyncHandler } from "@/utils/server/asyncHandler";
import { parseForm } from "@/utils/server/parseForm";



export const POST = asyncHandler(async (req) => {
  await requireAdmin();
  const { files, fields } = await parseForm(req);

    const name = fields.name?.toString();


  const iconPath = Array.isArray(files.iconImage)
    ? files.iconImage[0]?.filepath
    : files.iconImage?.filepath;

    if (!name || !iconPath) {
    throw new ApiResponse(400, null, "Image name is required");
  }

  const iconUpload = iconPath
    ? await uploadOnCloudinary(iconPath, "image-gallery")
    : null;

  const response = await ImageGallery.create({
    name,
    image: iconUpload?.secure_url,
  });

  return Response.json(
    new ApiResponse(201, response, "Image gallery created successfully")
  );
});

export const GET = asyncHandler(async () => {
  const response = await ImageGallery.find().sort({ createdAt: -1 }).lean();

  return Response.json(
    new ApiResponse(200, response, "Image gallery fetched successfully")
  );
});
