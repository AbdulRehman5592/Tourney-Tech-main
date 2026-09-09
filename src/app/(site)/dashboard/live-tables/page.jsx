"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import api from "@/utils/axios";
import StaffGuard from "@/components/gard/staff/StaffGuard";
import EditMatchModal from "@/components/ui/dashboard/matches/EditMatchesModel";

const teamLabel = (team) => {
  if (!team) return "— (empty seat)";
  return [team.displayId || team.serialNo, team.name].filter(Boolean).join(" ");
};

function LiveTablesPageInner() {
  const [me, setMe] = useState(null);
  const [tournaments, setTournaments] = useState([]);
  const [tournamentId, setTournamentId] = useState("");
  const [gameConfigId, setGameConfigId] = useState("");
  const [fetching, setFetching] = useState(true);
  const [loadingMatches, setLoadingMatches] = useState(false);

  const [matches, setMatches] = useState([]);
  const [checkedInTeams, setCheckedInTeams] = useState([]);
  const [showCompleted, setShowCompleted] = useState(false);
  const [editingMatch, setEditingMatch] = useState(null);
  const [reassigning, setReassigning] = useState(null); // `${matchId}:${side}` while a request is in flight

  useEffect(() => {
    const fetchInitial = async () => {
      try {
        const [meRes, tournamentsRes] = await Promise.all([
          api.get("/api/me"),
          api.get("/api/tournaments"),
        ]);
        setMe(meRes?.data?.data?.user || null);
        setTournaments(tournamentsRes?.data?.data || []);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load tournaments");
      } finally {
        setFetching(false);
      }
    };
    fetchInitial();
  }, []);

  const selectedTournament = tournaments.find((t) => t._id === tournamentId);
  const tournamentGames = (selectedTournament?.games || []).map((entry) => ({
    id: entry?._id,
    name: entry?.eventTitle || entry?.game?.name || "Unnamed game",
  }));

  // Staff other than a global admin only get full score-override controls if
  // they hold owner/organizer/manager on THIS tournament (not "support") --
  // must mirror SCORE_OVERRIDE_STAFF_ROLES in PATCH /api/matches/[id].
  const isStaffOverride = useMemo(() => {
    if (!me || me.role === "admin" || !selectedTournament) return false;
    return (selectedTournament.staff || []).some(
      (s) => s.user?._id === me._id && ["owner", "organizer", "manager"].includes(s.role)
    );
  }, [me, selectedTournament]);

  const loadMatches = async () => {
    if (!tournamentId || !gameConfigId) return;
    setLoadingMatches(true);
    try {
      const [matchesRes, rosterRes] = await Promise.all([
        api.get(`/api/matches?tournamentId=${tournamentId}&gameId=${gameConfigId}`),
        api.get(`/api/tournaments/${tournamentId}/games/${gameConfigId}/checkin`),
      ]);
      setMatches(matchesRes?.data?.data || []);
      setCheckedInTeams((rosterRes?.data?.data?.teams || []).filter((t) => t.checkedIn));
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to load tables");
    } finally {
      setLoadingMatches(false);
    }
  };

  useEffect(() => {
    if (tournamentId && gameConfigId) loadMatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId, gameConfigId]);

  const visibleMatches = matches.filter((m) =>
    showCompleted ? true : m.status !== "completed"
  );

  // Group by table, most recent round of each table on top so the currently
  // active match is what's shown -- byes/no-table matches are excluded, this
  // screen is specifically "who's at which physical table right now."
  const byTable = new Map();
  visibleMatches
    .filter((m) => m.tableNumber)
    .forEach((m) => {
      const existing = byTable.get(m.tableNumber);
      if (!existing || (m.round || 0) >= (existing.round || 0)) {
        byTable.set(m.tableNumber, m);
      }
    });
  const tableNumbers = [...byTable.keys()].sort((a, b) => a - b);

  const seatedTeamIds = new Set(
    matches
      .filter((m) => m.status !== "completed")
      .flatMap((m) => [m.teamA?._id, m.teamB?._id])
      .filter(Boolean)
  );

  const availableTeamsFor = (match, side) => {
    const currentId = match[side]?._id;
    return checkedInTeams.filter(
      (t) => t._id === currentId || !seatedTeamIds.has(t._id)
    );
  };

  const handleReassign = async (match, side, teamId) => {
    const key = `${match._id}:${side}`;
    setReassigning(key);
    try {
      const res = await api.patch(`/api/matches/${match._id}`, {
        action: "reassign",
        side,
        teamId: teamId || "",
      });
      setMatches((prev) =>
        prev.map((m) => (m._id === match._id ? res.data.data : m))
      );
      toast.success("Table seating updated");
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to reassign team");
    } finally {
      setReassigning(null);
    }
  };

  const handleModalSave = (matchId, updatedMatch) => {
    setMatches((prev) => prev.map((m) => (m._id === matchId ? updatedMatch : m)));
    setEditingMatch(null);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--card-background)] p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Live Table Overview</h1>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          Every table currently in play for this game. Reassign a seat or edit
          a score directly from here.
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--foreground)]">
              Tournament
            </label>
            <select
              value={tournamentId}
              onChange={(e) => {
                setTournamentId(e.target.value);
                setGameConfigId("");
                setMatches([]);
              }}
              disabled={fetching}
              className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--secondary-color)] px-3 py-2 text-[var(--foreground)]"
            >
              <option value="">Select tournament</option>
              {tournaments.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--foreground)]">
              Game
            </label>
            <select
              value={gameConfigId}
              onChange={(e) => setGameConfigId(e.target.value)}
              disabled={!tournamentId}
              className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--secondary-color)] px-3 py-2 text-[var(--foreground)]"
            >
              <option value="">Select game</option>
              {tournamentGames.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {tournamentId && gameConfigId && (
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--card-background)] p-6 shadow-sm space-y-4">
          <label className="flex w-fit items-center gap-2 text-sm text-[var(--foreground)]">
            <input
              type="checkbox"
              checked={showCompleted}
              onChange={(e) => setShowCompleted(e.target.checked)}
              className="h-4 w-4 accent-[var(--accent-color)]"
            />
            Also show completed matches
          </label>

          {loadingMatches ? (
            <p className="text-sm text-[var(--muted-foreground)]">Loading tables...</p>
          ) : tableNumbers.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              No active tables for this game yet -- generate the bracket first.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {tableNumbers.map((tableNumber) => {
                const match = byTable.get(tableNumber);
                return (
                  <div
                    key={tableNumber}
                    className="rounded-xl border border-[var(--border-color)] p-4 space-y-3"
                    style={{ background: "var(--secondary-color)" }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-[var(--foreground)]">
                        Table {tableNumber}
                      </span>
                      <span
                        className="rounded-full px-2 py-0.5 text-xs font-semibold"
                        style={{
                          background:
                            match.status === "completed"
                              ? "var(--muted-foreground)"
                              : "var(--success-color)",
                          color: "white",
                        }}
                      >
                        {match.status === "completed" ? "Completed" : "Round " + (match.round ?? "-")}
                      </span>
                    </div>

                    {["teamA", "teamB"].map((side) => (
                      <div key={side} className="space-y-1">
                        <p className="text-sm text-[var(--foreground)]">{teamLabel(match[side])}</p>
                        <select
                          value={match[side]?._id || ""}
                          onChange={(e) => handleReassign(match, side, e.target.value)}
                          disabled={
                            match.status === "completed" ||
                            reassigning === `${match._id}:${side}`
                          }
                          className="w-full rounded-md border border-[var(--border-color)] bg-[var(--card-background)] px-2 py-1 text-xs text-[var(--foreground)] disabled:opacity-50"
                        >
                          <option value="">— Remove —</option>
                          {availableTeamsFor(match, side).map((t) => (
                            <option key={t._id} value={t._id}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() => setEditingMatch(match)}
                      disabled={!match.teamA || !match.teamB}
                      className="w-full rounded-md px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                      style={{ background: "var(--primary-color)" }}
                    >
                      {match.status === "completed" ? "Edit / Override Score" : "Enter Score"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <EditMatchModal
        isOpen={!!editingMatch}
        onClose={() => setEditingMatch(null)}
        match={editingMatch}
        onSave={handleModalSave}
        isStaffOverride={isStaffOverride}
      />
    </div>
  );
}

export default function LiveTablesPage() {
  return (
    <StaffGuard>
      <LiveTablesPageInner />
    </StaffGuard>
  );
}
