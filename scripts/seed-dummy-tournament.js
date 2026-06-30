import { connectDB } from "../src/lib/mongoose.js";
import { Game } from "../src/models/Game.js";
import { Tournament } from "../src/models/Tournament.js";
import { Team } from "../src/models/Team.js";
import { User } from "../src/models/User.js";
import { Registration } from "../src/models/Registration.js";

const tournamentName = "Dummy Tournament";
const gameName = "Dummy Doubles Game";

async function seedDummyTournament() {
  await connectDB();

  const oldDummyUsers = await User.find(
    { email: { $regex: /^dummy\d+@example\.com$/i } },
    { _id: 1 }
  );
  const oldDummyUserIds = oldDummyUsers.map((user) => user._id);

  const existingTournament = await Tournament.findOne({ name: tournamentName });
  if (existingTournament) {
    await Registration.deleteMany({ tournament: existingTournament._id });
  }

  if (oldDummyUserIds.length) {
    await Registration.deleteMany({ user: { $in: oldDummyUserIds } });
  }

  await User.deleteMany({ email: { $regex: /^dummy\d+@example\.com$/i } });
  await Team.deleteMany({ name: { $regex: /^Dummy Team \d{2}$/ } });
  await Tournament.deleteMany({ name: tournamentName });
  await Game.deleteMany({ name: gameName });

  const game = await Game.create({
    name: gameName,
    platform: "Local",
    description: "Dummy doubles game for local tournament testing",
    rulesUrl: "",
    icon: "🎮",
  });

  const tournament = await Tournament.create({
    name: tournamentName,
    description: "Dummy tournament seeded locally for testing tournament play flow",
    location: "Local Test Arena",
    startDate: new Date(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    isPublic: true,
    status: "ongoing",
    games: [
      {
        game: game._id,
        entryFee: 10,
        format: "double_elimination",
        teamBased: true,
        tournamentTeamType: "double_player",
        rounds: 3,
      },
    ],
    staff: [],
  });

  const users = [];
  for (let i = 1; i <= 30; i += 1) {
    const user = await User.create({
      firstname: "Dummy",
      lastname: `${i}`,
      email: `dummy${i}@example.com`,
      username: `dummy${i}`,
      password: "Password123!",
      city: "Test City",
      stateCode: "TX",
      dob: "01/01",
      phone: `${1000000000 + i}`,
      gender: i % 2 === 0 ? "male" : "female",
      club: "None",
      subCity: "Test Sub City",
      role: "player",
      isVerified: true,
    });
    users.push(user);
  }

  const shuffled = [...users].sort(() => Math.random() - 0.5);
  const teams = [];

  for (let i = 0; i < 15; i += 1) {
    const first = shuffled[i * 2];
    const second = shuffled[i * 2 + 1];

    const team = await Team.create({
      name: `Dummy Team ${String(i + 1).padStart(2, "0")}`,
      createdBy: first._id,
      tournament: tournament._id,
      game: game._id,
      members: [first._id, second._id],
      partner: second._id,
      serialNo: String(i + 1).padStart(2, "0"),
    });

    teams.push(team);
  }

  const registrations = [];
  for (const team of teams) {
    for (const memberId of team.members) {
      const registration = await Registration.create({
        tournament: tournament._id,
        user: memberId,
        gameRegistrationDetails: {
          games: [game._id],
          team: team._id,
          status: "approved",
          paid: true,
          paymentMethod: "cash",
        },
      });
      registrations.push(registration);
    }
  }

  console.log("Seeded dummy tournament successfully.");
  console.log({
    tournamentId: tournament._id.toString(),
    gameId: game._id.toString(),
    usersCreated: users.length,
    teamsCreated: teams.length,
    registrationsCreated: registrations.length,
  });
}

seedDummyTournament()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
