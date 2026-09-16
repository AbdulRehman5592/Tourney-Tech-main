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
  const bg =
    paymentStatus === "pending"
      ? "var(--warning-color)"
      : paymentStatus === "rejected"
        ? "var(--error-color)"
        : "var(--success-color)";
  const label =
    paymentStatus === "pending"
      ? "Registered • Pending Approval"
      : paymentStatus === "rejected"
        ? "Registered • Rejected"
        : "Registered • Approved";
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full font-semibold text-white"
      style={{ backgroundColor: bg }}
    >
      {label}
    </span>
  );
}

export default function TournamentGameList({
  games,
  registeredGameConfigIds,
  paymentStatus,
  // (gameConfigId, gameLabel) => void -- provided only when this player can
  // cancel individual games right now (upcoming tournament, not already
  // fully cancelled). Omit/null to hide the per-game cancel link entirely.
  onCancelGame,
  // Which of this player's registered games their team has already checked
  // into (Tournament.games[]._id strings) -- null/undefined when not a
  // player view, same convention as registeredGameConfigIds.
  checkedInGameConfigIds,
  // (gameConfigId, gameLabel) => void -- provided only when this player can
  // self check-in right now. Each game row still gates on that game's own
  // `checkInOpen` flag (admin-controlled, per game) before showing the button.
  onCheckIn,
  // gameConfigId currently mid-request, so only that row's button disables.
  checkingInGameConfigId,
}) {
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
        {orderedGames.map((g, i) => {
          const label = g?.eventTitle || g?.game?.name || "Unknown Game";
          const gameConfigId = g._id?.toString();
          const registered = showRegistrationTags
            ? registeredGameConfigIds.includes(gameConfigId)
            : false;
          const checkedIn = Array.isArray(checkedInGameConfigIds)
            ? checkedInGameConfigIds.includes(gameConfigId)
            : false;
          const canCheckIn =
            registered && !checkedIn && g.checkInOpen && paymentStatus !== "rejected" && onCheckIn;
          return (
            <li
              key={g._id || i}
              className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border px-3 py-2"
              style={{
                borderColor: "var(--border-color)",
                backgroundColor: "var(--background)",
              }}
            >
              <strong>{label}</strong>
              <span className="text-gray-400">
                ${g.entryFee ?? "0"} •{" "}
                {g.teamBased
                  ? g.tournamentTeamType === "double_player"
                    ? "Team of 2 players"
                    : "Single player team"
                  : "Individual"}
              </span>
              {showRegistrationTags && (
                <RegistrationTag registered={registered} paymentStatus={paymentStatus} />
              )}
              {registered && checkedIn && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-semibold text-white"
                  style={{ backgroundColor: "var(--success-color)" }}
                >
                  ✓ Checked In
                </span>
              )}
              {canCheckIn && (
                <button
                  type="button"
                  onClick={() => onCheckIn(gameConfigId, label)}
                  disabled={checkingInGameConfigId === gameConfigId}
                  className="text-xs px-2 py-0.5 rounded-full font-semibold disabled:opacity-60"
                  style={{ backgroundColor: "var(--accent-color)", color: "var(--background)" }}
                >
                  {checkingInGameConfigId === gameConfigId ? "Checking In..." : "Check In"}
                </button>
              )}
              {registered && onCancelGame && (
                <button
                  type="button"
                  onClick={() => onCancelGame(gameConfigId, label)}
                  className="text-xs text-[var(--muted-foreground)] hover:text-[var(--error-color)] underline"
                >
                  Cancel
                </button>
              )}
              <GameScheduleBadge value={g.scheduledAt} className="ml-auto" />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
