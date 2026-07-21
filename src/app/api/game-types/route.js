import { GameType, DEFAULT_GAME_TYPES } from "@/models/GameType";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { ApiError } from "@/utils/server/ApiError";
import { requireAdmin } from "@/utils/server/roleGuards";

// Seeds the built-in game types the first time the collection is read, so
// existing Spades games keep their Score / Hands / Boston columns without an
// admin having to recreate them.
async function ensureSeeded() {
  const count = await GameType.estimatedDocumentCount();
  if (count === 0) {
    await GameType.insertMany(DEFAULT_GAME_TYPES);
  }
}

function validateScoreFields(scoreFields) {
  if (!Array.isArray(scoreFields) || scoreFields.length === 0) {
    throw new ApiError(400, "At least one score field is required");
  }
  const primaries = scoreFields.filter((f) => f.isPrimary);
  if (primaries.length !== 1) {
    throw new ApiError(400, "Exactly one score field must be marked primary");
  }
  const keys = new Set();
  for (const f of scoreFields) {
    if (!f.key || !f.label) {
      throw new ApiError(400, "Each score field needs a key and a label");
    }
    if (keys.has(f.key)) {
      throw new ApiError(400, `Duplicate score field key: ${f.key}`);
    }
    keys.add(f.key);
  }
}

// GET /api/game-types
export const GET = asyncHandler(async () => {
  await ensureSeeded();
  const gameTypes = await GameType.find().sort({ name: 1 }).lean();
  return Response.json(
    new ApiResponse(200, gameTypes, "Game types fetched successfully")
  );
});

// POST /api/game-types
export const POST = asyncHandler(async (req) => {
  await requireAdmin();
  const body = await req.json();
  const { name, description, scoreFields } = body;

  if (!name) throw new ApiError(400, "Game type name is required");
  validateScoreFields(scoreFields);

  const exists = await GameType.findOne({ name: name.trim() });
  if (exists) throw new ApiError(409, "A game type with this name already exists");

  const gameType = await GameType.create({ name, description, scoreFields });
  return Response.json(
    new ApiResponse(201, gameType, "Game type created successfully")
  );
});
