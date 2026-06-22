// utils/mapMatches.js

export function mapMatches(matches) {
  return matches.map((m) => ({
    id: m._id,
    name: `Round ${m.round} Match`,
    nextMatchId: m.nextMatchId || null,
    tournamentRoundText: `Round ${m.round}`,
    startTime: m.createdAt || new Date().toISOString(),
    state: m.status === "completed" ? "DONE" : "SCHEDULED",
    participants: [
      {
        id: m.teamA?._id || "tbdA",
        name: m.teamA?.name || "TBD",
        resultText: String(m.teamAScore ?? ""),
        isWinner:
          m.winner?.toString() === m.teamA?._id?.toString(),
      },
      {
        id: m.teamB?._id || "tbdB",
        name: m.teamB?.name || "TBD",
        resultText: String(m.teamBScore ?? ""),
        isWinner:
          m.winner?.toString() === m.teamB?._id?.toString(),
      },
    ],
  }));
}
