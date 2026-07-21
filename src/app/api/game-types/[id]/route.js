import { GameType } from "@/models/GameType";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { ApiError } from "@/utils/server/ApiError";
import { requireAdmin } from "@/utils/server/roleGuards";

function validateScoreFields(scoreFields) {
  if (!Array.isArray(scoreFields) || scoreFields.length === 0) {
    throw new ApiError(400, "At least one score field is required");
  }
  if (scoreFields.filter((f) => f.isPrimary).length !== 1) {
    throw new ApiError(400, "Exactly one score field must be marked primary");
  }
  const keys = new Set();
  for (const f of scoreFields) {
    if (!f.key || !f.label) {
      throw new ApiError(400, "Each score field needs a key and a label");
    }
    if (keys.has(f.key)) throw new ApiError(400, `Duplicate score field key: ${f.key}`);
    keys.add(f.key);
  }
}

// GET /api/game-types/:id
export const GET = asyncHandler(async (_req, context) => {
  const { id } = await context.params;
  const gameType = await GameType.findById(id).lean();
  if (!gameType) throw new ApiError(404, "Game type not found");
  return Response.json(new ApiResponse(200, gameType, "Game type fetched"));
});

// PATCH /api/game-types/:id
export const PATCH = asyncHandler(async (req, context) => {
  await requireAdmin();
  const { id } = await context.params;
  const body = await req.json();

  const update = {};
  if (body.name !== undefined) update.name = body.name;
  if (body.description !== undefined) update.description = body.description;
  if (body.scoreFields !== undefined) {
    validateScoreFields(body.scoreFields);
    update.scoreFields = body.scoreFields;
  }

  const gameType = await GameType.findByIdAndUpdate(id, update, {
    new: true,
    runValidators: true,
  });
  if (!gameType) throw new ApiError(404, "Game type not found");

  return Response.json(new ApiResponse(200, gameType, "Game type updated"));
});

// DELETE /api/game-types/:id
export const DELETE = asyncHandler(async (_req, context) => {
  await requireAdmin();
  const { id } = await context.params;
  const gameType = await GameType.findByIdAndDelete(id);
  if (!gameType) throw new ApiError(404, "Game type not found");
  return Response.json(new ApiResponse(200, gameType, "Game type deleted"));
});
