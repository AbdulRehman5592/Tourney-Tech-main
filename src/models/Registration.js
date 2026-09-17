import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

// One entry per game the player registered for within this tournament.
// Each entry is independently addressable (own _id) and carries its own
// approval/payment/team state -- a player registering for 3 games gets 3
// entries, each of which an admin can approve/reject/remove/move on its own
// without touching the other two.
const GameEntrySchema = new Schema(
  {
    // Catalog Game id, kept for display (populate -> name/icon/etc.).
    game: { type: Schema.Types.ObjectId, ref: "Game", required: true },
    // The specific scheduled instance (Tournament.games[]._id) -- the real
    // identity, since the same catalog game can be scheduled more than once
    // in one tournament as fully independent competitions.
    gameConfigId: { type: Schema.Types.ObjectId, required: true },
    team: { type: Schema.Types.ObjectId, ref: "Team" }, // optional for solo
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    paid: { type: Boolean, default: false },
    paymentMethod: {
      type: String,
      enum: ["cash", "online"],
      default: "cash",
    },
    paymentDetails: {
      bankId: {
        type: Schema.Types.ObjectId,
        ref: "BankDetails",
      },
      accountName: {
        type: String,
      },
      transactionId: {
        type: String,
      },
      // Player-submitted note about the payment, e.g. "paid Sarah cash at
      // check-in" -- shown to organizers to help them track/verify it.
      note: {
        type: String,
        trim: true,
      },
      // Screenshot of the transfer receipt, required for online payments --
      // gives organizers something to actually check the transaction ID against.
      receiptUrl: {
        type: String,
      },
    },
    // Admin-only scratchpad -- e.g. "player paid Sarah in cash at check-in".
    // Never shown to the player, just a memory aid for whoever reviews payments.
    adminNote: { type: String, trim: true, default: "" },
    // Who verified the payment and when -- set automatically the moment
    // status flips to "approved" (see PATCH .../game-entries/[entryId]).
    // Not player-editable; purely an audit trail for the admin side.
    verifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
    verifiedAt: { type: Date },
    // Admin-initiated drop of just this one game -- soft-deleted rather than
    // spliced out of the array so there's a record for the refund queue and
    // for organizers to see who was removed and why. Filtered out of active
    // queues (checkin, eligibility, approve/reject lists) alongside `cancelled`.
    removed: { type: Boolean, default: false },
    removedAt: { type: Date },
    removedReason: { type: String, trim: true },
    // Player-initiated self-service cancellation of just this one game (see
    // POST /api/tournamentRegister/cancel). Kept distinct from `removed` so
    // Finance/audit can tell "player dropped this" from "admin removed this".
    cancelled: { type: Boolean, default: false },
    cancelledAt: { type: Date },
    // Only ever "requested" if `paid` was true at the moment this entry was
    // cancelled/removed -- an unpaid entry has nothing to refund.
    refundStatus: {
      type: String,
      enum: ["not_applicable", "requested", "processed", "denied"],
      default: "not_applicable",
    },
    // Admin note left when resolving a refund request for this game -- e.g.
    // "refunded via cash 9/10".
    refundNote: { type: String, trim: true },
  },
  { timestamps: true }
);

// One entry per admin-initiated change to what a player owes after their
// original registration -- today that's only ever a game-to-game move (see
// PATCH .../game-entries/[entryId]/move), which can raise or lower the entry
// fee. `amount` is signed (toGame.entryFee - fromGame.entryFee); this is a
// lightweight log for the Finance page, not a payment ledger -- it never
// touches a game entry's `paid`, and collecting/refunding the difference is
// a manual admin step same as cash payments already are.
const FinancialAdjustmentSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["game_move"],
      required: true,
      default: "game_move",
    },
    fromGameConfigId: { type: Schema.Types.ObjectId, required: true },
    toGameConfigId: { type: Schema.Types.ObjectId, required: true },
    amount: { type: Number, required: true },
    reason: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const RegistrationSchema = new Schema(
  {
    tournament: {
      type: Schema.Types.ObjectId,
      ref: "Tournament",
      required: true,
    },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true }, // captain or solo player
    gameEntries: { type: [GameEntrySchema], default: [] },
    // Derived convenience flag -- true once every entry is removed/cancelled.
    // Kept at this level (rather than requiring every caller to scan
    // gameEntries) for the cheap "is this player out of the tournament
    // entirely" checks the self-serve registration flow needs. Recomputed
    // wherever an entry's removed/cancelled state changes.
    cancelled: { type: Boolean, default: false },
    cancelledAt: { type: Date },
    financialAdjustments: { type: [FinancialAdjustmentSchema], default: [] },
  },
  { timestamps: true }
);

export const Registration =
  models.Registration || model("Registration", RegistrationSchema);
