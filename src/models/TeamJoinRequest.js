// src\models\TeamJoinRequest.js

import { Schema, model, models } from "mongoose";

const TeamJoinRequestSchema = new Schema(
  {
    tournament: {
      type: Schema.Types.ObjectId,
      ref: "Tournament",
      required: true,
    },
    game: { type: Schema.Types.ObjectId, ref: "Game", required: true },
    team: { type: Schema.Types.ObjectId, ref: "Team", required: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
    message: { type: String, trim: true }, // optional custom note
  },
  { timestamps: true }
);

TeamJoinRequestSchema.index(
  { tournament: 1, game: 1, team: 1, user: 1 },
  { unique: true }
);

export const TeamJoinRequest =
  models.TeamJoinRequest || model("TeamJoinRequest", TeamJoinRequestSchema);
