import { Schema, model, models } from "mongoose";

const GameRegistrationSchema = new Schema({
  games: [{ type: Schema.Types.ObjectId, ref: "Game", required: true }],
  team: { type: Schema.Types.ObjectId, ref: "Team" }, // optional for solo
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  paid: { type: Boolean, default: false },
  paymentMethod: {
    type: String,
    enum: ["cash", "online"],
    default: "cash",
  },
  paymentDetails: {
    bankId: {
      type: Schema.Types.ObjectId,
      ref: "BankDetails",
    },
    accountName: {
      type: String,
    },
    transactionId: {
      type: String,
    },
  },
});

const RegistrationSchema = new Schema(
  {
    tournament: {
      type: Schema.Types.ObjectId,
      ref: "Tournament",
      required: true,
    },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true }, // captain or solo player
    gameRegistrationDetails: GameRegistrationSchema,
  },
  { timestamps: true }
);

export const Registration =
  models.Registration || model("Registration", RegistrationSchema);
