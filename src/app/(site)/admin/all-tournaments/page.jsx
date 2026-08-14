"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import api from "@/utils/axios";
import { ClipboardList, Search } from "lucide-react";
import GameScheduleBadge from "@/components/ui/tournaments/GameScheduleBadge";
import { compareByScheduledAt } from "@/utils/gameSchedule";

export default function AdminAllTournamentsPage() {
  const [tournaments, setTournaments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [updatingId, setUpdatingId] = useState(null);

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

      {loading ? (
        <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--card-background)] p-8 text-center text-muted-foreground">
          Loading tournaments and teams...
        </div>
      ) : filteredTournaments.length === 0 ? (
        <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--card-background)] p-8 text-center text-muted-foreground">
          No tournaments found for the selected filters.
        </div>
      ) : (
        <div className="space-y-6">
          {filteredTournaments.map((tournament) => {
            const tournamentTeams = groupedTeams[tournament._id] || [];
            const tournamentRegistrations =
              groupedRegistrations[tournament._id] || [];

            return (
              <section
                key={tournament._id}
                className="rounded-3xl border border-[var(--border-color)] bg-[var(--card-background)] p-6 shadow-sm"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Tournament</p>
                    <h2 className="text-2xl font-semibold text-foreground">{tournament.name}</h2>
                    <p className="text-sm text-muted-foreground">
                      {tournament.location} • {new Date(tournament.startDate).toLocaleDateString()} - {new Date(tournament.endDate).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="rounded-full bg-[var(--secondary-color)] px-3 py-1 text-[var(--foreground)]">
                      {tournament.status || "N/A"}
                    </span>
                    <span className="text-muted-foreground">{tournamentTeams.length} team{tournamentTeams.length === 1 ? "" : "s"}</span>

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
                </div>

                <div className="mt-6 space-y-3">
                  <h3 className="text-lg font-medium text-foreground">
                    Games &amp; Schedule
                  </h3>

                  {tournament.games?.length > 0 ? (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {[...tournament.games]
                        .sort(compareByScheduledAt)
                        .map((game, index) => (
                          <div
                            key={game._id || index}
                            className="rounded-2xl border border-[var(--border-color)] bg-[var(--background)] p-4"
                          >
                            <p className="font-semibold text-[var(--foreground)]">
                              {game.game?.name || `Game ${index + 1}`}
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
                  ) : (
                    <p className="rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--background)] p-4 text-sm text-muted-foreground">
                      No games have been added to this tournament yet.
                    </p>
                  )}
                </div>

                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-foreground">Registered Players</h3>
                    <span className="text-sm text-muted-foreground">
                      {tournamentRegistrations.length} registrant
                      {tournamentRegistrations.length === 1 ? "" : "s"}
                    </span>
                  </div>

                  {tournamentRegistrations.length > 0 ? (
                    <div className="overflow-x-auto rounded-3xl border border-[var(--border-color)]">
                      <table className="min-w-full text-sm">
                        <thead className="bg-[var(--secondary-color)] text-[var(--foreground)]">
                          <tr>
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

                            return (
                              <tr
                                key={registration._id}
                                className="border-t border-[var(--border-color)]"
                              >
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
                  ) : (
                    <p className="rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--background)] p-4 text-sm text-muted-foreground">
                      No players have registered for this tournament yet.
                    </p>
                  )}
                </div>

                <div className="mt-6 space-y-4">
                  <h3 className="text-lg font-medium text-foreground">Teams</h3>

                  {tournamentTeams.length > 0 ? (
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
                  ) : (
                    <p className="rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--background)] p-4 text-sm text-muted-foreground">
                      No teams registered for this tournament yet.
                    </p>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
