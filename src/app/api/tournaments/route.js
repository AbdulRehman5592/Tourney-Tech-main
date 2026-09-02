import { asyncHandler } from "@/utils/server/asyncHandler";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { ApiError } from "@/utils/server/ApiError";
import { requireAdmin } from "@/utils/server/roleGuards";
import { parseForm } from "@/utils/server/parseForm";
import { uploadOnCloudinary } from "@/utils/server/cloudinary";
import { Tournament } from "@/models/Tournament";
import { validateDoublesConfig } from "@/utils/server/doublesConfig";
import { parseScheduledAt } from "@/utils/server/gameSchedule";
import { findSchedulingConflict } from "@/utils/server/tournamentGames";
import { Game } from "@/models/Game";


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

  if (endDate <= startDate) {
    throw new ApiError(400, "End date must be after the start date");
  }

  if (!Array.isArray(games)) {
    throw new ApiError(400, "games must be an array");
  }

  // No games yet -- save as a draft regardless of the requested status; a
  // tournament can't be upcoming/ongoing/completed with nothing to play.
  const finalStatus = games.length === 0 ? "draft" : status;

const validFormats = ["round_robin", "mesh", "standard", "single_elimination", "double_elimination"];
const acceptedGames = [];
for (const game of games) {
  if (
    !game.game ||
    typeof game.teamBased !== "boolean" ||
    !game.tournamentTeamType ||
    !game.format
  ) {
    throw new ApiError(400, "Invalid game configuration (missing format)");
  }

  if (!game.eventTitle || !game.eventTitle.toString().trim()) {
    throw new ApiError(400, "Event title is required for every game");
  }

  if (!validFormats.includes(game.format)) {
    throw new ApiError(400, "Invalid tournament format");
  }

  // Per-game date/time -- optional, but rejected outright if unparseable.
  game.scheduledAt = parseScheduledAt(game.scheduledAt);

  // Drop blank entries -- the form always sends at least one text input, even
  // when the admin never typed anything into it.
  game.locations = Array.isArray(game.locations)
    ? game.locations.map((l) => l?.toString().trim()).filter(Boolean)
    : [];

  // Mesh (table-movement) format has no default round count -- it must be
  // set explicitly so it's never silently skipped at setup.
  if (game.format === "mesh" && (!game.meshRounds || Number(game.meshRounds) < 1)) {
    throw new ApiError(400, "meshRounds is required for the mesh format");
  }

  if (game.format === "standard" && game.standardDirection && !["up", "down"].includes(game.standardDirection)) {
    throw new ApiError(400, "Invalid standardDirection");
  }

  if (
    game.rewardByeType &&
    game.rewardByeType !== "none" &&
    game.format !== "single_elimination"
  ) {
    throw new ApiError(400, "Reward bye is only supported for the single_elimination format");
  }

  if (game.playoffEnabled && !["round_robin", "mesh", "standard"].includes(game.format)) {
    throw new ApiError(400, "Playoff plan is only supported for round_robin, mesh, or standard formats");
  }
  if (game.playoffQualifiersCount !== undefined && game.playoffQualifiersCount !== "" && Number(game.playoffQualifiersCount) < 2) {
    throw new ApiError(400, "playoffQualifiersCount must be at least 2");
  }
  if (game.playoffFormat && !["single_elimination", "double_elimination"].includes(game.playoffFormat)) {
    throw new ApiError(400, "Invalid playoffFormat");
  }

  // Same rule as adding a game to an existing tournament: the same game can
  // appear more than once in this tournament only when each entry has its
  // own distinct, explicitly scheduled time.
  const conflict = findSchedulingConflict(acceptedGames, game.game, game.scheduledAt);
  if (conflict) {
    const gameDoc = await Game.findById(game.game).select("name");
    throw new ApiError(
      409,
      `"${gameDoc?.name || "This game"}" is added twice to this tournament at the same time. Give each entry its own date/time.`
    );
  }
  acceptedGames.push(game);

  validateDoublesConfig(game);
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
    status: finalStatus,
    staff,

  });

  return Response.json(
    new ApiResponse(201, tournament, "Tournament created successfully")
  );
});

// Draft (0-game) tournaments are excluded by default -- they have nothing to
// register for/play and would show as broken empty cards to players. Admin
// management pages that need to find and edit their drafts pass
// ?includeDrafts=true.
export const GET = asyncHandler(async (req) => {
  const { searchParams } = new URL(req.url);
  const includeDrafts = searchParams.get("includeDrafts") === "true";

  const query = includeDrafts ? {} : { status: { $ne: "draft" } };
  const tournaments = await Tournament.find(query)
    .populate("games.game", "name icon")
    .populate("staff.user", "username email")
    .sort({ createdAt: -1 })
    .lean();

  return Response.json(
    new ApiResponse(200, tournaments, "Tournaments fetched successfully")
  );
});
