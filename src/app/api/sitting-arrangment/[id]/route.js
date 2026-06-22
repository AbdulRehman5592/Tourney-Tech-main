import { SittingArrangment } from "@/models/SittingArrangment";
import { ApiError } from "@/utils/server/ApiError";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { requireAuth } from "@/utils/server/auth";
import "@/models/Tournament";
import "@/models/Game";
import "@/models/User";
import { parseForm } from "@/utils/server/parseForm";
// import { uploadOnCloudinary } from "@/utils/server/cloudinary";

export const DELETE = asyncHandler(async (_, context) => {
  const user = await requireAuth();
  const id = context.params.id;

  if (!id) {
    throw new ApiError(400, "ID is required");
  }

  const sittingArrangement = await SittingArrangment.findOne({
    _id: id,
    user: user._id,
  });

  if (!sittingArrangement) {
    throw new ApiError(404, "Sitting Arrangement not found or unauthorized");
  }

  await SittingArrangment.deleteOne({ _id: id });

  return Response.json(
    new ApiResponse(200, null, "Sitting Arrangement deleted successfully")
  );
});

export const PATCH = asyncHandler(async (req, context) => {
  const user = await requireAuth();
  // const { fields, files } = await parseForm(req);
  const { fields } = await parseForm(req);

  const sittingArrangementId = context.params?.id;
  const tournamentId = fields.tournamentId?.toString();
  const gameId = fields.gameId?.toString();
  const galleryId = fields.galleryId?.toString();

  if (!sittingArrangementId) {
    throw new ApiError(400, "Sitting Arrangement ID is required");
  }

  const updateData = {};
  if (tournamentId) updateData.tournament = tournamentId;
  if (gameId) updateData.game = gameId;
  if (galleryId) updateData.gallery = galleryId;
  

  const sittingArrangement = await SittingArrangment.findOneAndUpdate(
    { _id: sittingArrangementId, user: user._id },
    { $set: updateData },
    { new: true }
  ).populate("game tournament user gallery");

  if (!sittingArrangement) {
    throw new ApiError(404, "Sitting Arrangement not found or unauthorized");
  }

  return Response.json(
    new ApiResponse(
      200,
      sittingArrangement,
      "Sitting Arrangement updated successfully"
    )
  );
});
