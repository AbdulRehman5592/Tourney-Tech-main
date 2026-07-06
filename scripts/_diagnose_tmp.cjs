const mongoose = require("mongoose");

const uri = process.env.MONGODB_URI;

async function main() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const email = "usmanqiass4@gmail.com";
  const user = await db.collection("users").findOne({ email });
  if (!user) {
    console.log("No user found with email", email);
    return;
  }
  console.log("USER:", { _id: user._id.toString(), email: user.email, role: user.role, username: user.username });

  const regs = await db.collection("registrations").find({ user: user._id }).toArray();
  console.log("\nREGISTRATIONS for this user:", regs.length);
  for (const r of regs) {
    console.log(JSON.stringify({
      _id: r._id,
      tournament: r.tournament,
      user: r.user,
      gameRegistrationDetails: r.gameRegistrationDetails,
    }, null, 2));
  }

  const teams = await db.collection("teams").find({ members: user._id }).toArray();
  console.log("\nTEAMS with this user as member:", teams.length);
  for (const t of teams) {
    console.log(JSON.stringify(t, null, 2));
  }

  const tournaments = await db.collection("tournaments").find({}).toArray();
  console.log("\nALL TOURNAMENTS (id, name, status):");
  for (const t of tournaments) {
    console.log(t._id.toString(), t.name, t.status, "games:", t.games?.length);
  }

  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
