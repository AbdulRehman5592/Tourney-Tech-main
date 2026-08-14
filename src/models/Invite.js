import { Schema, model, models } from "mongoose";

// Represents "user A wants to pair up with whoever opens this link" -- used
// when the desired partner isn't a registered user yet. Once the invitee
// responds (after signing up/logging in), a real TeamUp record is created
// between `inviter` and `invitee`.
const InviteSchema = new Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    inviter: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    tournament: {
      type: Schema.Types.ObjectId,
      ref: "Tournament",
      required: true,
    },
    gameId: {
      type: String,
      required: true,
    },
    mode: {
      type: String,
      enum: ["doubles", "mixed_doubles"],
      required: true,
    },
    message: {
      type: String,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "cancelled"],
      default: "pending",
    },
    invitee: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    teamUp: {
      type: Schema.Types.ObjectId,
      ref: "TeamUp",
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  },
  { timestamps: true }
);

export const Invite = models.Invite || model("Invite", InviteSchema);
