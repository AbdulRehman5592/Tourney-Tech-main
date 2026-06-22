import { Schema, model, models } from "mongoose";

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
    members: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    partner: { type: Schema.Types.ObjectId, ref: "User" },
    serialNo: { type: String, required: true },
  },
  { timestamps: true }
);

TeamSchema.index({ tournament: 1, game: 1, name: 1 }, { unique: true });

export const Team = models.Team || model("Team", TeamSchema);
