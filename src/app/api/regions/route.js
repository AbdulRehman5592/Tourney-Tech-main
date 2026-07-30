import { Region } from "@/models/Region";
import { GEOGRAPHIC_REGIONS } from "@/constants/regions";
import { getNextSequence } from "@/lib/utils";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { ApiError } from "@/utils/server/ApiError";
import { requireAdmin } from "@/utils/server/roleGuards";

// Seeds the 20 built-in regions the first time the collection is read, so the
// dropdown never starts empty and matches the existing team-numbering legend.
async function ensureSeeded() {
  const count = await Region.estimatedDocumentCount();
  if (count === 0) {
    await Region.insertMany(
      GEOGRAPHIC_REGIONS.map((r) => ({ code: r.code, name: r.name, isBuiltIn: true }))
    );
  }
}

// Codes 20-39 are reserved for admin-added regions (see constants/regions.js).
const CUSTOM_CODE_BASE = 20;
const CUSTOM_CODE_MAX = 39;

// GET /api/regions -- public (needed on the pre-login signup page)
export const GET = asyncHandler(async () => {
  await ensureSeeded();
  const regions = await Region.find().sort({ code: 1 }).lean();
  return Response.json(new ApiResponse(200, regions, "Regions fetched successfully"));
});

// POST /api/regions -- admin only, auto-assigns the next free 20-39 code
export const POST = asyncHandler(async (req) => {
  await requireAdmin();
  const body = await req.json();
  const name = body.name?.toString().trim();
  if (!name) throw new ApiError(400, "Region name is required");

  const exists = await Region.findOne({ name });
  if (exists) throw new ApiError(409, "A region with this name already exists");

  const seq = await getNextSequence("region-code");
  const codeNum = CUSTOM_CODE_BASE + seq - 1;
  if (codeNum > CUSTOM_CODE_MAX) {
    throw new ApiError(409, "No more region codes available (20-39 range is full)");
  }
  const code = String(codeNum).padStart(2, "0");

  const region = await Region.create({ code, name, isBuiltIn: false });
  return Response.json(new ApiResponse(201, region, "Region created successfully"));
});
