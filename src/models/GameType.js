// A GameType (Spades, Hearts, Bid Whist, ...) that admins create dynamically,
// each carrying its own scoring layout. `scoreFields` drives the dynamic score
// table shown at score-entry time: one field per column both teams fill in.
//
// Exactly one field should be flagged `isPrimary: true` -- that's the value that
// decides the winner and feeds standings (stored on Match.teamAScore/teamBScore).
// The rest (e.g. Boston, Hands Won) are captured per game type and stored in the
// Match.teamAScores / teamBScores maps.

import mongoose from "mongoose";
import { buildScoreFields } from "@/constants/scoreComponents";

const { Schema, model, models } = mongoose;

const ScoreFieldSchema = new Schema(
  {
    key: { type: String, required: true, trim: true }, // e.g. "score", "boston"
    label: { type: String, required: true, trim: true }, // e.g. "Boston"
    input: { type: String, enum: ["number", "select"], default: "number" },
    min: { type: Number, default: 0 },
    max: { type: Number }, // for "select": generates options min..max
    step: { type: Number, default: 1 },
    // Exactly one primary field per game type; it decides the match winner.
    isPrimary: { type: Boolean, default: false },
    required: { type: Boolean, default: true },
  },
  { _id: false }
);

const GameTypeSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    description: { type: String, trim: true },
    scoreFields: {
      type: [ScoreFieldSchema],
      validate: [
        (fields) => fields.filter((f) => f.isPrimary).length === 1,
        "Exactly one score field must be marked primary",
      ],
    },
  },
  { timestamps: true }
);

export const GameType = models.GameType || model("GameType", GameTypeSchema);

// The score layouts the app ships with, matching the standard scoring matrix
// (Points / Hands Won / Bostons / Nil / Sandbags / Penalty / Bonus). Seeded on
// first read so existing games keep their columns without an admin having to
// recreate them; admins can still adjust each type's matrix afterward.
export const DEFAULT_GAME_TYPES = [
  {
    name: "Bid Whist",
    description: "Points, hands won, and Bostons.",
    scoreFields: buildScoreFields(["score", "hands", "boston"]),
  },
  {
    name: "Spades",
    description: "Full scoring: points, hands, Bostons, nil, sandbags, penalty, and bonus.",
    scoreFields: buildScoreFields([
      "score",
      "hands",
      "boston",
      "nil",
      "sandbags",
      "penalty",
      "bonus",
    ]),
  },
  {
    name: "Bridge",
    description: "Points, hands won, Bostons, penalty, and bonus.",
    scoreFields: buildScoreFields(["score", "hands", "boston", "penalty", "bonus"]),
  },
  {
    name: "Pinochle",
    description: "Points, hands won, Bostons, and bonus.",
    scoreFields: buildScoreFields(["score", "hands", "boston", "bonus"]),
  },
];
