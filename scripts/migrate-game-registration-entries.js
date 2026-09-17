import { ObjectId } from "mongodb";
import { connectDB } from "../src/lib/mongoose.js";
import { Registration } from "../src/models/Registration.js";
import { Tournament } from "../src/models/Tournament.js";

const isDryRun = process.argv.includes("--dry-run");

// One-time migration: converts each Registration's old bundled
// `gameRegistrationDetails` (one shared status/paid/team object with
// parallel games[]/gameConfigIds[] arrays) into the new `gameEntries` array
// of independently-addressable per-game subdocuments. Every resulting entry
// starts out carrying the OLD shared status/paid/team/payment info as its
// initial value -- the best available approximation of history, since the
// old schema never tracked per-game state to begin with.
//
// A partially-dropped game under the old schema (cancel/route.js's
// "some games still registered" path) was silently removed from the
// games[]/gameConfigIds[] arrays with no trace -- that history genuinely
// isn't recoverable, so this migration only sees what's still in the data.
async function migrate() {
  await connectDB();

  const raw = Registration.collection; // bypass the (already-updated) Mongoose schema entirely
  const docs = await raw.find({}).toArray();

  const tournaments = await Tournament.find({}).select("games").lean();
  const tournamentById = new Map(tournaments.map((t) => [t._id.toString(), t]));

  const entryFee = (tournamentId, gameConfigId) => {
    const tournament = tournamentById.get(tournamentId?.toString());
    const slot = tournament?.games?.find((g) => String(g._id) === String(gameConfigId));
    return slot?.entryFee || 0;
  };

  let migrated = 0;
  let skippedAlready = 0;
  let skippedEmpty = 0;
  const failed = [];

  for (const doc of docs) {
    if (Array.isArray(doc.gameEntries) && !doc.gameRegistrationDetails) {
      skippedAlready += 1;
      continue;
    }

    const old = doc.gameRegistrationDetails;
    if (!old || !Array.isArray(old.games) || old.games.length === 0) {
      skippedEmpty += 1;
      continue;
    }

    // Pre-gameConfigIds-era documents (older than the multi-schedule-per-
    // game feature) only recorded the catalog game id, not which scheduled
    // instance. Recover it by matching the catalog game id to the
    // tournament's current games[] -- unambiguous as long as that catalog
    // game was only ever scheduled once in this tournament (true for every
    // real case found in production data as of this migration).
    let gameConfigIds = old.gameConfigIds;
    if (!Array.isArray(gameConfigIds) || gameConfigIds.length !== old.games.length) {
      const tournament = tournamentById.get(doc.tournament?.toString());
      gameConfigIds = old.games.map((catalogGameId) => {
        const matches = (tournament?.games || []).filter(
          (g) => String(g.game) === String(catalogGameId)
        );
        return matches.length === 1 ? matches[0]._id : null;
      });
    }

    const wasCancelled = doc.cancelled === true;

    const gameEntries = gameConfigIds.map((gameConfigId, i) => ({
      // Written via the raw driver below, which skips Mongoose's normal
      // subdocument _id auto-assignment -- assign one explicitly so every
      // entry is addressable by the game-entries/[entryId] API routes.
      _id: new ObjectId(),
      game: old.games?.[i] ?? null,
      gameConfigId,
      team: old.team ?? null,
      status: old.status || "pending",
      paid: old.paid === true,
      paymentMethod: old.paymentMethod || "cash",
      paymentDetails: old.paymentDetails || null,
      adminNote: old.adminNote || "",
      verifiedBy: old.verifiedBy ?? null,
      verifiedAt: old.verifiedAt ?? null,
      removed: false,
      removedAt: null,
      removedReason: "",
      cancelled: wasCancelled,
      cancelledAt: wasCancelled ? doc.cancelledAt ?? null : null,
      refundStatus: wasCancelled ? doc.refundStatus || "not_applicable" : "not_applicable",
      refundNote: wasCancelled ? doc.refundNote ?? null : null,
      createdAt: doc.createdAt ?? new Date(),
      updatedAt: doc.updatedAt ?? new Date(),
    }));

    // Verification pass -- never write a document that fails this.
    const unresolvedCount = gameConfigIds.filter((id) => !id).length;
    const expectedIds = gameConfigIds.map((id) => (id ? String(id) : null));
    const actualIds = gameEntries.map((e) => (e.gameConfigId ? String(e.gameConfigId) : null));
    const idsMatch =
      expectedIds.length === actualIds.length &&
      expectedIds.every((id, i) => id === actualIds[i]);

    const expectedFeeSum = gameConfigIds.reduce(
      (sum, gid) => sum + (gid ? entryFee(doc.tournament, gid) : 0),
      0
    );
    const actualFeeSum = gameEntries.reduce(
      (sum, e) => sum + (e.gameConfigId ? entryFee(doc.tournament, e.gameConfigId) : 0),
      0
    );

    if (unresolvedCount > 0 || !idsMatch || expectedFeeSum !== actualFeeSum || gameEntries.length !== old.games.length) {
      failed.push({
        _id: doc._id.toString(),
        reason:
          unresolvedCount > 0
            ? `could not resolve gameConfigId for ${unresolvedCount} game(s) -- ambiguous or missing catalog game in tournament.games[]`
            : !idsMatch
              ? "gameConfigId set mismatch"
              : expectedFeeSum !== actualFeeSum
                ? `fee sum mismatch (expected ${expectedFeeSum}, got ${actualFeeSum})`
                : "entry count mismatch",
      });
      continue;
    }

    if (isDryRun) {
      migrated += 1;
      continue;
    }

    await raw.updateOne(
      { _id: doc._id },
      {
        $set: { gameEntries, cancelled: wasCancelled, cancelledAt: wasCancelled ? doc.cancelledAt ?? null : null },
        $unset: { gameRegistrationDetails: "", refundStatus: "", refundNote: "" },
      }
    );
    migrated += 1;
  }

  console.log(`${isDryRun ? "[dry run] " : ""}Migration report:`);
  console.log(`  Total registrations scanned: ${docs.length}`);
  console.log(`  Migrated: ${migrated}`);
  console.log(`  Already migrated (skipped): ${skippedAlready}`);
  console.log(`  Empty/no games (skipped): ${skippedEmpty}`);
  console.log(`  Failed verification (left untouched): ${failed.length}`);
  if (failed.length) {
    console.log(JSON.stringify(failed, null, 2));
  }
}

migrate()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });
