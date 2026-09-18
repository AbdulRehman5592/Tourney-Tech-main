"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";
import {
  Award,
  CircleDollarSign,
  MapPin,
  Repeat,
  Trophy,
  Users,
} from "lucide-react";
import api from "@/utils/axios";
import GameScheduleBadge from "@/components/ui/tournaments/GameScheduleBadge";
import { compareByScheduledAt } from "@/utils/gameSchedule";
import { useWorkspaceTournament } from "./layout";

const STATUS_STYLE = {
  upcoming: { label: "Upcoming", bg: "color-mix(in srgb, var(--accent-color) 18%, transparent)", color: "var(--accent-color)" },
  ongoing: { label: "Ongoing", bg: "color-mix(in srgb, var(--success-color) 18%, transparent)", color: "var(--success-color)" },
  completed: { label: "Completed", bg: "color-mix(in srgb, var(--muted-foreground) 18%, transparent)", color: "var(--muted-foreground)" },
  cancelled: { label: "Cancelled", bg: "color-mix(in srgb, var(--error-color) 18%, transparent)", color: "var(--error-color)" },
};

const FORMAT_LABEL = {
  round_robin: "Round Robin",
  mesh: "Mesh (Table Rotation)",
  standard: "Standard Rotation",
  single_elimination: "Single Elimination",
  double_elimination: "Double Elimination",
};

// A distinct hue per format so the cards read as visually varied at a
// glance, not just five identical boxes with different text.
const FORMAT_HUE = {
  round_robin: 210, // blue
  mesh: 265, // violet
  standard: 172, // teal
  single_elimination: 28, // orange
  double_elimination: 330, // pink
};

function roundsLabel(game) {
  if (game.format === "mesh") {
    return game.meshRounds ? `${game.meshRounds} round${game.meshRounds === 1 ? "" : "s"}` : null;
  }
  if (game.format === "standard") {
    const direction = game.standardDirection === "down" ? "Down rotation" : "Up rotation";
    return game.standardRounds
      ? `${game.standardRounds} round${game.standardRounds === 1 ? "" : "s"} · ${direction}`
      : `Indefinite · ${direction}`;
  }
  return null;
}

function DetailRow({ icon: Icon, label, value, hue = 210, wide = false }) {
  return (
    <div className={`flex items-start gap-2.5 ${wide ? "col-span-2" : ""}`}>
      <span
        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg"
        style={{ background: `hsl(${hue} 70% 50% / 0.16)` }}
      >
        <Icon size={13} style={{ color: `hsl(${hue} 70% 60%)` }} />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-xs font-medium leading-snug text-[var(--foreground)]">{value}</p>
      </div>
    </div>
  );
}

export default function TournamentOverviewTab() {
  const { tournament, refetch } = useWorkspaceTournament();
  const games = tournament.games || [];
  const [savingId, setSavingId] = useState(null);

  const handleStatusChange = async (game, status) => {
    setSavingId(game._id);
    try {
      await api.patch(`/api/tournaments/${tournament._id}/games/${game._id}`, { status });
      toast.success("Game status updated");
      await refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update game status");
    } finally {
      setSavingId(null);
    }
  };

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
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[...games].sort(compareByScheduledAt).map((game, index) => {
            const statusStyle = STATUS_STYLE[game.status] || STATUS_STYLE.upcoming;
            const rounds = roundsLabel(game);
            const isDoubles = game.doublesEnabled || game.mixedDoublesEnabled;
            const hue = FORMAT_HUE[game.format] ?? 210;

            return (
              <div
                key={game._id || index}
                className="group relative flex flex-col overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--card-background)] shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                style={{ borderTopColor: `hsl(${hue} 70% 50%)`, borderTopWidth: 3 }}
              >
                {/* Ambient tint so each format-colored card reads distinctly */}
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-24 opacity-[0.08]"
                  style={{ background: `linear-gradient(180deg, hsl(${hue} 80% 55%), transparent)` }}
                />

                <div className="relative flex flex-col gap-4 p-5">
                  {/* Header: title + editable status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Game {index + 1}
                      </p>
                      <p className="truncate text-base font-bold text-[var(--foreground)]">
                        {game.eventTitle || game.game?.name || "Unnamed Game"}
                      </p>
                    </div>
                    <select
                      value={game.status || "upcoming"}
                      disabled={savingId === game._id}
                      onChange={(e) => handleStatusChange(game, e.target.value)}
                      className="shrink-0 cursor-pointer rounded-full px-3 py-1 text-xs font-semibold disabled:opacity-50"
                      style={{ background: statusStyle.bg, color: statusStyle.color, border: "none" }}
                    >
                      {Object.entries(STATUS_STYLE).map(([value, s]) => (
                        <option key={value} value={value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Fee, prominent */}
                  <div className="flex items-baseline gap-2 rounded-2xl bg-[var(--background)] px-3 py-2.5">
                    <CircleDollarSign size={16} className="shrink-0 text-[var(--accent-color)]" />
                    <span className="text-xl font-bold text-[var(--foreground)]">${game.entryFee ?? 0}</span>
                    <span className="text-[11px] text-muted-foreground">entry fee</span>
                    {game.lateFee > 0 && (
                      <span className="ml-auto text-[11px] text-muted-foreground">
                        +${game.lateFee} late
                        {game.earlyRegistrationCutoff &&
                          ` after ${new Date(game.earlyRegistrationCutoff).toLocaleDateString()}`}
                      </span>
                    )}
                  </div>

                  {/* Detail grid */}
                  <div className="grid grid-cols-2 gap-x-3 gap-y-3">
                    <DetailRow icon={Users} label="Players" hue={hue}
                      value={game.tournamentTeamType === "double_player" ? "Double player" : "Single player"} />
                    <DetailRow icon={Repeat} label="Format" hue={hue}
                      value={FORMAT_LABEL[game.format] || game.format} />
                    {rounds && <DetailRow icon={Repeat} label="Rounds" hue={hue} value={rounds} />}
                    {game.playoffEnabled && (
                      <DetailRow
                        icon={Trophy}
                        label="Playoff"
                        hue={hue}
                        wide
                        value={`Top ${game.playoffQualifiersCount ?? "TBD"} → ${FORMAT_LABEL[game.playoffFormat] || game.playoffFormat}`}
                      />
                    )}
                    {isDoubles && (
                      <DetailRow
                        icon={Award}
                        label={game.doublesEnabled && game.mixedDoublesEnabled ? "Side-pots" : game.doublesEnabled ? "Doubles" : "Mixed Doubles"}
                        hue={hue}
                        value={
                          game.doublesEnabled && game.mixedDoublesEnabled
                            ? `$${game.doublesCost ?? 0} / $${game.mixedDoublesCost ?? 0}`
                            : `$${(game.doublesEnabled ? game.doublesCost : game.mixedDoublesCost) ?? 0}`
                        }
                      />
                    )}
                    {game.locations?.length > 0 && (
                      <DetailRow icon={MapPin} label="Location" hue={hue} value={game.locations.join(", ")} />
                    )}
                  </div>

                  <GameScheduleBadge value={game.scheduledAt} variant="stacked" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
