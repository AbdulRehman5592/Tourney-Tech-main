import fs from "fs";
import path from "path";
import { connectDB } from "../src/lib/mongoose.js";
import { Registration } from "../src/models/Registration.js";

// Node-based stand-in for `mongodump` (not installed on this machine) --
// dumps every Registration document as-is (raw, pre-migration shape) to a
// timestamped local JSON file, so migrate-game-registration-entries.js has
// something to restore from by hand if it ever needs to.
async function backupRegistrations() {
  await connectDB();

  const registrations = await Registration.find({}).lean();

  const dir = path.join(process.cwd(), "scripts", "backups");
  fs.mkdirSync(dir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filePath = path.join(dir, `registrations-${timestamp}.json`);

  fs.writeFileSync(filePath, JSON.stringify(registrations, null, 2));

  console.log(`Backed up ${registrations.length} registration(s) to ${filePath}`);
}

backupRegistrations()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Backup failed:", error);
    process.exit(1);
  });
