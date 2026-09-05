import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

const GameRegistrationSchema = new Schema({
  // Catalog Game ids, kept for display (populate -> name/icon/etc.). Not
  // unique on its own -- see gameConfigIds below.
  games: [{ type: Schema.Types.ObjectId, ref: "Game", required: true }],
  // The specific scheduled instance(s) registered for (Tournament.games[]._id),
  // one per entry in `games` at the same index -- the real identity, since the
  // same catalog game can be scheduled more than once in one tournament as
  // fully independent competitions with their own entry fee/format/etc.
  gameConfigIds: [{ type: Schema.Types.ObjectId, required: true }],
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
    // Player-submitted note about the payment, e.g. "paid Sarah cash at
    // check-in" -- shown to organizers to help them track/verify it.
    note: {
      type: String,
      trim: true,
    },
    // Screenshot of the transfer receipt, required for online payments --
    // gives organizers something to actually check the transaction ID against.
    receiptUrl: {
      type: String,
    },
  },
  // Admin-only scratchpad -- e.g. "player paid Sarah in cash at check-in".
  // Never shown to the player, just a memory aid for whoever reviews payments.
  adminNote: { type: String, trim: true, default: "" },
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
