// src/app/api/games/route.js

import { Game } from "@/models/Game";
import { parseForm } from "@/utils/server/parseForm";
import { uploadOnCloudinary } from "@/utils/server/cloudinary";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { ApiError } from "@/utils/server/ApiError";
import { requireAdmin } from "@/utils/server/roleGuards";

export const config = {
  api: { bodyParser: false },
};

// POST /api/games
export const POST = asyncHandler(async (req) => {
  await requireAdmin(); // Only admins can create games

  const { fields, files } = await parseForm(req);

  const name = fields.name?.toString();
  const genre = fields.genre?.toString();
  const platform = fields.platform?.toString();
  const description = fields.description?.toString();
  const rulesUrl = fields.rulesUrl?.toString();

  if (!name || !platform) {
    throw new ApiError(400, "Game name and platform are required.");
  }

  const iconPath = Array.isArray(files.icon)
    ? files.icon[0]?.filepath
    : files.icon?.filepath;

  const coverPath = Array.isArray(files.coverImage)
    ? files.coverImage[0]?.filepath
    : files.coverImage?.filepath;

  const iconUpload = iconPath
    ? await uploadOnCloudinary(iconPath, "games/icons")
    : null;

  const coverUpload = coverPath
    ? await uploadOnCloudinary(coverPath, "games/covers")
    : null;

  const createdGame = await Game.create({
    name,
    genre,
    platform,
    description,
    rulesUrl,
    icon: iconUpload?.secure_url || "/images/default-icon.png",
    coverImage: coverUpload?.secure_url || "/images/default-cover.jpg",
  });

  const fullGame = await Game.findById(createdGame._id).lean();

  return Response.json(
    new ApiResponse(201, fullGame, "Game created successfully")
  );
});

// GET /api/games
export const GET = asyncHandler(async () => {
  const games = await Game.find().sort({ createdAt: -1 }).lean();

  return Response.json(
    new ApiResponse(200, games, "Games fetched successfully")
  );
});
