import { Schema, model, models } from "mongoose";

const TeamUpSchema = new Schema(
  {
    from: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    tournament: {
      type: Schema.Types.ObjectId,
      ref: "Tournament",
      required: true,
    },
    to: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
    message: {
      type: String,
    },
    gameId: {
      type: String
    },
    // Which doubles competition this pairing request belongs to. Mixed doubles
    // enforces an opposite-gender constraint; doubles has no gender constraint.
    mode: {
      type: String,
      enum: ["doubles", "mixed_doubles"],
      required: true,
    },
    // Snapshot of the per-pair cost at accept time, owed by `from` (the
    // requestor pays for every pair they initiated that gets accepted).
    costOwed: { type: Number, default: 0 },
    payment: {
      method: { type: String, enum: ["cash", "online"], default: "cash" },
      paid: { type: Boolean, default: false },
      approved: { type: Boolean, default: false },
      approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
      approvedAt: { type: Date },
      transactionId: { type: String },
      bankId: { type: Schema.Types.ObjectId, ref: "BankDetails" },
      accountName: { type: String },
    },
  },
  { timestamps: true }
);

export const TeamUp = models.TeamUp || model("TeamUp", TeamUpSchema);
