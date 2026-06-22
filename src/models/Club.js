import { Schema, model, models } from "mongoose";

const ClubSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Club name is required."],
      unique: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    logo: {
      type: String, // image URL or Cloudinary path
    },

    city: {
      type: String,
      required: [true, "City is required."],
    },

    state: {
      type: String,
      required: [true, "State is required."],
    },
  },
  { timestamps: true }
);

export const Club = models.Club || model("Club", ClubSchema);
