import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

const TournamentGameSchema = new Schema({
  game: { type: Schema.Types.ObjectId, ref: "Game", required: true },
  entryFee: { type: Number, default: 0 },
  // When this specific game is played (date + time). Optional so tournaments
  // created before scheduling existed -- and drafts still being planned -- stay
  // valid; the UI shows "Schedule TBA" when it's unset.
  scheduledAt: { type: Date },
  // Free-text label for this specific scheduled slot/round (e.g. "Morning
  // Session", "Round 1 Finals") -- distinct from the game itself. Enforced as
  // required at the API layer (not here) so saving any one game on an
  // existing tournament doesn't fail whole-document validation over older
  // sibling games that predate this field.
  eventTitle: { type: String, trim: true },
  // Where this game is played. Usually one room/court, but a game can span
  // several (e.g. multiple courts running the same round at once).
  locations: { type: [String], default: [] },
  format: {
    type: String,
    enum: [
      "round_robin",
      "mesh",
      "standard",
      "single_elimination",
      "double_elimination",
    ],
    required: true,
  },
  meshGroupCount: { type: Number }, // deprecated: mesh no longer uses pools
  // Mesh (table-movement) format: fixed number of rounds, required at setup --
  // deliberately has no default so it can never be silently skipped.
  meshRounds: { type: Number, min: 1 },
  // Standard (fixed-home rotation) format: which way the away team shifts
  // each round, and an optional round cap -- when left unset the format runs
  // indefinitely, one round at a time, until the admin declines "another
  // round?" during score entry.
  standardDirection: { type: String, enum: ["up", "down"], default: "up" },
  standardRounds: { type: Number, min: 1 },
  // How standings (round_robin / mesh / standard) rank teams, and what a
  // finalize-round1 "no playoff" decision crowns as champion.
  winCriteria: {
    type: String,
    enum: ["wins", "hands", "points"],
    default: "wins",
  },
  // Pre-set intent, chosen at tournament setup, for round_robin/mesh/standard
  // games only: whether Round 1 should be followed by a single-elimination
  // playoff. This doesn't automate anything by itself -- the actual go/no-go
  // call (and final qualifier count, once real registration numbers are
  // known) is still made live by the admin on the "Round 1 complete" decision
  // panel; this just pre-fills that panel and lets players see the plan.
  playoffEnabled: { type: Boolean, default: false },
  playoffQualifiersCount: { type: Number, min: 2 },
  // Bracket shape for the playoff itself once it's actually built. Reward
  // bye / protected seed only applies to single_elimination -- double_elimination's
  // winners/losers structure doesn't support that mechanic (see buildDoubleElimination).
  playoffFormat: {
    type: String,
    enum: ["single_elimination", "double_elimination"],
    default: "single_elimination",
  },
  round1Status: {
    type: String,
    enum: [
      "pending",
      "in_progress",
      // Standard format only, indefinite mode: the just-generated round is
      // fully played and the admin needs to say whether to generate another.
      "awaiting_next_round_decision",
      "awaiting_playoff_decision",
      "completed",
    ],
    default: "pending",
  },
  // Whether check-in is currently accepting arrivals for this game, ahead of
  // bracket generation -- a team that never checks in isn't pulled into
  // Round 1 seeding (see the Team.checkedIn filter in POST /api/matches).
  checkInOpen: { type: Boolean, default: false },
  winner: { type: Schema.Types.ObjectId, ref: "Team" },
  // Reward bye / protected seed (single_elimination only): how deep a
  // protected team's bye reaches before it plays its first match. Which team
  // is protected is chosen at bracket-generation time (once teams exist, not
  // at setup) and recorded here afterward for display.
  rewardByeType: {
    type: String,
    enum: ["none", "first_round", "quarterfinal", "semifinal", "final_four", "championship"],
    default: "none",
  },
  protectedSeedTeam: { type: Schema.Types.ObjectId, ref: "Team" },
  teamBased: { type: Boolean, default: true },
  tournamentTeamType: {
    type: String,
    enum: ["single_player", "double_player"],
    required: true,
  },
  // Doubles / Mixed Doubles overlay (single_player games only): players keep
  // playing their own solo matches, but voluntary pairs formed via TeamUp get
  // a combined score afterward. Not related to tournamentTeamType/double_player
  // bracket-team play.
  doublesEnabled: { type: Boolean, default: false },
  doublesCost: { type: Number, default: 0 },
  mixedDoublesEnabled: { type: Boolean, default: false },
  mixedDoublesCost: { type: Number, default: 0 },
});

const TournamentStaffSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    role: {
      type: String,
      enum: ["owner", "organizer", "manager", "support"],
      required: true,
    },
  },
  { _id: false }
);

const TournamentSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String },
    bannerUrl: { type: String },
    location: { type: String, required: true, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isPublic: { type: Boolean, default: true },
    status: {
      type: String,
      // "draft" = no games added yet; enforced server-side (see
      // tournaments API routes) whenever games.length === 0, so a tournament
      // can never be "upcoming"/"ongoing"/"completed" with nothing to play.
      // "registration_closed" is a manually-set staging point between
      // "upcoming" and "ongoing": new registrations and player self-service
      // cancellations both stop once a tournament reaches it (see POST
      // /api/tournamentRegister and POST /api/tournamentRegister/cancel) --
      // from there, changes go through the tournament director directly.
      enum: ["draft", "upcoming", "registration_closed", "ongoing", "completed"],
      default: "upcoming",
    },
    games: {
      // A tournament can be created/saved with zero games as a draft; admins
      // add games later. Games are only required once status leaves "draft".
      type: [TournamentGameSchema],
    },
    staff: [TournamentStaffSchema],
    // Whether this tournament's results count toward National Rankings.
    // Independent of format -- Tourney Techs Staff can flag any tournament in
    // or out, regardless of bracket/rotation type. Defaulted at creation time
    // (see POST /api/tournaments) to whatever the old blanket rule would have
    // given it -- true only if it already has a round_robin/mesh/standard
    // game -- so existing behavior doesn't change until staff acts. From
    // then on it's a plain staff-controlled flag; see PATCH
    // /api/tournaments/[id]/ranked.
    nationallyRanked: { type: Boolean, default: false },
    // Independent of `status` (play lifecycle) and `isPublic` (unused today) --
    // a tournament created by a promoted, non-admin director starts "pending"
    // and is excluded from every public listing until a Full Admin approves
    // it. Admin-created tournaments default straight to "approved" so
    // existing behavior is unchanged.
    approvalStatus: {
      type: String,
      enum: ["approved", "pending", "rejected"],
      default: "approved",
    },
    approvalNote: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

export const Tournament =
  models.Tournament || model("Tournament", TournamentSchema);
