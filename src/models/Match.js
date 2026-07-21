import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

const MatchSchema = new Schema(
  {
    tournament: {
      type: Schema.Types.ObjectId,
      ref: "Tournament",
      required: true,
    },
    game: { type: Schema.Types.ObjectId, ref: "Game", required: true },
    matchNumber: { type: Number },
    // Physical table assignment, 1..N. Byes/walkovers get none (null).
    tableNumber: { type: Number },
    bracketGroup: { type: Schema.Types.ObjectId, ref: "BracketGroup" },
    round: { type: Number },
    slot: { type: Number },
    stage: {
      type: String,
      enum: ["round1", "playoff"],
    },
    bracketSide: {
      type: String,
      enum: ["winners", "losers", "grand_final"],
    },
    winTarget: {
      type: { round: { type: Number }, match: { type: Number } },
      _id: false,
    },
    lossTarget: {
      type: { round: { type: Number }, match: { type: Number } },
      _id: false,
    },
    // True when this slot will structurally only ever receive one occupant
    // (a bracket bye, or a "pass-through" loser's-bracket slot orphaned by an
    // upstream bye) -- whoever lands here auto-advances with no game played.
    isBye: { type: Boolean, default: false },
    teamA: { type: Schema.Types.ObjectId, ref: "Team" },
    teamB: { type: Schema.Types.ObjectId, ref: "Team" },

    // 🔹 Scores
    teamAScore: { type: Number, default: 0 },
    teamBScore: { type: Number, default: 0 },

    teamAAgree: { type: Boolean, default: false },
    teamBAgree: { type: Boolean, default: false },
    // Which side entered the current (unconfirmed) score, so only the other
    // side may agree/disagree with it. Cleared once the match completes.
    scoreEnteredBy: { type: String, enum: ["teamA", "teamB"] },

    winner: { type: Schema.Types.ObjectId, ref: "Team" },
    loser: { type: Schema.Types.ObjectId, ref: "Team" },

    status: {
      type: String,
      enum: ["pending", "completed"],
      default: "pending",
    },
    scheduledAt: { type: Date },
    completedAt: { type: Date },

    nextMatch: { type: Schema.Types.ObjectId, ref: "Match" }, // for bracket progression
    admin: { type: Schema.Types.ObjectId, ref: "User" },
    teamAtotalWon: { type: Number, default: 0 },
    teamBtotalWon: { type: Number, default: 0 },
    teamAboston: { type: Number, default: 0 },
    teamBboston: { type: Number, default: 0 },

    // Dynamic per-game-type score fields, keyed by the GameType scoreField `key`
    // (e.g. { score: 300, hands: 7, boston: 1 }). The primary field's value is
    // mirrored into teamAScore/teamBScore so winner/standings logic is unchanged.
    teamAScores: { type: Map, of: Number, default: {} },
    teamBScores: { type: Map, of: Number, default: {} },
  },
  { timestamps: true }
);

export const Match = models.Match || model("Match", MatchSchema);
