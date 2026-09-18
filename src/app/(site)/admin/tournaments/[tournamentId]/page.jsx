"use client";

import {
  Award,
  CircleDollarSign,
  MapPin,
  Repeat,
  Trophy,
  Users,
} from "lucide-react";
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

// A distinct theme color per format (one of the app's 5 named accents) so
// the cards read as visually varied at a glance without introducing colors
// that clash with the rest of the dark UI.
const FORMAT_COLOR = {
  round_robin: "var(--info-color)",
  mesh: "var(--warning-color)",
  standard: "var(--success-color)",
  single_elimination: "var(--accent-color)",
  double_elimination: "var(--error-color)",
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

function DetailRow({ icon: Icon, label, value, color = "var(--info-color)", wide = false }) {
  return (
    <div className={`flex items-start gap-2.5 ${wide ? "col-span-2" : ""}`}>
      <span
        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border"
        style={{
          background: `color-mix(in srgb, ${color} 22%, var(--card-background))`,
          borderColor: `color-mix(in srgb, ${color} 45%, transparent)`,
        }}
      >
        <Icon size={14} strokeWidth={2.25} style={{ color }} />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-xs font-medium leading-snug text-[var(--foreground)]">{value}</p>
      </div>
    </div>
  );
}

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
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[...games].sort(compareByScheduledAt).map((game, index) => {
            const statusStyle = STATUS_STYLE[game.status] || STATUS_STYLE.upcoming;
            const rounds = roundsLabel(game);
            const isDoubles = game.doublesEnabled || game.mixedDoublesEnabled;
            const formatColor = FORMAT_COLOR[game.format] || "var(--info-color)";

            return (
              <div
                key={game._id || index}
                className="group relative flex flex-col overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--card-background)] shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                style={{ borderTopColor: formatColor, borderTopWidth: 3 }}
              >
                {/* Ambient tint so each format-colored card reads distinctly */}
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-24 opacity-[0.12]"
                  style={{ background: `linear-gradient(180deg, ${formatColor}, transparent)` }}
                />

                <div className="relative flex flex-col gap-4 p-5">
                  {/* Header: title + status (read-only here -- set from the
                      Create/Edit Tournament form, the actual source of truth) */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Game {index + 1}
                      </p>
                      <p className="truncate text-base font-bold text-[var(--foreground)]">
                        {game.eventTitle || game.game?.name || "Unnamed Game"}
                      </p>
                    </div>
                    <span
                      className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold"
                      style={{ background: statusStyle.bg, color: statusStyle.color }}
                    >
                      {statusStyle.label}
                    </span>
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
                    <DetailRow icon={Users} label="Players" color={formatColor}
                      value={game.tournamentTeamType === "double_player" ? "Double player" : "Single player"} />
                    <DetailRow icon={Repeat} label="Format" color={formatColor}
                      value={FORMAT_LABEL[game.format] || game.format} />
                    {rounds && <DetailRow icon={Repeat} label="Rounds" color={formatColor} value={rounds} />}
                    {game.playoffEnabled && (
                      <DetailRow
                        icon={Trophy}
                        label="Playoff"
                        color={formatColor}
                        wide
                        value={`Top ${game.playoffQualifiersCount ?? "TBD"} → ${FORMAT_LABEL[game.playoffFormat] || game.playoffFormat}`}
                      />
                    )}
                    {isDoubles && (
                      <DetailRow
                        icon={Award}
                        label={game.doublesEnabled && game.mixedDoublesEnabled ? "Side-pots" : game.doublesEnabled ? "Doubles" : "Mixed Doubles"}
                        color={formatColor}
                        value={
                          game.doublesEnabled && game.mixedDoublesEnabled
                            ? `$${game.doublesCost ?? 0} / $${game.mixedDoublesCost ?? 0}`
                            : `$${(game.doublesEnabled ? game.doublesCost : game.mixedDoublesCost) ?? 0}`
                        }
                      />
                    )}
                    {game.locations?.length > 0 && (
                      <DetailRow icon={MapPin} label="Location" color={formatColor} value={game.locations.join(", ")} />
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
