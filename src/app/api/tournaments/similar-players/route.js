import { Tournament } from "@/models/Tournament";
import { User } from "@/models/User";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { requireAuth } from "@/utils/server/auth";
import "@/models/Game";

// Team Up directory: every tournament+game relevant to either of the two
// isolated pairing processes -- site-wide (not scoped to the viewer's own
// registrations), plus every other player on the site as a potential
// pairing candidate. Sending or accepting a request no longer requires
// either side to be registered for the tournament/game -- this endpoint is
// deliberately just a browse/discovery list. Each game carries enough flags
// for the client to offer only what's relevant per purpose:
//  - "team": double_player games only (forms the real roster team).
//  - "doubles"/"mixed_doubles": games with that side-pot overlay enabled,
//    of either team type.
export const GET = asyncHandler(async () => {
  const user = await requireAuth();

  const tournamentsRaw = await Tournament.find({
    $or: [
      { "games.tournamentTeamType": "double_player" },
      { "games.doublesEnabled": true },
      { "games.mixedDoublesEnabled": true },
    ],
  })
    .select("name games")
    .populate("games.game", "name")
    .lean();

  const tournaments = tournamentsRaw
    .map((t) => ({
      _id: t._id,
      name: t.name,
      games: (t.games || [])
        .filter(
          (g) =>
            g.game &&
            (g.tournamentTeamType === "double_player" || g.doublesEnabled || g.mixedDoublesEnabled)
        )
        .map((g) => ({
          // The specific scheduled instance (subdocument id), not the
          // catalog game id -- the same catalog game can be scheduled more
          // than once in one tournament as fully independent competitions,
          // and only the subdocument id tells those instances apart.
          _id: g._id,
          name: g.eventTitle || g.game.name,
          tournamentTeamType: g.tournamentTeamType,
          doublesEnabled: g.doublesEnabled,
          doublesCost: g.doublesCost,
          mixedDoublesEnabled: g.mixedDoublesEnabled,
          mixedDoublesCost: g.mixedDoublesCost,
        })),
    }))
    .filter((t) => t.games.length > 0);

  // Every other player on the site -- Team Up is a site-wide directory, not
  // limited to people who happen to already share a registration with you.
  // Sending/accepting a request no longer requires either side to be
  // registered for the tournament/game (see POST /api/teamup) -- pairing up
  // first is meant to encourage registration, not gate on it.
  const players = await User.find({ _id: { $ne: user._id }, role: "player" })
    .select("firstname lastname username city gender")
    .lean();

  return Response.json(
    new ApiResponse(
      200,
      { currentUser: user, tournaments, players },
      "Fetched team-up/doubles directory"
    )
  );
});
