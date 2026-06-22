import { Schema, model, models } from "mongoose";

const MatchSchema = new Schema(
  {
    tournament: {
      type: Schema.Types.ObjectId,
      ref: "Tournament",
      required: true,
    },
    game: { type: Schema.Types.ObjectId, ref: "Game", required: true },
    matchNumber: { type: Number },
    bracketGroup: { type: Schema.Types.ObjectId, ref: "BracketGroup" },
    round: { type: Number },
    stage: {
      type: String,
    },
    teamA: { type: Schema.Types.ObjectId, ref: "Team" },
    teamB: { type: Schema.Types.ObjectId, ref: "Team" },

    // 🔹 Scores
    teamAScore: { type: Number, default: 0 },
    teamBScore: { type: Number, default: 0 },

    teamAAgree: { type: Boolean, default: false },
    teamBAgree: { type: Boolean, default: false },

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
  },
  { timestamps: true }
);

export const Match = models.Match || model("Match", MatchSchema);
