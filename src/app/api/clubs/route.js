import { Club } from "@/models/Club";
import { clubList } from "@/constants/RegionData";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { ApiError } from "@/utils/server/ApiError";
import { requireAdmin } from "@/utils/server/roleGuards";

// Seeds the existing known clubs the first time the collection is read, so
// existing users' club values remain valid dropdown options.
async function ensureSeeded() {
  const count = await Club.estimatedDocumentCount();
  if (count === 0) {
    await Club.insertMany(clubList.map((name) => ({ name })));
  }
}

// GET /api/clubs -- public (needed on the pre-login signup page)
export const GET = asyncHandler(async () => {
  await ensureSeeded();
  const clubs = await Club.find().sort({ name: 1 }).lean();
  return Response.json(new ApiResponse(200, clubs, "Clubs fetched successfully"));
});

// POST /api/clubs -- admin only
export const POST = asyncHandler(async (req) => {
  await requireAdmin();
  const body = await req.json();
  const name = body.name?.toString().trim();
  if (!name) throw new ApiError(400, "Club name is required");

  const exists = await Club.findOne({ name });
  if (exists) throw new ApiError(409, "A club with this name already exists");

  const club = await Club.create({
    name,
    city: body.city?.toString().trim() || undefined,
    state: body.state?.toString().trim() || undefined,
  });
  return Response.json(new ApiResponse(201, club, "Club created successfully"));
});
