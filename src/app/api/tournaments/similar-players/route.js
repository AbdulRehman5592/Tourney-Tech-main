import { Registration } from "@/models/Registration";
import { Tournament } from "@/models/Tournament";
import { User } from "@/models/User";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { requireAuth } from "@/utils/server/auth";
import "@/models/Game";

// Team Up directory: every tournament+game where Doubles/Mixed Doubles is
// enabled, site-wide (not scoped to the viewer's own registrations), plus
// every other player on the site as a potential pairing candidate. Sending a
// request still requires both sides to actually be registered+approved for
// the chosen tournament/game (enforced in POST /api/teamup) -- this endpoint
// is deliberately just a browse/discovery list.
export const GET = asyncHandler(async () => {
  const user = await requireAuth();

  const tournamentsRaw = await Tournament.find({
    $or: [{ "games.doublesEnabled": true }, { "games.mixedDoublesEnabled": true }],
  })
    .select("name games")
    .populate("games.game", "name")
    .lean();

  const tournaments = tournamentsRaw
    .map((t) => ({
      _id: t._id,
      name: t.name,
      games: (t.games || [])
        .filter((g) => (g.doublesEnabled || g.mixedDoublesEnabled) && g.game)
        .map((g) => ({
          _id: g.game._id,
          name: g.game.name,
          doublesEnabled: g.doublesEnabled,
          doublesCost: g.doublesCost,
          mixedDoublesEnabled: g.mixedDoublesEnabled,
          mixedDoublesCost: g.mixedDoublesCost,
        })),
    }))
    .filter((t) => t.games.length > 0);

  // Every other player on the site -- Team Up is a site-wide directory, not
  // limited to people who happen to already share a registration with you.
  const players = await User.find({ _id: { $ne: user._id }, role: "player" })
    .select("firstname lastname username city gender")
    .lean();

  // Whether the viewer themselves is registered+approved for at least one of
  // the doubles-enabled tournament/games above -- surfaced so the frontend
  // can explain upfront why a send might fail, rather than the player
  // discovering it only after picking someone.
  let currentUserEligible = false;
  if (tournaments.length > 0) {
    const myRegs = await Registration.find({
      user: user._id,
      tournament: { $in: tournaments.map((t) => t._id) },
      "gameRegistrationDetails.status": "approved",
    })
      .select("tournament gameRegistrationDetails.games")
      .lean();

    currentUserEligible = myRegs.some((reg) => {
      const tournament = tournaments.find(
        (t) => t._id.toString() === reg.tournament.toString()
      );
      const myGameIds = (reg.gameRegistrationDetails?.games || []).map((g) => g.toString());
      return tournament?.games.some((g) => myGameIds.includes(g._id.toString()));
    });
  }

  return Response.json(
    new ApiResponse(
      200,
      { currentUser: user, tournaments, players, currentUserEligible },
      "Fetched doubles/mixed-doubles directory"
    )
  );
});
