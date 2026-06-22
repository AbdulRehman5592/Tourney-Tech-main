"use client";

export default function TournamentGameList({ games }) {
  return (
    <div className="col-span-2">
      <p className="font-semibold">🎮 Games:</p>
      <ul className="list-disc ml-5 text-sm space-y-1">
        {games.map((g, i) => (
          <li key={g._id || i}>
            <strong>{g?.game?.name || "Unknown Game"}</strong> — {g.entryFee ?? "0"} •{" "}
            {g.teamBased
              ? g.tournamentTeamType === "double_player"
                ? "Team of 2 players"
                : "Single player team"
              : "Individual"}
          </li>
        ))}
      </ul>
    </div>
  );
}
