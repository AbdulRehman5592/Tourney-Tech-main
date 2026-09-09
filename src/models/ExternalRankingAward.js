import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

// A ranking award manually entered by an admin for a tournament that wasn't
// run through Tourney Techs (see the National Ranking & External Tournament
// Import guide). Points are always derived server-side from tableCount +
// placement using the same tier table as native events -- never trusted as
// a raw input -- so an admin can't accidentally create an arbitrary award.
const ExternalRankingAwardSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    // Stored as the GameType name (not a ref) so this stays readable even if
    // a GameType is later renamed, matching how Game.gameType is stored.
    gameType: { type: String, required: true, trim: true },
    eventName: { type: String, required: true, trim: true },
    eventDate: { type: Date, required: true },
    tableCount: { type: Number, required: true, min: 5, max: 100 },
    placement: { type: Number, required: true, enum: [1, 2, 3, 4] },
    points: { type: Number, required: true },
    notes: { type: String, trim: true },
    enteredBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

// Duplicate protection: the same player can't be awarded points for the same
// external event twice.
ExternalRankingAwardSchema.index(
  { user: 1, gameType: 1, eventName: 1, eventDate: 1 },
  { unique: true }
);

export const ExternalRankingAward =
  models.ExternalRankingAward || model("ExternalRankingAward", ExternalRankingAwardSchema);
