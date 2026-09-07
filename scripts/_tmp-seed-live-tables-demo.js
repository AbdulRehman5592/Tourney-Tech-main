import { connectDB } from "../src/lib/mongoose.js";
import { Game } from "../src/models/Game.js";
import { Tournament } from "../src/models/Tournament.js";
import { Team } from "../src/models/Team.js";
import { User } from "../src/models/User.js";
import { Registration } from "../src/models/Registration.js";
import { Match } from "../src/models/Match.js";

const TOURNAMENT_NAME = "Live Tables Demo";

async function main() {
  await connectDB();

  // Clean any previous run of this exact demo first (idempotent re-runs).
  const existing = await Tournament.findOne({ name: TOURNAMENT_NAME });
  if (existing) {
    await Match.deleteMany({ tournament: existing._id });
    await Registration.deleteMany({ tournament: existing._id });
    await Team.deleteMany({ tournament: existing._id });
    await Tournament.deleteOne({ _id: existing._id });
  }
  await User.deleteMany({ email: { $regex: /^demoplayer\d+@example\.com$/i } });

  const game = (await Game.findOne()) || (await Game.create({
    name: "Bid Whist",
    platform: "Local",
    description: "Demo game",
    rulesUrl: "",
    icon: "🃏",
  }));

  const tournament = await Tournament.create({
    name: TOURNAMENT_NAME,
    description: "Temporary demo data so the Live Table Overview screen can be seen populated. Safe to delete.",
    location: "Demo Hall",
    startDate: new Date(),
    endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    isPublic: true,
    status: "ongoing",
    approvalStatus: "approved",
    games: [
      {
        game: game._id,
        entryFee: 25,
        eventTitle: "Saturday Showdown",
        format: "single_elimination",
        teamBased: true,
        tournamentTeamType: "double_player",
        scheduledAt: new Date(),
      },
    ],
    staff: [],
  });

  const gameConfigId = tournament.games[0]._id;

  const users = [];
  for (let i = 1; i <= 16; i += 1) {
    const user = await User.create({
      firstname: "Demo",
      lastname: `Player ${i}`,
      email: `demoplayer${i}@example.com`,
      username: `demoplayer${i}`,
      password: "Password123!",
      city: "Demo City",
      stateCode: "TX",
      dob: "01/01",
      phone: `${2000000000 + i}`,
      gender: i % 2 === 0 ? "male" : "female",
      club: "None",
      subCity: "Demo Sub City",
      role: "player",
      isVerified: true,
    });
    users.push(user);
  }

  const teamNames = [
    "Card Sharks", "Table Titans", "Bid Busters", "Kitty Crushers",
    "Ace Hunters", "Trump Kings", "Boston Legends", "Whist Wizards",
  ];

  const teams = [];
  for (let i = 0; i < 8; i += 1) {
    const first = users[i * 2];
    const second = users[i * 2 + 1];
    const team = await Team.create({
      name: teamNames[i],
      createdBy: first._id,
      tournament: tournament._id,
      game: game._id,
      gameConfigId,
      members: [first._id, second._id],
      partner: second._id,
      serialNo: String(i + 1).padStart(2, "0"),
      checkedIn: true,
      checkedInAt: new Date(),
    });
    teams.push(team);

    for (const memberId of [first._id, second._id]) {
      await Registration.create({
        tournament: tournament._id,
        user: memberId,
        gameRegistrationDetails: {
          games: [game._id],
          gameConfigIds: [gameConfigId],
          team: team._id,
          status: "approved",
          paid: true,
          paymentMethod: "cash",
        },
      });
    }
  }

  // Hand-built round 1 of an 8-team single-elimination bracket (4 tables).
  // Round 2/3 placeholder matches are deliberately skipped for this demo --
  // they'd have no teams yet (TBD vs TBD) and would just look like empty
  // tables, which isn't the point of a "here's what a live table looks like"
  // demo. This mirrors exactly what the real bracket generator would create
  // for round 1: teamA/teamB, a table number, stage "round1", pending status.
  const created = [];
  for (let i = 0; i < 4; i += 1) {
    const match = await Match.create({
      tournament: tournament._id,
      game: game._id,
      gameConfigId,
      matchNumber: i + 1,
      teamA: teams[i * 2]._id,
      teamB: teams[i * 2 + 1]._id,
      round: 1,
      slot: i + 1,
      tableNumber: i + 1,
      stage: "round1",
      isBye: false,
      status: "pending",
    });
    created.push(match);
  }

  console.log("Seeded Live Tables demo data.");
  console.log({
    tournamentId: tournament._id.toString(),
    tournamentName: tournament.name,
    gameConfigId: gameConfigId.toString(),
    teamsCreated: teams.length,
    matchesCreated: created.length,
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
