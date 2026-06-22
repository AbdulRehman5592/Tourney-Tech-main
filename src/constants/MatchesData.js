
export const rawMatches = [
  // Round 1
  {
    id: 1,
    name: "Quarterfinal 1",
    nextMatchId: 5,
    startTime: "2025-07-24",
    tournamentRoundText: "Round 1",
    winnerId: "1a", // Alpha won
    participants: [
      { id: "1a", name: "Team Alpha" },
      { id: "1b", name: "Team Bravo" },
    ],
  },
  {
    id: 2,
    name: "Quarterfinal 2",
    nextMatchId: 5,
    startTime: "2025-07-24",
    tournamentRoundText: "Round 1",
    winnerId: "2b", // Delta won
    participants: [
      { id: "2a", name: "Team Charlie" },
      { id: "2b", name: "Team Delta" },
    ],
  },
  {
    id: 3,
    name: "Quarterfinal 3",
    nextMatchId: 6,
    startTime: "2025-07-24",
    tournamentRoundText: "Round 1",
    winnerId: "3a", // Echo won
    participants: [
      { id: "3a", name: "Team Echo" },
      { id: "3b", name: "Team Foxtrot" },
    ],
  },
  {
    id: 4,
    name: "Quarterfinal 4",
    nextMatchId: 6,
    startTime: "2025-07-24",
    tournamentRoundText: "Round 1",
    winnerId: "4b", // Hotel won
    participants: [
      { id: "4a", name: "Team Golf" },
      { id: "4b", name: "Team Hotel" },
    ],
  },

  // Round 2
  {
    id: 5,
    name: "Semifinal 1",
    nextMatchId: 7,
    startTime: "2025-07-25",
    tournamentRoundText: "Round 2",
    winnerId: "5a", // Alpha won
    participants: [
      { id: "5a", name: "Team Alpha" }, // from Match 1
      { id: "5b", name: "Team Delta" }, // from Match 2
    ],
  },
  {
    id: 6,
    name: "Semifinal 2",
    nextMatchId: 7,
    startTime: "2025-07-25",
    tournamentRoundText: "Round 2",
    winnerId: "6b", // Hotel won
    participants: [
      { id: "6a", name: "Team Echo" },  // from Match 3
      { id: "6b", name: "Team Hotel" }, // from Match 4
    ],
  },

  // Final
  {
    id: 7,
    name: "Final",
    nextMatchId: null,
    startTime: "2025-07-26",
    tournamentRoundText: "Final",
    winnerId: "7a", // ✅ Team Alpha is the champion
    participants: [
      { id: "7a", name: "Team Alpha" }, // from Semifinal 1
      { id: "7b", name: "Team Hotel" }, // from Semifinal 2
    ],
  },
];