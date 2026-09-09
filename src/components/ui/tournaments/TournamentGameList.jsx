"use client";

import GameScheduleBadge from "./GameScheduleBadge";
import { compareByScheduledAt } from "@/utils/gameSchedule";

export default function TournamentGameList({ games }) {
  // Scheduled games first, earliest to latest; anything still TBA sinks to the
  // bottom so the next thing being played is always the first thing read.
  const orderedGames = [...games].sort(compareByScheduledAt);

  return (
    <div className="col-span-2">
      <p className="font-semibold">🎮 Games:</p>
      <ul className="mt-2 space-y-2 text-sm">
        {orderedGames.map((g, i) => (
          <li
            key={g._id || i}
            className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border px-3 py-2"
            style={{
              borderColor: "var(--border-color)",
              backgroundColor: "var(--background)",
            }}
          >
            <strong>{g?.eventTitle || g?.game?.name || "Unknown Game"}</strong>
            <span className="text-gray-400">
              ${g.entryFee ?? "0"} •{" "}
              {g.teamBased
                ? g.tournamentTeamType === "double_player"
                  ? "Team of 2 players"
                  : "Single player team"
                : "Individual"}
            </span>
            <GameScheduleBadge value={g.scheduledAt} className="ml-auto" />
          </li>
        ))}
      </ul>
    </div>
  );
}
