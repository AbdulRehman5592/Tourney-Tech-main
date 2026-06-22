import { ImageGallery } from "@/models/ImageGallery";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { uploadOnCloudinary } from "@/utils/server/cloudinary";
import { requireAdmin } from "@/utils/server/roleGuards";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { parseForm } from "@/utils/server/parseForm";

export const PATCH = asyncHandler(async (req, context) => {
  await requireAdmin();
  const { id } = context?.params;

  const { files, fields } = await parseForm(req);

  const name = fields.name?.toString();

  if (!id) {
    throw new ApiResponse(400, null, "Image ID is required for update");
  }

  const iconPath = Array.isArray(files.iconImage)
    ? files.iconImage[0]?.filepath
    : files.iconImage?.filepath;

  let iconUpload = null;

  if (iconPath) {
    iconUpload = await uploadOnCloudinary(iconPath, "image-gallery");
  }

  const updatedData = {};
  if (name) updatedData.name = name;
  if (iconUpload?.secure_url) updatedData.image = iconUpload.secure_url;

  const response = await ImageGallery.findByIdAndUpdate(id, updatedData, {
    new: true,
  });

  if (!response) {
    throw new ApiResponse(404, null, "Image not found");
  }

  return Response.json(
    new ApiResponse(200, response, "Image gallery updated successfully")
  );
});

// -------------------- DELETE --------------------
export const DELETE = asyncHandler(async (_, context) => {
  await requireAdmin();

  const {id} = context?.params;

  if (!id) {
    throw new ApiResponse(400, null, "Image ID is required for deletion");
  }

  const response = await ImageGallery.findByIdAndDelete(id);

  if (!response) {
    throw new ApiResponse(404, null, "Image not found");
  }

  return Response.json(
    new ApiResponse(200, response, "Image gallery deleted successfully")
  );
});
