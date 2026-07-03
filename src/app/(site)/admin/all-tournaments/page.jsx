"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import api from "@/utils/axios";
import { ClipboardList, Search } from "lucide-react";

export default function AdminAllTournamentsPage() {
  const [tournaments, setTournaments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [tournamentRes, teamRes] = await Promise.all([
          api.get("/api/tournaments"),
          api.get("/api/team"),
        ]);

        setTournaments(tournamentRes.data?.data || []);
        setTeams(teamRes.data?.data || []);
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
                  </div>
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
