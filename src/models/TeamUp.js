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
    // What kind of pairing this request is for -- each has its own isolated
    // process/result:
    //  - "team": forms the real roster Team for a double_player game. No cost/
    //    payment; accepting it creates the Team (see createTeamForAcceptedTeamUp).
    //  - "doubles"/"mixed_doubles": a side-pot scoring overlay only -- no Team
    //    gets created, and the two players must NOT already be teammates
    //    (same roster Team) for this tournament/game. Mixed doubles also
    //    enforces an opposite-gender constraint.
    mode: {
      type: String,
      enum: ["team", "doubles", "mixed_doubles"],
      required: true,
    },
    // Set once an accepted "team" mode request creates the real roster Team.
    team: { type: Schema.Types.ObjectId, ref: "Team" },
    // Snapshot of the per-pair cost at accept time, owed by `from` (the
    // requestor pays for every pair they initiated that gets accepted).
    // Always 0 for "team" mode -- no side-pot cost applies.
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
