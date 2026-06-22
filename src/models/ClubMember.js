import { Schema, model, models } from "mongoose";

const ClubMemberSchema = new Schema(
  {
    club: {
      type: Schema.Types.ObjectId,
      ref: "Club",
      required: true,
    },

    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    role: {
      type: String,
      enum: ["player", "captain", "manager", "coach", "admin", "bench"],
      default: "player",
    },

    status: {
      type: String,
      enum: ["active", "pending", "removed"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export const ClubMember =
  models.ClubMember || model("ClubMember", ClubMemberSchema);

/**
 * 🔍 Explanation: Using `.populate("user")` or `.populate("club")`
 *
 * In the ClubMember schema, both `user` and `club` are ObjectId references:
 *
 * user: {
 *   type: Schema.Types.ObjectId,
 *   ref: "User",
 * }
 *
 * club: {
 *   type: Schema.Types.ObjectId,
 *   ref: "Club",
 * }
 *
 * By default, when you query ClubMember documents, Mongoose returns only the ObjectId for `user` and `club`.
 *
 * Example (without populate):
 *
 * {
 *   _id: "64fca12...",
 *   user: "64fbc123...",       // just the ID
 *   club: "65abcd12...",
 *   role: "player",
 *   status: "active"
 * }
 *
 * ✅ But using `.populate("user")` and/or `.populate("club")`:
 *
 * ClubMember.find().populate("user").populate("club");
 *
 * Returns:
 *
 * {
 *   _id: "64fca12...",
 *   user: {
 *     _id: "64fbc123...",
 *     username: "kingpro",
 *     email: "king@pro.com",
 *     ...
 *   },
 *   club: {
 *     _id: "65abcd12...",
 *     name: "Team Phoenix",
 *     region: "EU",
 *     ...
 *   },
 *   role: "player",
 *   status: "active"
 * }
 *
 * ✅ You can also customize what's populated:
 *
 * ClubMember.find()
 *   .populate({ path: "user", select: "username email" })
 *   .populate({ path: "club", select: "name region" });
 *
 * This is useful for frontend APIs where you want readable names instead of raw IDs.
 */
