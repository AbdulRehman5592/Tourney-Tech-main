// src\app\api\tournaments\[id]\games\[gid]\undo-decision\route.js
//
// Reverses the single most recent round-progression decision, for the
// "staff clicked the wrong button" case:
//   - "awaiting_playoff_decision" (indefinite standard format only) -> back
//     to "awaiting_next_round_decision", i.e. undo an accidental "Stop Here".
//   - "completed" with no playoff bracket generated -> back to
//     "awaiting_playoff_decision" and clear the crowned winner, i.e. undo an
//     accidental "No Playoff -- Crown Standings Winner".
// Deliberately does NOT undo past a generated playoff bracket -- that would
// mean deleting real Match documents, which is a bigger, riskier operation
// than this "one wrong click" safety net is meant to cover.

import { Tournament } from "@/models/Tournament";
import { Match } from "@/models/Match";
import { requireAuth } from "@/utils/server/auth";
import { requireTournamentStaff } from "@/utils/server/tournamentPermissions";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { ApiError } from "@/utils/server/ApiError";
import { ApiResponse } from "@/utils/server/ApiResponse";

export const POST = asyncHandler(async (req, context) => {
  const user = await requireAuth(req);
  const params = await context.params;
  const tournamentId = params.id;
  const gameConfigId = params.gid;

  await requireTournamentStaff(tournamentId, user, ["admin", "owner", "organizer"]);

  const tournament = await Tournament.findById(tournamentId);
  if (!tournament) throw new ApiError(404, "Tournament not found");
  const gameConfig = tournament.games.id(gameConfigId);
  if (!gameConfig) throw new ApiError(404, "Game not found in this tournament");

  if (gameConfig.round1Status === "completed") {
    const hasPlayoff = await Match.exists({
      tournament: tournamentId,
      gameConfigId,
      stage: "playoff",
    });
    if (hasPlayoff) {
      throw new ApiError(
        400,
        "A playoff bracket has already been generated for this game -- that can't be undone here."
      );
    }
    gameConfig.winner = undefined;
    gameConfig.round1Status = "awaiting_playoff_decision";
  } else if (
    gameConfig.round1Status === "awaiting_playoff_decision" &&
    gameConfig.format === "standard" &&
    !gameConfig.standardRounds
  ) {
    gameConfig.round1Status = "awaiting_next_round_decision";
  } else {
    throw new ApiError(400, "There's no recent decision to undo right now.");
  }

  await tournament.save();

  return Response.json(
    new ApiResponse(200, { round1Status: gameConfig.round1Status }, "Decision undone")
  );
});
