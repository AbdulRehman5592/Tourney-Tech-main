"use client";

import GameScheduleBadge from "@/components/ui/tournaments/GameScheduleBadge";
import { compareByScheduledAt } from "@/utils/gameSchedule";
import { useWorkspaceTournament } from "./layout";

export default function TournamentOverviewTab() {
  const { tournament } = useWorkspaceTournament();
  const games = tournament.games || [];

  return (
    <div>
      <h2 className="mb-3 text-sm font-medium text-foreground">
        Games &amp; Schedule <span className="text-muted-foreground">({games.length})</span>
      </h2>

      {games.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--background)] p-4 text-sm text-muted-foreground">
          No games have been added to this tournament yet.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...games].sort(compareByScheduledAt).map((game, index) => (
            <div
              key={game._id || index}
              className="rounded-2xl border border-[var(--border-color)] bg-[var(--card-background)] p-4"
            >
              <p className="font-semibold text-[var(--foreground)]">
                <span className="text-muted-foreground">Game {index + 1}:</span>{" "}
                {game.eventTitle || game.game?.name || "Unnamed Game"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                ${game.entryFee ?? 0} &bull;{" "}
                {game.tournamentTeamType === "double_player" ? "Double player" : "Single player"}
              </p>
              <GameScheduleBadge value={game.scheduledAt} variant="stacked" className="mt-3" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
