import mongoose from "mongoose";

const ImageGallerySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

export const ImageGallery =
  mongoose.models.ImageGallery ||
  mongoose.model("ImageGallery", ImageGallerySchema);
