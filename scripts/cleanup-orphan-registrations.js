import { connectDB } from "../src/lib/mongoose.js";
import { Registration } from "../src/models/Registration.js";
import { Tournament } from "../src/models/Tournament.js";
import { User } from "../src/models/User.js";

const isDryRun = process.argv.includes("--dry-run");

async function cleanupOrphanRegistrations() {
  await connectDB();

  const registrations = await Registration.find({}, { tournament: 1, user: 1 }).lean();

  const userIds = [...new Set(registrations.map((r) => r.user?.toString()).filter(Boolean))];
  const tournamentIds = [...new Set(registrations.map((r) => r.tournament?.toString()).filter(Boolean))];

  const existingUsers = new Set(
    (await User.find({ _id: { $in: userIds } }, { _id: 1 }).lean()).map((u) => u._id.toString())
  );
  const existingTournaments = new Set(
    (await Tournament.find({ _id: { $in: tournamentIds } }, { _id: 1 }).lean()).map((t) => t._id.toString())
  );

  const orphanIds = registrations
    .filter(
      (r) =>
        !r.user ||
        !r.tournament ||
        !existingUsers.has(r.user.toString()) ||
        !existingTournaments.has(r.tournament.toString())
    )
    .map((r) => r._id);

  if (!orphanIds.length) {
    console.log("No orphaned registrations found.");
    return;
  }

  if (isDryRun) {
    console.log(`[dry run] Would delete ${orphanIds.length} orphaned registration(s):`);
    console.log(orphanIds.map((id) => id.toString()));
    return;
  }

  const result = await Registration.deleteMany({ _id: { $in: orphanIds } });
  console.log(`Deleted ${result.deletedCount} orphaned registration(s).`);
  console.log(orphanIds.map((id) => id.toString()));
}

cleanupOrphanRegistrations()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Cleanup failed:", error);
    process.exit(1);
  });
