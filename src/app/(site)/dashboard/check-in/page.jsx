"use client";

import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import api from "@/utils/axios";
import StaffGuard from "@/components/gard/staff/StaffGuard";

function CheckInPageInner() {
  const [tournaments, setTournaments] = useState([]);
  const [tournamentId, setTournamentId] = useState("");
  const [gameConfigId, setGameConfigId] = useState("");
  const [fetching, setFetching] = useState(true);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [togglingOpen, setTogglingOpen] = useState(false);

  const [checkInOpen, setCheckInOpen] = useState(false);
  const [teams, setTeams] = useState([]);
  const [pendingTeamFormation, setPendingTeamFormation] = useState([]);

  const [search, setSearch] = useState("");
  const [selectedTeamIds, setSelectedTeamIds] = useState([]);
  const [selectedRegistrationIds, setSelectedRegistrationIds] = useState([]);
  const [bulkResult, setBulkResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const res = await api.get("/api/tournaments");
        setTournaments(res?.data?.data || []);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load tournaments");
      } finally {
        setFetching(false);
      }
    };
    fetchTournaments();
  }, []);

  const selectedTournament = tournaments.find((t) => t._id === tournamentId);
  const tournamentGames = (selectedTournament?.games || []).map((entry) => ({
    id: entry?._id,
    name: entry?.game?.name || entry?.eventTitle || "Unnamed game",
  }));

  const loadRoster = async () => {
    if (!tournamentId || !gameConfigId) return;
    setLoadingRoster(true);
    setBulkResult(null);
    setSelectedTeamIds([]);
    setSelectedRegistrationIds([]);
    try {
      const res = await api.get(
        `/api/tournaments/${tournamentId}/games/${gameConfigId}/checkin`
      );
      const data = res?.data?.data || {};
      setCheckInOpen(!!data.checkInOpen);
      setTeams(data.teams || []);
      setPendingTeamFormation(data.pendingTeamFormation || []);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to load roster");
    } finally {
      setLoadingRoster(false);
    }
  };

  useEffect(() => {
    if (tournamentId && gameConfigId) loadRoster();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId, gameConfigId]);

  const toggleCheckInOpen = async () => {
    setTogglingOpen(true);
    try {
      const res = await api.patch(
        `/api/tournaments/${tournamentId}/games/${gameConfigId}/checkin`,
        { open: !checkInOpen }
      );
      setCheckInOpen(!!res?.data?.data?.checkInOpen);
      toast.success(checkInOpen ? "Check-in closed" : "Check-in opened");
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to update check-in");
    } finally {
      setTogglingOpen(false);
    }
  };

  const q = search.trim().toLowerCase();
  const filteredTeams = teams.filter(
    (t) => !q || t.name?.toLowerCase().includes(q)
  );
  const filteredPending = pendingTeamFormation.filter(
    (p) => !q || p.name?.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q)
  );

  const toggleTeam = (id) =>
    setSelectedTeamIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  const toggleRegistration = (id) =>
    setSelectedRegistrationIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const selectAllFiltered = () => {
    setSelectedTeamIds((prev) => [
      ...new Set([...prev, ...filteredTeams.map((t) => t._id)]),
    ]);
    setSelectedRegistrationIds((prev) => [
      ...new Set([...prev, ...filteredPending.map((p) => p.registrationId)]),
    ]);
  };
  const clearSelection = () => {
    setSelectedTeamIds([]);
    setSelectedRegistrationIds([]);
  };

  const runBulk = async (checkedIn) => {
    if (!selectedTeamIds.length && !selectedRegistrationIds.length) {
      toast.error("Select at least one team or player");
      return;
    }
    setSubmitting(true);
    setBulkResult(null);
    try {
      const res = await api.post("/api/team/checkin", {
        tournamentId,
        gameConfigId,
        teamIds: selectedTeamIds,
        registrationIds: checkedIn ? selectedRegistrationIds : [],
        checkedIn,
      });
      setBulkResult(res?.data?.data);
      toast.success(res?.data?.message || "Done");
      await loadRoster();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Bulk check-in failed");
    } finally {
      setSubmitting(false);
    }
  };

  const quickToggle = async (team) => {
    setSubmitting(true);
    try {
      await api.post("/api/team/checkin", {
        tournamentId,
        gameConfigId,
        teamIds: [team._id],
        checkedIn: !team.checkedIn,
      });
      await loadRoster();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to update check-in");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--card-background)] p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Check-In</h1>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          Open check-in ahead of time, then mark teams present as they arrive.
          A team that never checks in won&apos;t be seated when the bracket is
          generated.
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-[var(--foreground)]">
                Check-in is
              </span>
              <span
                className="rounded-full px-3 py-1 text-xs font-semibold"
                style={{
                  background: checkInOpen ? "var(--success-color)" : "var(--muted-foreground)",
                  color: "white",
                }}
              >
                {checkInOpen ? "OPEN" : "CLOSED"}
              </span>
            </div>
            <button
              type="button"
              onClick={toggleCheckInOpen}
              disabled={togglingOpen || loadingRoster}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: checkInOpen ? "var(--error-color)" : "var(--success-color)" }}
            >
              {togglingOpen ? "Updating..." : checkInOpen ? "Close Check-In" : "Open Check-In"}
            </button>
          </div>

          {loadingRoster ? (
            <p className="text-sm text-[var(--muted-foreground)]">Loading roster...</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by team/player name"
                  className="flex-1 min-w-[200px] rounded-lg border border-[var(--border-color)] bg-[var(--secondary-color)] px-3 py-2 text-sm text-[var(--foreground)]"
                />
                <button
                  type="button"
                  onClick={selectAllFiltered}
                  className="text-xs font-semibold text-[var(--accent-color)] hover:underline"
                >
                  Select all{search.trim() ? " (filtered)" : ""}
                </button>
                <button
                  type="button"
                  onClick={clearSelection}
                  className="text-xs font-semibold text-[var(--muted-foreground)] hover:underline"
                >
                  Clear selection
                </button>
              </div>

              <div className="max-h-96 overflow-y-auto rounded-lg border border-[var(--border-color)]">
                {filteredTeams.map((team) => (
                  <label
                    key={team._id}
                    className="flex items-center justify-between gap-3 border-b border-[var(--border-color)] px-3 py-2 text-sm text-[var(--foreground)] last:border-b-0"
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedTeamIds.includes(team._id)}
                        onChange={() => toggleTeam(team._id)}
                        className="h-4 w-4 accent-[var(--accent-color)]"
                      />
                      <span>
                        {team.name}{" "}
                        <span className="text-xs text-[var(--muted-foreground)]">
                          ({(team.members || []).map((m) => m.username || m.firstname).join(", ")})
                        </span>
                      </span>
                    </span>
                    <span className="flex items-center gap-2">
                      {team.checkedIn && (
                        <span
                          className="rounded-full px-2 py-0.5 text-xs font-semibold text-white"
                          style={{ background: "var(--success-color)" }}
                        >
                          ✓ Checked In
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => quickToggle(team)}
                        disabled={submitting}
                        className="rounded-md border border-[var(--border-color)] px-2 py-1 text-xs font-semibold text-[var(--foreground)] disabled:opacity-50"
                      >
                        {team.checkedIn ? "Undo" : "Check In"}
                      </button>
                    </span>
                  </label>
                ))}

                {filteredPending.map((p) => (
                  <label
                    key={p.registrationId}
                    className="flex items-center justify-between gap-3 border-b border-[var(--border-color)] bg-[var(--secondary-color)] px-3 py-2 text-sm text-[var(--foreground)] last:border-b-0 opacity-90"
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedRegistrationIds.includes(p.registrationId)}
                        onChange={() => toggleRegistration(p.registrationId)}
                        className="h-4 w-4 accent-[var(--accent-color)]"
                      />
                      <span>
                        {p.name}{" "}
                        <span className="text-xs text-[var(--muted-foreground)]">
                          (not yet on a team -- checking in creates it)
                        </span>
                      </span>
                    </span>
                  </label>
                ))}

                {filteredTeams.length === 0 && filteredPending.length === 0 && (
                  <p className="px-3 py-4 text-sm text-[var(--muted-foreground)]">
                    No registered teams/players for this game yet.
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => runBulk(true)}
                  disabled={submitting}
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  style={{ background: "var(--success-color)" }}
                >
                  {submitting
                    ? "Working..."
                    : `Check In Selected (${selectedTeamIds.length + selectedRegistrationIds.length})`}
                </button>
                <button
                  type="button"
                  onClick={() => runBulk(false)}
                  disabled={submitting || !selectedTeamIds.length}
                  className="rounded-lg border border-[var(--border-color)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] disabled:opacity-50"
                >
                  Check Out Selected ({selectedTeamIds.length})
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {bulkResult && (
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--card-background)] p-6 shadow-sm space-y-2">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">
            Results: {bulkResult.summary?.updated || 0} updated,{" "}
            {bulkResult.summary?.skipped || 0} skipped,{" "}
            {bulkResult.summary?.failed || 0} failed
          </h2>
          <ul className="space-y-1 text-sm text-[var(--muted-foreground)]">
            {(bulkResult.results || [])
              .filter((r) => r.status !== "updated")
              .map((r, i) => (
                <li key={i}>
                  <strong className="text-[var(--foreground)]">{r.id}</strong>: {r.message}
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function CheckInPage() {
  return (
    <StaffGuard>
      <CheckInPageInner />
    </StaffGuard>
  );
}
