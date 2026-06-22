import { Schema, model, models } from "mongoose";

const TeamMemberSchema = new Schema(
  {
    tournament: {
      type: Schema.Types.ObjectId,
      ref: "Tournament",
      required: true,
    },
    game: { type: Schema.Types.ObjectId, ref: "Game", required: true },
    team: { type: Schema.Types.ObjectId, ref: "Team", required: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

TeamMemberSchema.index({ tournament: 1, game: 1, user: 1 }, { unique: true });

export const TeamMember =
  models.TeamMember || model("TeamMember", TeamMemberSchema);
