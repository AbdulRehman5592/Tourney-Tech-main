import { connectDB } from "../src/lib/mongoose.js";
import { Tournament } from "../src/models/Tournament.js";

// Mirrors STANDINGS_ELIGIBLE_FORMATS in src/utils/server/tournamentBracket.js.
// Duplicated (not imported) because that module pulls in "@/..." path
// aliases that only resolve inside Next's bundler, not plain Node scripts.
const STANDINGS_ELIGIBLE_FORMATS = ["round_robin", "mesh", "standard"];

const isDryRun = process.argv.includes("--dry-run");

// One-time backfill for the new Tournament.nationallyRanked flag (staff now
// controls this per tournament, independent of format). Existing
// tournaments predate the field, so this sets it to whatever the old
// blanket rule would have given them -- true only if they already have a
// round_robin/mesh/standard game -- so no one's current ranking totals
// change until Tourney Techs Staff explicitly flips a tournament. New
// tournaments get this same default automatically going forward (see
// POST /api/tournaments); this script is only for tournaments already in
// the database.
async function backfillNationallyRanked() {
  await connectDB();

  const tournaments = await Tournament.find(
    { nationallyRanked: { $exists: false } },
    { games: 1 }
  ).lean();

  if (!tournaments.length) {
    console.log("No tournaments need backfilling -- all already have nationallyRanked set.");
    return;
  }

  const toRank = [];
  const toUnrank = [];
  for (const t of tournaments) {
    const qualifies = (t.games || []).some((g) => STANDINGS_ELIGIBLE_FORMATS.includes(g.format));
    (qualifies ? toRank : toUnrank).push(t._id);
  }

  if (isDryRun) {
    console.log(`[dry run] Would set nationallyRanked=true on ${toRank.length} tournament(s):`);
    console.log(toRank.map((id) => id.toString()));
    console.log(`[dry run] Would set nationallyRanked=false on ${toUnrank.length} tournament(s):`);
    console.log(toUnrank.map((id) => id.toString()));
    return;
  }

  if (toRank.length) {
    await Tournament.updateMany({ _id: { $in: toRank } }, { $set: { nationallyRanked: true } });
  }
  if (toUnrank.length) {
    await Tournament.updateMany({ _id: { $in: toUnrank } }, { $set: { nationallyRanked: false } });
  }

  console.log(`Set nationallyRanked=true on ${toRank.length} tournament(s).`);
  console.log(`Set nationallyRanked=false on ${toUnrank.length} tournament(s).`);
}

backfillNationallyRanked()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Backfill failed:", error);
    process.exit(1);
  });
