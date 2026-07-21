// src\models\Game.js

import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

const GameSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    genre: { type: String, trim: true },
    // Name of a GameType (admin-managed collection). Kept as a string so it
    // stays populated even if a GameType is later renamed/removed; the score
    // layout is looked up by this name at score-entry time.
    gameType: {
      type: String,
      trim: true,
    },
    platform: {
      type: String,
      required: true,
    },
    description: { type: String },
    rulesUrl: { type: String },
    icon: { type: String },
    coverImage: { type: String },
  },
  { timestamps: true }
);

export const Game = models.Game || model("Game", GameSchema);
