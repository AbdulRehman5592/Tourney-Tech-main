import { Schema, model, models } from "mongoose";

const BracketGroupSchema = new Schema(
  {
    tournament: { type: Schema.Types.ObjectId, ref: "Tournament", required: true },
    game: { type: Schema.Types.ObjectId, ref: "Game", required: true },
    name: { type: String, required: true },
    order: { type: Number, required: true },
    bracketSide: { type: String, enum: ["winner", "loser"], default: "winner" },
  },
  { timestamps: true }
);


BracketGroupSchema.index({ tournament: 1, game: 1, name: 1 }, { unique: true });

export const BracketGroup =
  models.BracketGroup || model("BracketGroup", BracketGroupSchema);
