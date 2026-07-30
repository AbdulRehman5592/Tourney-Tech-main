import { Schema, model, models } from "mongoose";

// Admin-managed regions shown in the signup "Playing Region" dropdown. The
// built-in 20 (codes 00-19) are seeded from constants/regions.js and are
// load-bearing for team numbering (RR-TTT) -- see teamNumbering.js. New
// admin-added regions get the next free code in the reserved 20-39 range
// (see constants/regions.js) so existing numbering is never disturbed.
const RegionSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, unique: true, trim: true },
    isBuiltIn: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Region = models.Region || model("Region", RegionSchema);
