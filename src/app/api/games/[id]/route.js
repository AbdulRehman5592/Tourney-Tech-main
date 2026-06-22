// src/app/api/games/[id]/route.js

import { Game } from "@/models/Game";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { ApiError } from "@/utils/server/ApiError";
import { requireAdmin } from "@/utils/server/roleGuards";
import { uploadOnCloudinary } from "@/utils/server/cloudinary";
import { parseForm } from "@/utils/server/parseForm"; // ✅ Use shared util

export const config = {
  api: { bodyParser: false },
};

export const PATCH = asyncHandler(async (req, context) => {
  await requireAdmin();

  const params = await context.params;
  const { id } = params;
  const game = await Game.findById(id);
  if (!game) throw new ApiError(404, "Game not found");

  const { fields, files } = await parseForm(req);

  const allowedFields = [
    "name",
    "genre",
    "platform",
    "description",
    "rulesUrl",
  ];
  for (const key of allowedFields) {
    if (fields[key]) game[key] = fields[key].toString();
  }

  // Handle icon update
  const iconPath = Array.isArray(files.icon)
    ? files.icon[0]?.filepath
    : files.icon?.filepath;

  if (iconPath) {
    const iconUpload = await uploadOnCloudinary(iconPath, "games/icons");
    game.icon = iconUpload.secure_url;
  }

  // Handle cover update
  const coverPath = Array.isArray(files.coverImage)
    ? files.coverImage[0]?.filepath
    : files.coverImage?.filepath;

  if (coverPath) {
    const coverUpload = await uploadOnCloudinary(coverPath, "games/covers");
    game.coverImage = coverUpload.secure_url;
  }

  await game.save();

  return Response.json(
    new ApiResponse(200, game.toObject(), "Game updated successfully")
  );
});
// DELETE /api/games/:id
export const DELETE = asyncHandler(async (_req, context) => {
  await requireAdmin();

  const params = await context.params;

  const { id } = params;

  const deletedGame = await Game.findByIdAndDelete(id);

  if (!deletedGame) throw new ApiError(404, "Game not found");

  return Response.json(new ApiResponse(200, null, "Game deleted successfully"));
});

export const POST = asyncHandler(async (_, context) => {
  await requireAdmin();

  const { id } = context.params;

  const game = await Game.findById(id);
  if (!game) throw new ApiError(404, "Game not found");

  const duplicateGame = await Game.create({
    name: game.name,
    genre: game.genre,
    platform: game.platform,
    description: game.description,
    rulesUrl: game.rulesUrl,
    icon: game.icon,
    coverImage: game.coverImage,
  });

  return Response.json(
    new ApiResponse(200, duplicateGame, "Game duplicated successfully")
  );
});
