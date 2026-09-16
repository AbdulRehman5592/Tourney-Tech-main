"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import api from "@/utils/axios";
import { ClipboardList, Search, ChevronRight } from "lucide-react";

const STATUS_STYLE = {
  upcoming: { bg: "color-mix(in srgb, var(--info-color) 14%, transparent)", color: "var(--info-color)" },
  registration_closed: { bg: "color-mix(in srgb, var(--warning-color) 14%, transparent)", color: "var(--warning-color)" },
  ongoing: { bg: "color-mix(in srgb, var(--success-color) 14%, transparent)", color: "var(--success-color)" },
  completed: { bg: "color-mix(in srgb, var(--muted-foreground) 14%, transparent)", color: "var(--muted-foreground)" },
  draft: { bg: "color-mix(in srgb, var(--muted-foreground) 14%, transparent)", color: "var(--muted-foreground)" },
};

// Replaces the old flat accordion list -- each card links into its own
// tournament workspace (/admin/tournaments/[tournamentId]) instead of
// expanding inline, and surfaces collected/pending $ up front so an admin
// can spot a tournament that needs financial attention without opening it.
export default function AdminTournamentsListPage() {
  const [tournaments, setTournaments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [financeRows, setFinanceRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [tournamentRes, teamRes, registrationRes, financeRes] = await Promise.all([
          api.get("/api/tournaments?includeDrafts=true"),
          api.get("/api/team"),
          api.get("/api/tournamentRegister"),
          api.get("/api/finance"),
        ]);
        setTournaments(tournamentRes.data?.data || []);
        setTeams(teamRes.data?.data || []);
        setRegistrations(registrationRes.data?.data || []);
        setFinanceRows(financeRes.data?.data?.rows || []);
      } catch (error) {
        console.error("Failed to load tournaments:", error);
        toast.error("Failed to load tournaments");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const countsByTournament = useMemo(() => {
    const counts = {};
    const get = (id) => (counts[id] ||= { teams: 0, registrants: 0, collected: 0, pending: 0 });
    teams.forEach((t) => {
      const id = t?.tournament?._id || t?.tournament;
      if (id) get(id).teams += 1;
    });
    registrations.forEach((r) => {
      const id = r?.tournament?._id || r?.tournament;
      if (id) get(id).registrants += 1;
    });
    financeRows.forEach((row) => {
      const id = row.tournamentId;
      if (!id) return;
      if (row.type === "payment") get(id).collected += row.amount;
      else if (row.type === "pending") get(id).pending += row.amount;
    });
    return counts;
  }, [teams, registrations, financeRows]);

  const filteredTournaments = useMemo(() => {
    return tournaments.filter((t) => {
      const term = search.toLowerCase().trim();
      const matchesSearch =
        t.name?.toLowerCase().includes(term) ||
        t.location?.toLowerCase().includes(term) ||
        t.description?.toLowerCase().includes(term);
      const matchesStatus = statusFilter === "all" || t.status === statusFilter;
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
            <h1 className="text-3xl font-semibold text-foreground">Tournaments</h1>
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
            <option value="registration_closed">Registration Closed</option>
            <option value="ongoing">Ongoing</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {!loading && (
        <p className="text-sm text-muted-foreground">
          {filteredTournaments.length} tournament{filteredTournaments.length === 1 ? "" : "s"}
        </p>
      )}

      {loading ? (
        <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--card-background)] p-8 text-center text-muted-foreground">
          Loading tournaments...
        </div>
      ) : filteredTournaments.length === 0 ? (
        <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--card-background)] p-8 text-center text-muted-foreground">
          No tournaments found for the selected filters.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filteredTournaments.map((t) => {
            const counts = countsByTournament[t._id] || { teams: 0, registrants: 0, collected: 0, pending: 0 };
            const statusStyle = STATUS_STYLE[t.status] || STATUS_STYLE.draft;
            const games = t.games || [];

            return (
              <Link
                key={t._id}
                href={`/admin/tournaments/${t._id}`}
                className="block rounded-3xl border border-[var(--border-color)] bg-[var(--card-background)] p-6 shadow-sm transition hover:border-[var(--accent-color)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-foreground">{t.name}</h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t.location} &bull; {new Date(t.startDate).toLocaleDateString()} -{" "}
                      {new Date(t.endDate).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className="flex-shrink-0 rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap"
                    style={{ background: statusStyle.bg, color: statusStyle.color }}
                  >
                    {t.status || "N/A"}
                  </span>
                </div>

                <div className="mt-4 flex items-center gap-4 border-t border-[var(--secondary-color)] pt-4 text-xs text-muted-foreground">
                  <span>{games.length} game{games.length === 1 ? "" : "s"}</span>
                  <span>{counts.teams} team{counts.teams === 1 ? "" : "s"}</span>
                  <span>{counts.registrants} registrant{counts.registrants === 1 ? "" : "s"}</span>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="rounded-full px-2.5 py-1 text-xs font-semibold"
                      style={{
                        background: "color-mix(in srgb, var(--success-color) 14%, transparent)",
                        color: "var(--success-color)",
                      }}
                    >
                      ${counts.collected.toLocaleString()} collected
                    </span>
                    {counts.pending > 0 && (
                      <span
                        className="rounded-full px-2.5 py-1 text-xs font-semibold"
                        style={{
                          background: "color-mix(in srgb, var(--accent-color) 14%, transparent)",
                          color: "var(--accent-color)",
                        }}
                      >
                        ${counts.pending.toLocaleString()} pending
                      </span>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
