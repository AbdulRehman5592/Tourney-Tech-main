import { connectDB } from "../src/lib/mongoose.js";
import { Team } from "../src/models/Team.js";
import { Tournament } from "../src/models/Tournament.js";
import { User } from "../src/models/User.js";

const isDryRun = process.argv.includes("--dry-run");

// A team is orphaned when the tournament it belongs to no longer exists, or
// when none of its members exist anymore (e.g. leftover from a deleted test
// tournament whose auto-generated player accounts were also removed).
async function cleanupOrphanTeams() {
  await connectDB();

  const teams = await Team.find({}, { name: 1, tournament: 1, members: 1 }).lean();

  const tournamentIds = [...new Set(teams.map((t) => t.tournament?.toString()).filter(Boolean))];
  const memberIds = [...new Set(teams.flatMap((t) => (t.members || []).map((m) => m.toString())))];

  const existingTournaments = new Set(
    (await Tournament.find({ _id: { $in: tournamentIds } }, { _id: 1 }).lean()).map((t) => t._id.toString())
  );
  const existingUsers = new Set(
    (await User.find({ _id: { $in: memberIds } }, { _id: 1 }).lean()).map((u) => u._id.toString())
  );

  const orphanTeams = teams.filter((t) => {
    const tournamentMissing = !t.tournament || !existingTournaments.has(t.tournament.toString());
    const members = t.members || [];
    const allMembersMissing = members.length > 0 && members.every((m) => !existingUsers.has(m.toString()));
    return tournamentMissing || allMembersMissing;
  });

  if (!orphanTeams.length) {
    console.log("No orphaned teams found.");
    return;
  }

  if (isDryRun) {
    console.log(`[dry run] Would delete ${orphanTeams.length} orphaned team(s):`);
    console.log(orphanTeams.map((t) => `${t._id.toString()}  ${t.name}`).join("\n"));
    return;
  }

  const orphanIds = orphanTeams.map((t) => t._id);
  const result = await Team.deleteMany({ _id: { $in: orphanIds } });
  console.log(`Deleted ${result.deletedCount} orphaned team(s).`);
  console.log(orphanIds.map((id) => id.toString()).join("\n"));
}

cleanupOrphanTeams()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Cleanup failed:", error);
    process.exit(1);
  });
