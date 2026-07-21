import { Match } from "@/models/Match";
import "@/models/Team";
import "@/models/Tournament";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { parseForm } from "@/utils/server/parseForm";
import { requireAuth } from "@/utils/server/auth";
import { routeIntoTarget } from "@/utils/server/bracketProgression";
import "@/models/Game";

// Coerces an incoming dynamic scores object ({ score, boston, ... }) to numbers
// and applies it to one side of the match, mirroring the well-known `boston`
// and `hands` keys into the legacy columns so existing displays keep working.
function applyScores(match, side, scoresObj) {
  if (!scoresObj || typeof scoresObj !== "object") return;
  const clean = {};
  for (const [key, val] of Object.entries(scoresObj)) {
    clean[key] = Number(val) || 0;
  }
  match[`${side}Scores`] = clean;
  if (clean.boston !== undefined) match[`${side}boston`] = clean.boston;
  if (clean.hands !== undefined) match[`${side}totalWon`] = clean.hands;
}

function clearScores(match, side) {
  match[`${side}Scores`] = {};
}

function assignWinner(match) {
  if (match.teamAScore > match.teamBScore) {
    match.winner = match.teamA._id;
    match.loser = match.teamB._id;
  } else if (match.teamBScore > match.teamAScore) {
    match.winner = match.teamB._id;
    match.loser = match.teamA._id;
  } else {
    throw new ApiResponse(400, null, "Draw not supported in knockout format");
  }
}

