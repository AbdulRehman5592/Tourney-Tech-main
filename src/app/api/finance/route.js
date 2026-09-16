import { connectDB } from "@/lib/mongoose";
import { Registration } from "@/models/Registration";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { requireAdmin } from "@/utils/server/roleGuards";
import "@/models/Tournament";
import "@/models/Game";
import "@/models/User";

function findGameConfig(tournament, gameConfigId) {
  return tournament?.games?.find((g) => String(g._id) === String(gameConfigId));
}

function sumEntryFees(tournament, gameConfigIds) {
  return (gameConfigIds || []).reduce((sum, gid) => {
    const slot = findGameConfig(tournament, gid);
    return sum + (slot?.entryFee || 0);
  }, 0);
}

function gameLabel(tournament, gameConfigId) {
  const slot = findGameConfig(tournament, gameConfigId);
  if (!slot) return "Unknown game";
  return slot.eventTitle || slot.game?.name || "Unnamed game";
}

// Every payment, refund, and game-move adjustment across all tournaments,
// classified into one flat list of rows. No cancelled-registration filter
// like GET /api/tournamentRegister (which excludes them) or
// GET /api/tournamentRegister/cancelled (which only returns them) -- this
// route needs both in one pass to classify each registration correctly.
// Plain JS reduce over a bounded result set rather than a Mongo aggregation
// pipeline, matching how every other admin list in this codebase works.
export const GET = asyncHandler(async (req) => {
  await connectDB();
  await requireAdmin();

  const { searchParams } = new URL(req.url);
  const tournamentId = searchParams.get("tournamentId");
  const type = searchParams.get("type"); // payment | pending | refund | adjustment
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const search = searchParams.get("search")?.trim().toLowerCase();

  const filter = {};
  if (tournamentId) filter.tournament = tournamentId;

  const registrations = await Registration.find(filter)
    .populate({
      path: "tournament",
      populate: { path: "games.game", model: "Game" },
    })
    .populate("user", "firstname lastname username email")
    .lean();

  const rows = [];

  for (const reg of registrations) {
    const tournament = reg.tournament;
    if (!tournament) continue; // orphaned registration (deleted tournament) -- skip defensively

    const playerName =
      `${reg.user?.firstname || ""} ${reg.user?.lastname || ""}`.trim() ||
      reg.user?.username ||
      reg.user?.email ||
      "Unknown player";

    const gameConfigIds = reg.gameRegistrationDetails?.gameConfigIds || [];
    const gamesLabel = gameConfigIds.map((gid) => gameLabel(tournament, gid)).join(", ");

    if (reg.cancelled) {
      rows.push({
        id: `${reg._id}-refund`,
        type: "refund",
        registrationId: reg._id,
        tournamentId: tournament._id,
        tournament: tournament.name,
        player: playerName,
        game: gamesLabel,
        amount: -sumEntryFees(tournament, gameConfigIds),
        method: reg.gameRegistrationDetails?.paymentMethod || null,
        status: reg.refundStatus,
        date: reg.cancelledAt,
      });
    } else if (reg.gameRegistrationDetails?.status !== "rejected") {
      const paid = reg.gameRegistrationDetails?.paid === true;
      rows.push({
        id: `${reg._id}-${paid ? "payment" : "pending"}`,
        type: paid ? "payment" : "pending",
        registrationId: reg._id,
        tournamentId: tournament._id,
        tournament: tournament.name,
        player: playerName,
        game: gamesLabel,
        amount: sumEntryFees(tournament, gameConfigIds),
        method: reg.gameRegistrationDetails?.paymentMethod || null,
        status: paid ? "paid" : "pending",
        date: paid
          ? reg.gameRegistrationDetails?.verifiedAt || reg.updatedAt
          : reg.createdAt,
      });
    }

    for (const adj of reg.financialAdjustments || []) {
      rows.push({
        id: `${reg._id}-adj-${adj._id}`,
        type: "adjustment",
        registrationId: reg._id,
        tournamentId: tournament._id,
        tournament: tournament.name,
        player: playerName,
        game: `${gameLabel(tournament, adj.fromGameConfigId)} → ${gameLabel(tournament, adj.toGameConfigId)}`,
        amount: adj.amount,
        method: null,
        status: "recorded",
        reason: adj.reason,
        date: adj.createdAt,
      });
    }
  }

  // Stat-card totals reflect the tournament scope only (if any), not the
  // type/date/search filters below -- those narrow just the table rows.
  const summary = rows.reduce(
    (acc, r) => {
      if (r.type === "payment") acc.collected += r.amount;
      else if (r.type === "pending") acc.pending += r.amount;
      else if (r.type === "refund") acc.refunded += Math.abs(r.amount);
      else if (r.type === "adjustment") acc.adjustments += r.amount;
      return acc;
    },
    { collected: 0, pending: 0, refunded: 0, adjustments: 0 }
  );

  let filtered = rows;
  if (type) filtered = filtered.filter((r) => r.type === type);
  if (from) filtered = filtered.filter((r) => r.date && new Date(r.date) >= new Date(from));
  if (to) filtered = filtered.filter((r) => r.date && new Date(r.date) <= new Date(to));
  if (search) {
    filtered = filtered.filter(
      (r) =>
        r.player.toLowerCase().includes(search) ||
        r.tournament.toLowerCase().includes(search)
    );
  }
  filtered.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  return Response.json(
    new ApiResponse(200, { summary, rows: filtered }, "Finance data fetched successfully")
  );
});
