import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

const TeamSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    logo: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    tournament: {
      type: Schema.Types.ObjectId,
      ref: "Tournament",
      required: true,
    },
    game: { type: Schema.Types.ObjectId, ref: "Game", required: true },
    // The specific scheduled instance of that game within the tournament
    // (Tournament.games[]._id) -- the real identity for team formation and
    // bracket scoping, since the same catalog game can be scheduled more
    // than once in one tournament as fully independent competitions.
    gameConfigId: { type: Schema.Types.ObjectId, required: true },
    members: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    partner: { type: Schema.Types.ObjectId, ref: "User" },
    serialNo: { type: String, required: true },

    // Team numbering system (RR-TTT). See constants/regions.js + teamNumbering.js.
    classification: {
      type: String,
      enum: [
        "geographic",
        "alliance",
        "temporary",
        "international",
        "invitational",
        "house",
        "provisional",
        "admin",
      ],
      default: "geographic",
    },
    regionCode: { type: String }, // 2-digit "RR"
    teamNumber: { type: Number }, // sequential within regionCode ("TTT")
    displayId: { type: String }, // "RR-TTT"
    // For hybrid/alliance teams: the two home regions of the paired players.
    primaryRegion: { type: String },
    secondaryRegion: { type: String },
  },
  { timestamps: true }
);

TeamSchema.index({ tournament: 1, gameConfigId: 1, name: 1 }, { unique: true });

export const Team = models.Team || model("Team", TeamSchema);
