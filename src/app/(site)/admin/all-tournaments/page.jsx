"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import api from "@/utils/axios";
import { ClipboardList, Search, ChevronDown, ChevronRight } from "lucide-react";
import GameScheduleBadge from "@/components/ui/tournaments/GameScheduleBadge";
import { compareByScheduledAt } from "@/utils/gameSchedule";

const DEFAULT_SECTIONS = { games: true, players: false, teams: false };

function CollapsibleSection({ title, count, isOpen, onToggle, hasItems, emptyMessage, children }) {
  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between rounded-2xl border border-[var(--border-color)] bg-[var(--background)] px-4 py-3 text-left transition hover:border-[var(--accent-color)]"
      >
        <span className="flex items-center gap-2 font-medium text-foreground">
          {title}
          <span className="rounded-full bg-[var(--secondary-color)] px-2 py-0.5 text-xs font-normal text-muted-foreground">
            {count}
          </span>
        </span>
        {isOpen ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>

      {isOpen && (
        <div className="mt-3">
          {hasItems ? (
            children
          ) : (
            <p className="rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--background)] p-4 text-sm text-muted-foreground">
              {emptyMessage}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminAllTournamentsPage() {
  const [tournaments, setTournaments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [updatingId, setUpdatingId] = useState(null);
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [sectionOpen, setSectionOpen] = useState({});
  // Per-tournament "form a team" state: which game we're teaming up players
  // for, and which registrants are currently checked -- lets an admin who
  // just bulk-registered a pile of players pair them up right from this
  // table instead of retyping names on the separate Create Team page.
  const [teamFormState, setTeamFormState] = useState({});
  const [creatingTeamFor, setCreatingTeamFor] = useState(null);

  const handleStatusChange = async (tournamentId, newStatus) => {
    setUpdatingId(tournamentId);
    try {
      await api.patch(`/api/tournaments/${tournamentId}`, {
        status: newStatus,
      });

      setTournaments((prev) =>
        prev.map((t) =>
          t._id === tournamentId ? { ...t, status: newStatus } : t
        )
      );

      toast.success(`Tournament marked as ${newStatus}`);
    } catch (error) {
      console.error("Failed to update tournament status:", error);
      toast.error(
        error.response?.data?.message || "Failed to update tournament status"
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const getFormState = (tournamentId) =>
    teamFormState[tournamentId] || { gameConfigId: "", selected: new Set() };

  const setFormGame = (tournamentId, gameConfigId) => {
    setTeamFormState((prev) => ({
      ...prev,
      [tournamentId]: { gameConfigId, selected: new Set() },
    }));
  };

  const clearSelection = (tournamentId) => {
    setTeamFormState((prev) => ({
      ...prev,
      [tournamentId]: { ...getFormState(tournamentId), selected: new Set() },
    }));
  };

  const toggleSelect = (tournamentId, registrationId, expectedSize) => {
    setTeamFormState((prev) => {
      const current = prev[tournamentId] || { gameConfigId: "", selected: new Set() };
      const next = new Set(current.selected);
      if (next.has(registrationId)) {
        next.delete(registrationId);
      } else {
        if (next.size >= expectedSize) {
          toast.error(`This game only needs ${expectedSize} player${expectedSize > 1 ? "s" : ""} per team`);
          return prev;
        }
        next.add(registrationId);
      }
      return { ...prev, [tournamentId]: { ...current, selected: next } };
    });
  };

  const handleCreateTeam = async (tournament, registrations, expectedSize) => {
    const formState = getFormState(tournament._id);
    const memberIds = registrations
      .filter((r) => formState.selected.has(r._id))
      .map((r) => r.user?._id)
      .filter(Boolean);

    if (memberIds.length !== expectedSize) {
      toast.error(`Select exactly ${expectedSize} player${expectedSize > 1 ? "s" : ""} to form a team`);
      return;
    }

    setCreatingTeamFor(tournament._id);
    try {
      const res = await api.post("/api/team", {
        tournament: tournament._id,
        gameConfigId: formState.gameConfigId,
        members: memberIds,
      });
      toast.success(res.data?.message || "Team created");

      // Re-fetch rather than hand-patch local state -- the create response
      // doesn't come back with `members`/`game` populated the way the rest
      // of this page expects, so a manual merge would show blank names
      // until the next reload anyway.
      const [teamRes, registrationRes] = await Promise.all([
        api.get("/api/team"),
        api.get("/api/tournamentRegister"),
      ]);
      setTeams(teamRes.data?.data || []);
      setRegistrations(registrationRes.data?.data || []);
      clearSelection(tournament._id);
    } catch (err) {
      console.error("Failed to create team:", err);
      toast.error(err.response?.data?.message || "Failed to create team");
    } finally {
      setCreatingTeamFor(null);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [tournamentRes, teamRes, registrationRes] = await Promise.all([
          api.get("/api/tournaments?includeDrafts=true"),
          api.get("/api/team"),
          api.get("/api/tournamentRegister"),
        ]);

        setTournaments(tournamentRes.data?.data || []);
        setTeams(teamRes.data?.data || []);
        setRegistrations(registrationRes.data?.data || []);
      } catch (error) {
        console.error("Failed to load tournaments or teams:", error);
        toast.error("Failed to load admin tournament data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const groupedTeams = useMemo(() => {
    return teams.reduce((acc, team) => {
      const tournamentId = team?.tournament?._id || team?.tournament;
      if (!tournamentId) return acc;

      if (!acc[tournamentId]) {
        acc[tournamentId] = [];
      }

      acc[tournamentId].push(team);
      return acc;
    }, {});
  }, [teams]);

  const groupedRegistrations = useMemo(() => {
    return registrations.reduce((acc, registration) => {
      const tournamentId =
        registration?.tournament?._id || registration?.tournament;
      if (!tournamentId) return acc;

      if (!acc[tournamentId]) {
        acc[tournamentId] = [];
      }

      acc[tournamentId].push(registration);
      return acc;
    }, {});
  }, [registrations]);

  const filteredTournaments = useMemo(() => {
    return tournaments.filter((tournament) => {
      const term = search.toLowerCase().trim();
      const matchesSearch =
        tournament.name?.toLowerCase().includes(term) ||
        tournament.location?.toLowerCase().includes(term) ||
        tournament.description?.toLowerCase().includes(term);

      const matchesStatus =
        statusFilter === "all" || tournament.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [tournaments, search, statusFilter]);

  const toggleTournament = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });

    setSectionOpen((prev) =>
      prev[id] ? prev : { ...prev, [id]: DEFAULT_SECTIONS }
    );
  };

  const toggleSection = (id, section) => {
    setSectionOpen((prev) => {
      const current = prev[id] || DEFAULT_SECTIONS;
      return {
        ...prev,
        [id]: { ...current, [section]: !current[section] },
      };
    });
  };

  const expandAll = () => {
    setExpandedIds(new Set(filteredTournaments.map((t) => t._id)));
    setSectionOpen((prev) => {
      const next = { ...prev };
      filteredTournaments.forEach((t) => {
        if (!next[t._id]) {
          next[t._id] = DEFAULT_SECTIONS;
        }
      });
      return next;
    });
  };

  const collapseAll = () => setExpandedIds(new Set());

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-[var(--secondary-color)] p-3 text-[var(--accent-color)] shadow-sm">
            <ClipboardList className="h-5 w-5" />
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Admin reports</p>
            <h1 className="text-3xl font-semibold text-foreground">Tournaments & Teams</h1>
          </div>
        </div>

        <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-2">
          <div className="flex items-center gap-2 rounded-2xl border border-[var(--border-color)] bg-[var(--card-background)] px-4 py-3">
            <Search className="h-4 w-4 text-[var(--foreground)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tournaments"
              className="w-full bg-transparent text-[var(--foreground)] outline-none placeholder:text-muted-foreground"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-2xl border border-[var(--border-color)] bg-[var(--card-background)] px-4 py-3 text-[var(--foreground)]"
          >
            <option value="all">All statuses</option>
            <option value="upcoming">Upcoming</option>
            <option value="ongoing">Ongoing</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {!loading && filteredTournaments.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {filteredTournaments.length} tournament
            {filteredTournaments.length === 1 ? "" : "s"}
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={expandAll}
              className="rounded-full border border-[var(--border-color)] bg-[var(--card-background)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] transition hover:border-[var(--accent-color)]"
            >
              Expand all
            </button>
            <button
              type="button"
              onClick={collapseAll}
              className="rounded-full border border-[var(--border-color)] bg-[var(--card-background)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] transition hover:border-[var(--accent-color)]"
            >
              Collapse all
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--card-background)] p-8 text-center text-muted-foreground">
          Loading tournaments and teams...
        </div>
      ) : filteredTournaments.length === 0 ? (
        <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--card-background)] p-8 text-center text-muted-foreground">
          No tournaments found for the selected filters.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTournaments.map((tournament) => {
            const tournamentTeams = groupedTeams[tournament._id] || [];
            const tournamentRegistrations =
              groupedRegistrations[tournament._id] || [];
            const tournamentGames = tournament.games || [];
            const isExpanded = expandedIds.has(tournament._id);
            const sections = sectionOpen[tournament._id] || DEFAULT_SECTIONS;

            const formState = getFormState(tournament._id);
            const formGameConfig = tournamentGames.find(
              (g) => g._id === formState.gameConfigId
            );
            const expectedTeamSize =
              formGameConfig?.tournamentTeamType === "single_player" ? 1 : 2;

            // Eligible for the currently-selected game: registered for that
            // specific scheduled instance, and not already on a team for it.
            const isEligibleForTeamForming = (registration) => {
              if (!formState.gameConfigId) return false;
              const gameConfigIds = (
                registration.gameRegistrationDetails?.gameConfigIds || []
              ).map(String);
              if (!gameConfigIds.includes(formState.gameConfigId)) return false;
              const alreadyTeamed = tournamentTeams.some(
                (t) =>
                  String(t.gameConfigId) === formState.gameConfigId &&
                  (t.members || []).some((m) => m._id === registration.user?._id)
              );
              return !alreadyTeamed;
            };

            return (
              <section
                key={tournament._id}
                className="rounded-3xl border border-[var(--border-color)] bg-[var(--card-background)] shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => toggleTournament(tournament._id)}
                  className="flex w-full flex-col gap-4 p-6 text-left sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-start gap-3">
                    {isExpanded ? (
                      <ChevronDown className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />
                    )}

                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Tournament</p>
                      <h2 className="text-2xl font-semibold text-foreground">{tournament.name}</h2>
                      <p className="text-sm text-muted-foreground">
                        {tournament.location} • {new Date(tournament.startDate).toLocaleDateString()} - {new Date(tournament.endDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div
                    className="flex flex-wrap items-center gap-2 text-sm"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="rounded-full bg-[var(--secondary-color)] px-3 py-1 text-[var(--foreground)]">
                      {tournament.status || "N/A"}
                    </span>
                    <span className="text-muted-foreground">{tournamentGames.length} game{tournamentGames.length === 1 ? "" : "s"}</span>
                    <span className="text-muted-foreground">{tournamentTeams.length} team{tournamentTeams.length === 1 ? "" : "s"}</span>
                    <span className="text-muted-foreground">{tournamentRegistrations.length} registrant{tournamentRegistrations.length === 1 ? "" : "s"}</span>

                    <select
                      value={tournament.status || ""}
                      disabled={updatingId === tournament._id}
                      onChange={(e) =>
                        handleStatusChange(tournament._id, e.target.value)
                      }
                      className="rounded-full border border-[var(--border-color)] bg-[var(--card-background)] px-3 py-1 text-[var(--foreground)] disabled:opacity-50"
                    >
                      <option value="upcoming">Upcoming</option>
                      <option value="ongoing">Ongoing</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-[var(--border-color)] px-6 pb-6">
                    <CollapsibleSection
                      title="Games & Schedule"
                      count={tournamentGames.length}
                      isOpen={sections.games}
                      onToggle={() => toggleSection(tournament._id, "games")}
                      hasItems={tournamentGames.length > 0}
                      emptyMessage="No games have been added to this tournament yet."
                    >
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {[...tournamentGames]
                          .sort(compareByScheduledAt)
                          .map((game, index) => (
                            <div
                              key={game._id || index}
                              className="rounded-2xl border border-[var(--border-color)] bg-[var(--background)] p-4"
                            >
                              <p className="font-semibold text-[var(--foreground)]">
                                <span className="text-muted-foreground">Game {index + 1}:</span>{" "}
                                {game.game?.name || "Unnamed Game"}
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                ${game.entryFee ?? 0} •{" "}
                                {game.tournamentTeamType === "double_player"
                                  ? "Double player"
                                  : "Single player"}
                              </p>
                              <GameScheduleBadge
                                value={game.scheduledAt}
                                variant="stacked"
                                className="mt-3"
                              />
                            </div>
                          ))}
                      </div>
                    </CollapsibleSection>

                    <CollapsibleSection
                      title="Registered Players"
                      count={tournamentRegistrations.length}
                      isOpen={sections.players}
                      onToggle={() => toggleSection(tournament._id, "players")}
                      hasItems={tournamentRegistrations.length > 0}
                      emptyMessage="No players have registered for this tournament yet."
                    >
                      <div className="mb-3 flex flex-wrap items-center gap-3 rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--background)] p-3">
                        <span className="text-sm font-medium text-foreground">Form a team:</span>
                        <select
                          value={formState.gameConfigId}
                          onChange={(e) => setFormGame(tournament._id, e.target.value)}
                          className="rounded-lg border border-[var(--border-color)] bg-[var(--card-background)] px-3 py-1.5 text-sm text-[var(--foreground)]"
                        >
                          <option value="">Select a game...</option>
                          {tournamentGames.map((g) => (
                            <option key={g._id} value={g._id}>
                              {g.game?.name || "Unnamed Game"}
                              {g.eventTitle ? ` — ${g.eventTitle}` : ""}
                            </option>
                          ))}
                        </select>

                        {formState.gameConfigId && (
                          <>
                            <span className="text-xs text-muted-foreground">
                              {formState.selected.size} of {expectedTeamSize} selected
                            </span>
                            <button
                              type="button"
                              disabled={
                                formState.selected.size !== expectedTeamSize ||
                                creatingTeamFor === tournament._id
                              }
                              onClick={() =>
                                handleCreateTeam(tournament, tournamentRegistrations, expectedTeamSize)
                              }
                              className="rounded-lg bg-[var(--accent-color)] px-3 py-1.5 text-sm font-semibold text-black disabled:opacity-40"
                            >
                              {creatingTeamFor === tournament._id ? "Creating..." : "Create Team"}
                            </button>
                            <button
                              type="button"
                              onClick={() => clearSelection(tournament._id)}
                              className="text-xs font-medium text-muted-foreground hover:underline"
                            >
                              Clear selection
                            </button>
                          </>
                        )}
                      </div>

                      <div className="overflow-x-auto rounded-3xl border border-[var(--border-color)]">
                        <table className="min-w-full text-sm">
                          <thead className="bg-[var(--secondary-color)] text-[var(--foreground)]">
                            <tr>
                              {formState.gameConfigId && (
                                <th className="px-4 py-2 text-left font-medium">Select</th>
                              )}
                              <th className="px-4 py-2 text-left font-medium">Player</th>
                              <th className="px-4 py-2 text-left font-medium">Email</th>
                              <th className="px-4 py-2 text-left font-medium">Game(s)</th>
                              <th className="px-4 py-2 text-left font-medium">Team</th>
                              <th className="px-4 py-2 text-left font-medium">Status</th>
                            </tr>
                          </thead>
                          <tbody className="bg-[var(--background)] text-[var(--foreground)]">
                            {tournamentRegistrations.map((registration) => {
                              const team = tournamentTeams.find(
                                (t) =>
                                  t._id ===
                                  (registration.gameRegistrationDetails?.team?._id ||
                                    registration.gameRegistrationDetails?.team)
                              );
                              const eligible = isEligibleForTeamForming(registration);

                              return (
                                <tr
                                  key={registration._id}
                                  className="border-t border-[var(--border-color)]"
                                >
                                  {formState.gameConfigId && (
                                    <td className="px-4 py-2">
                                      {eligible && (
                                        <input
                                          type="checkbox"
                                          checked={formState.selected.has(registration._id)}
                                          onChange={() =>
                                            toggleSelect(tournament._id, registration._id, expectedTeamSize)
                                          }
                                          className="h-4 w-4 accent-[var(--accent-color)]"
                                        />
                                      )}
                                    </td>
                                  )}
                                  <td className="px-4 py-2">
                                    {registration.user?.username ||
                                      `${registration.user?.firstname || ""} ${registration.user?.lastname || ""}`.trim() ||
                                      "-"}
                                  </td>
                                  <td className="px-4 py-2">{registration.user?.email || "-"}</td>
                                  <td className="px-4 py-2">
                                    {registration.gameRegistrationDetails?.games
                                      ?.map((g) => g.name)
                                      .join(", ") || "-"}
                                  </td>
                                  <td className="px-4 py-2">
                                    {team ? team.name : "Not teamed up yet"}
                                  </td>
                                  <td className="px-4 py-2 capitalize">
                                    {registration.gameRegistrationDetails?.status || "pending"}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </CollapsibleSection>

                    <CollapsibleSection
                      title="Teams"
                      count={tournamentTeams.length}
                      isOpen={sections.teams}
                      onToggle={() => toggleSection(tournament._id, "teams")}
                      hasItems={tournamentTeams.length > 0}
                      emptyMessage="No teams registered for this tournament yet."
                    >
                      <div className="space-y-4">
                        {tournamentTeams.map((team) => (
                          <div
                            key={team._id}
                            className="rounded-3xl border border-[var(--border-color)] bg-[var(--background)] p-4"
                          >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <p className="font-semibold text-[var(--foreground)]">{team.name}</p>
                                <p className="text-sm text-muted-foreground">Game: {team.game?.name || "N/A"}</p>
                              </div>
                              <p className="text-sm text-muted-foreground">Serial: {team.serialNo}</p>
                            </div>

                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                              <div>
                                <p className="text-xs uppercase tracking-wide text-muted-foreground">Members</p>
                                <p className="mt-2 text-sm text-[var(--foreground)]">
                                  {team.members?.length > 0
                                    ? team.members
                                        .map(
                                          (member) =>
                                            member.username || `${member.firstname || ""} ${member.lastname || ""}`
                                        )
                                        .join(", ")
                                    : "No members"
                                  }
                                </p>
                              </div>

                              <div>
                                <p className="text-xs uppercase tracking-wide text-muted-foreground">Created by</p>
                                <p className="mt-2 text-sm text-[var(--foreground)]">
                                  {team.createdBy?.username || `${team.createdBy?.firstname || ""} ${team.createdBy?.lastname || ""}` || "N/A"}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CollapsibleSection>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
