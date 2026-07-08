import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

const TournamentGameSchema = new Schema({
  game: { type: Schema.Types.ObjectId, ref: "Game", required: true },
  entryFee: { type: Number, default: 0 },
  format: {
    type: String,
    enum: ["round_robin", "mesh", "single_elimination", "double_elimination"],
    required: true,
  },
  meshGroupCount: { type: Number },
  round1Status: {
    type: String,
    enum: ["pending", "in_progress", "awaiting_playoff_decision", "completed"],
    default: "pending",
  },
  winner: { type: Schema.Types.ObjectId, ref: "Team" },
  teamBased: { type: Boolean, default: true },
  tournamentTeamType: {
    type: String,
    enum: ["single_player", "double_player"],
    required: true,
  },
});

const TournamentStaffSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    role: {
      type: String,
      enum: ["owner", "organizer", "manager", "support"],
      required: true,
    },
  },
  { _id: false }
);

const TournamentSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String },
    bannerUrl: { type: String },
    location: { type: String, required: true, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isPublic: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ["upcoming", "ongoing", "completed"],
      default: "upcoming",
    },
    games: {
      type: [TournamentGameSchema],
      validate: [(val) => val.length > 0, "At least one game is required"],
    },
    staff: [TournamentStaffSchema],
  },
  { timestamps: true }
);

export const Tournament =
  models.Tournament || model("Tournament", TournamentSchema);
