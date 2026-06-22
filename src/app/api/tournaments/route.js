  import { asyncHandler } from "@/utils/server/asyncHandler";
  import { ApiResponse } from "@/utils/server/ApiResponse";
  import { ApiError } from "@/utils/server/ApiError";
  import { requireAdmin } from "@/utils/server/roleGuards";
  import { parseForm } from "@/utils/server/parseForm";
  import { uploadOnCloudinary } from "@/utils/server/cloudinary";
  import { Tournament } from "@/models/Tournament";
  import "@/models/Game";

  export const config = {
    api: {
      bodyParser: false,
    },
  };

  
  export const POST = asyncHandler(async (req) => {
    const user = await requireAdmin(); 

    const { fields, files } = await parseForm(req);

    const name = fields.name?.toString();
    const description = fields.description?.toString() || "";
    const location = fields.location?.toString();
    const startDate = new Date(fields.startDate);
    const endDate = new Date(fields.endDate);
    const isPublic = fields.isPublic === "false" ? false : true;

    const games = JSON.parse(fields.games || "[]");

    const status = fields.status?.toString() || "upcoming";


    const organizers = JSON.parse(fields.organizers || "[]");
    const managers = JSON.parse(fields.managers || "[]");
    const support = JSON.parse(fields.support || "[]");

    if (!name || !location || isNaN(startDate) || isNaN(endDate)) {
      throw new ApiError(400, "Missing required fields");
    }

    if (!Array.isArray(games) || games.length === 0) {
      throw new ApiError(400, "At least one game is required");
    }

   for (const game of games) {
  if (
    !game.game ||
    typeof game.teamBased !== "boolean" ||
    !game.tournamentTeamType ||
    !game.rounds // ✅ check rounds
  ) {
    throw new ApiError(400, "Invalid game configuration (missing rounds)");
  }

  if (isNaN(game.rounds) || game.rounds <= 0) {
    throw new ApiError(400, "Rounds must be a positive number");
  }
}


    // Upload banner if provided
    const bannerPath = Array.isArray(files.banner)
      ? files.banner[0]?.filepath
      : files.banner?.filepath;

    const bannerUpload = bannerPath
      ? await uploadOnCloudinary(bannerPath, "tournaments/banners")
      : null;

    // Build staff array
    const staff = [
      { user: user._id, role: "owner" }, // creator is owner
      ...organizers.map((id) => ({ user: id, role: "organizer" })),
      ...managers.map((id) => ({ user: id, role: "manager" })),
      ...support.map((id) => ({ user: id, role: "support" })),
    ];

    const tournament = await Tournament.create({
      name,
      description,
      bannerUrl: bannerUpload?.secure_url || "",
      location,
      startDate,
      endDate,
      isPublic,
      games,
      // status: "upcoming",
      status,
      staff,

    });

    return Response.json(
      new ApiResponse(201, tournament, "Tournament created successfully")
    );
  });

export const GET = asyncHandler(async () => {
  const tournaments = await Tournament.find()
    .populate("games.game", "name icon") 
    .populate("staff.user", "username email")
    .sort({ createdAt: -1 })
    .lean();

  return Response.json(
    new ApiResponse(200, tournaments, "Tournaments fetched successfully")
  );
});
