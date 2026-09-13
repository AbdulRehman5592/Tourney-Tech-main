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
    members: {
      type: [{ type: Schema.Types.ObjectId, ref: "User" }],
      // Last line of defense against a duplicate player filling two member
      // slots on the same team -- the actual UX/validation lives in the
      // create/edit team forms and the /api/team routes, this just makes
      // sure it can never happen even via a direct write.
      validate: {
        validator: (v) => new Set((v || []).map(String)).size === (v || []).length,
        message: "The same player can't fill more than one member slot on a team",
      },
    },
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

    // Check-in: has this team actually shown up? A team that isn't checked
    // in when Round 1 is generated (POST /api/matches) is excluded from
    // seeding entirely, rather than getting seated and then no-showing.
    checkedIn: { type: Boolean, default: false },
    checkedInAt: { type: Date },
    checkedInBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

TeamSchema.index({ tournament: 1, gameConfigId: 1, name: 1 }, { unique: true });

export const Team = models.Team || model("Team", TeamSchema);
