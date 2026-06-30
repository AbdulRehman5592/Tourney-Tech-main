import { connectDB } from "../src/lib/mongoose.js";
import { User } from "../src/models/User.js";
import { Team } from "../src/models/Team.js";
import { Tournament } from "../src/models/Tournament.js";
import { Registration } from "../src/models/Registration.js";

(async () => {
  try {
    await connectDB();
    const tournament = await Tournament.findOne({ name: "Dummy Tournament" }).lean();
    const users = await User.find({ email: { $regex: /^dummy\\d+@example\\.com$/i } }).lean();
    const teams = await Team.find({ name: { $regex: /^Dummy Team \\d{2}$/ } }).lean();
    const registrations = await Registration.find({ tournament: tournament?._id }).lean();
    const registrationsByUser = registrations.reduce((acc, reg) => {
      const userId = reg.user?.toString();
      if (userId) acc.add(userId);
      return acc;
    }, new Set());

    console.log("tournament", !!tournament, tournament?._id?.toString());
    console.log("users", users.length);
    if (users.length) console.log("firstUser", users[0]._id.toString(), users[0].email);
    console.log("teams", teams.length);
    if (teams.length) console.log("firstTeam", teams[0]._id.toString(), teams[0].members.map(m => m.toString()));
    console.log("registrations for tournament", registrations.length);
    console.log("distinct registration users", registrationsByUser.size);
    if (registrations.length) {
      const firstReg = registrations[0];
      console.log("firstReg", {
        user: firstReg.user?.toString() || null,
        tournament: firstReg.tournament?.toString() || null,
        games: (firstReg.gameRegistrationDetails?.games || []).map((g) =>
          g?.toString ? g.toString() : String(g)
        ),
        team: firstReg.gameRegistrationDetails?.team?.toString() || null,
        status: firstReg.gameRegistrationDetails?.status || null,
      });
    }
    const dummyUsers = await User.find({ email: /dummy/i }).lean();
    console.log("dummy users by regex /dummy/i", dummyUsers.length);
    const dummyTeams = await Team.find({ name: /Dummy Team/i }).lean();
    console.log("dummy teams by regex /Dummy Team/i", dummyTeams.length);
  } catch (err) {
    console.error("Script error", err);
  } finally {
    process.exit(0);
  }
})();
