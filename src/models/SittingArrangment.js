import { Schema, model, models } from "mongoose";

const SittingArrangmentSchema = new Schema(
  {
    tournament: {
      type: Schema.Types.ObjectId,
      ref: "Tournament",
      required: true,
    },
    game: {
      type: Schema.Types.ObjectId,
      ref: "Game",
      required: true,
    },
    gallery: {
      type: Schema.Types.ObjectId,
      ref: "ImageGallery",
      required: false,
      default: null,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

export const SittingArrangment =
  models.SittingArrangment ||
  model("SittingArrangment", SittingArrangmentSchema);