export const PATCH = asyncHandler(async (req, context) => {
  const user = await requireAuth(req);
  const { id: matchId } = await context.params;
  const { fields } = await parseForm(req);
  const {
    teamAScore,
    teamBScore,
    teamAtotalWon,
    teamBtotalWon,
    teamAboston,
    teamBboston,
    teamAScores, // dynamic per-game-type score map
    teamBScores,
    action, // "submit" | "respond" (regular users only; admin always overrides)
    agree, // for action: "respond"
  } = fields;

  const match = await Match.findById(matchId).populate(
    "teamA teamB tournament game"
  );
  if (!match) throw new ApiResponse(404, null, "Match not found");

  // Captured before any mutation below: a match that was ALREADY completed
  // before this request must not re-trigger bracket routing when re-saved --
  // routeIntoTarget() isn't idempotent (it fills whichever slot is next
  // empty), so calling it again on every admin re-edit of a finished match
  // would plant that same winner into a second slot of the next match,
  // corrupting the bracket (a team ends up facing itself).
  const wasAlreadyCompleted = match.status === "completed";

  if (user.role === "admin") {
    // ✅ Admin full control: sets both sides and completes immediately.
    match.teamAScore = Number(teamAScore) || 0;
    match.teamBScore = Number(teamBScore) || 0;
    match.teamAtotalWon = Number(teamAtotalWon) || 0;
    match.teamBtotalWon = Number(teamBtotalWon) || 0;
    match.teamAboston = Number(teamAboston) || 0;
    match.teamBboston = Number(teamBboston) || 0;
    applyScores(match, "teamA", teamAScores);
    applyScores(match, "teamB", teamBScores);
    match.teamAAgree = true;
    match.teamBAgree = true;
    match.scoreEnteredBy = undefined;
    match.status = "completed";
    match.completedAt = new Date();
    assignWinner(match);
  } else {
    if (match.status === "completed") {
      throw new ApiResponse(400, null, "This match is already completed");
    }

    const userId = user._id.toString();
    const isTeamA = (match.teamA.members || []).some(
      (m) => (typeof m === "string" ? m : m.toString()) === userId
    );
    const isTeamB = (match.teamB.members || []).some(
      (m) => (typeof m === "string" ? m : m.toString()) === userId
    );

    if (!isTeamA && !isTeamB) {
      throw new ApiResponse(
        403,
        null,
        "You are not part of either team in this match"
      );
    }

    const mySide = isTeamA ? "teamA" : "teamB";

    if (action === "submit") {
      // Any player from either side can enter the full result on behalf of
      // both teams -- but once the *other* side has an unconfirmed entry
      // waiting on you, you must Agree/Disagree with it instead of overwriting it.
      if (match.scoreEnteredBy && match.scoreEnteredBy !== mySide) {
        throw new ApiResponse(
          400,
          null,
          "The other team already submitted a score for this match. Please agree or disagree with it."
        );
      }

      if (
        teamAScore === undefined ||
        teamBScore === undefined ||
        Number(teamAScore) === Number(teamBScore)
      ) {
        throw new ApiResponse(
          400,
          null,
          teamAScore === undefined || teamBScore === undefined
            ? "Both teams' scores are required"
            : "Draw not supported in knockout format"
        );
      }

      match.teamAScore = Number(teamAScore);
      match.teamBScore = Number(teamBScore);
      match.teamAtotalWon = Number(teamAtotalWon) || 0;
      match.teamBtotalWon = Number(teamBtotalWon) || 0;
      match.teamAboston = Number(teamAboston) || 0;
      match.teamBboston = Number(teamBboston) || 0;
      applyScores(match, "teamA", teamAScores);
      applyScores(match, "teamB", teamBScores);
      match.scoreEnteredBy = mySide;
      match.teamAAgree = mySide === "teamA";
      match.teamBAgree = mySide === "teamB";
      match.status = "pending";
    } else if (action === "respond") {
      if (!match.scoreEnteredBy) {
        throw new ApiResponse(400, null, "No score has been submitted yet");
      }
      if (match.scoreEnteredBy === mySide) {
        throw new ApiResponse(
          403,
          null,
          "You submitted this score -- waiting for the other team to respond"
        );
      }

      const agreeing = agree === true || agree === "true";

      if (agreeing) {
        match.teamAAgree = true;
        match.teamBAgree = true;
        match.status = "completed";
        match.completedAt = new Date();
        assignWinner(match);
      } else {
        // Disagreement: wipe the score and hand entry rights to the team
        // that just disagreed, so they can submit their own version.
        match.teamAScore = 0;
        match.teamBScore = 0;
        match.teamAtotalWon = 0;
        match.teamBtotalWon = 0;
        match.teamAboston = 0;
        match.teamBboston = 0;
        clearScores(match, "teamA");
        clearScores(match, "teamB");
        match.teamAAgree = false;
        match.teamBAgree = false;
        match.scoreEnteredBy = mySide;
        match.status = "pending";
      }
    } else {
      throw new ApiResponse(400, null, "Invalid action");
    }
  }

  await match.save();

  // Admin correcting an already-completed match: the score/result is saved
  // above, but bracket routing (and crowning a champion) only ever happens
  // once, the first time a match completes -- never re-fire it on an edit.
  if (match.status === "completed" && !wasAlreadyCompleted) {
    const gameConfig = match.tournament.games?.find(
      (g) => g.game.toString() === match.game._id.toString()
    );

    const isElimination =
      match.stage === "playoff" ||
      ["single_elimination", "double_elimination"].includes(gameConfig?.format);
    // Mesh routes both winner and loser to their next-round table, same as
    // double elimination -- but (unlike a bracket) there's no single "final"
    // match; the champion is decided by standings once every round is played,
    // so it shares the round-robin-style completion check below instead.
    const isMeshRound = !isElimination && gameConfig?.format === "mesh";

    if (isElimination) {
      await routeIntoTarget(match, match.winner, match.winTarget);
      if (gameConfig?.format === "double_elimination") {
        await routeIntoTarget(match, match.loser, match.lossTarget);
      }

      if (!match.winTarget && gameConfig) {
        // No further match consumes this winner -> this was the final.
        gameConfig.round1Status = "completed";
        gameConfig.winner = match.winner;
        await match.tournament.save();
      }
    } else if (isMeshRound) {
      await routeIntoTarget(match, match.winner, match.winTarget);
      await routeIntoTarget(match, match.loser, match.lossTarget);
    }

    // Standard format: a fixed round count behaves like round robin (wait for
    // every round ever generated); left open-ended, it instead waits for just
    // the round that just finished, then asks the admin whether to generate
    // another one (see the next-round endpoint).
    const isCappedStandard = gameConfig?.format === "standard" && !!gameConfig?.standardRounds;
    const isIndefiniteStandard = gameConfig?.format === "standard" && !gameConfig?.standardRounds;

    const isFixedSchedule = gameConfig?.format === "round_robin" || isCappedStandard;

    if (gameConfig && (isFixedSchedule || isMeshRound)) {
      // Round robin / mesh / capped standard: score-based, no single "final"
      // match -- crown the champion (or send to playoff) once every round's
      // match is done.
      const round1Matches = await Match.find({
        tournament: match.tournament._id,
        game: match.game._id,
        stage: "round1",
      });
      const allDone = round1Matches.every((m) => m.status === "completed");

      if (allDone && gameConfig.round1Status !== "awaiting_playoff_decision") {
        gameConfig.round1Status = "awaiting_playoff_decision";
        await match.tournament.save();
      }
    } else if (gameConfig && isIndefiniteStandard) {
      const thisRoundMatches = await Match.find({
        tournament: match.tournament._id,
        game: match.game._id,
        stage: "round1",
        round: match.round,
      });
      const roundDone = thisRoundMatches.every((m) => m.status === "completed");

      if (roundDone && gameConfig.round1Status !== "awaiting_next_round_decision") {
        gameConfig.round1Status = "awaiting_next_round_decision";
        await match.tournament.save();
      }
    }
  }

  return Response.json(
    new ApiResponse(
      200,
      match,
      `Match updated: ${match.teamA?.name ?? "TBD"} vs ${match.teamB?.name ?? "TBD"}`
    )
  );
});
