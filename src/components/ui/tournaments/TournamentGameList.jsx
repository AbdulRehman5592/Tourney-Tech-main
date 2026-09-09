"use client";

import GameScheduleBadge from "./GameScheduleBadge";
import { compareByScheduledAt } from "@/utils/gameSchedule";

// Small tag showing whether the viewing player registered for this specific
// game, and if so, whether their registration is still awaiting admin
// approval. Registration approval is one status for the whole submission
// (not tracked per game), so every game the player registered for shares it.
function RegistrationTag({ registered, paymentStatus }) {
  if (!registered) {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full border border-[var(--border-color)] text-gray-500">
        Not registered
      </span>
    );
  }
  const pending = paymentStatus === "pending";
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full font-semibold text-white"
      style={{
        backgroundColor: pending ? "var(--warning-color)" : "var(--success-color)",
      }}
    >
      {pending ? "Registered • Pending Approval" : "Registered • Approved"}
    </span>
  );
}

export default function TournamentGameList({ games, registeredGameConfigIds, paymentStatus }) {
  // Scheduled games first, earliest to latest; anything still TBA sinks to the
  // bottom so the next thing being played is always the first thing read.
  const orderedGames = [...games].sort(compareByScheduledAt);
  // null/undefined means "not a player view" (e.g. staff) -- don't show tags
  // at all in that case, only when we actually know what was registered.
  const showRegistrationTags = Array.isArray(registeredGameConfigIds);

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
            {showRegistrationTags && (
              <RegistrationTag
                registered={registeredGameConfigIds.includes(g._id?.toString())}
                paymentStatus={paymentStatus}
              />
            )}
            <GameScheduleBadge value={g.scheduledAt} className="ml-auto" />
          </li>
        ))}
      </ul>
    </div>
  );
}
