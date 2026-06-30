// src\models\Game.js

import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

const GameSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    genre: { type: String, trim: true },
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
