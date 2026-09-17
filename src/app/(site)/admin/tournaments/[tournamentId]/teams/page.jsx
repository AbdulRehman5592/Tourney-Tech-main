"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import api from "@/utils/axios";
import { Pencil, Trash2 } from "lucide-react";
import EditTeamForm from "@/components/ui/admin/team/EditTeamForm";
import { formatGameConfigLabel } from "@/utils/gameConfigLabel";
import { useWorkspaceTournament } from "../layout";

export default function TournamentTeamsTab() {
  const { tournament, tournamentId } = useWorkspaceTournament();
  const [teams, setTeams] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingTeamId, setEditingTeamId] = useState(null);

  // Per-tournament "form a team" state: which game we're teaming up players
  // for, and which registrants are currently checked.
  const [gameConfigId, setGameConfigId] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [creating, setCreating] = useState(false);

  const fetchTeams = async () => {
    try {
      const res = await api.get(`/api/team?tournament=${tournamentId}`);
      setTeams(res.data?.data || []);
    } catch (error) {
      console.error("Failed to load teams:", error);
      toast.error("Failed to load teams");
    }
  };

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [teamRes, registrationRes] = await Promise.all([
          api.get(`/api/team?tournament=${tournamentId}`),
          api.get("/api/tournamentRegister"),
        ]);
        setTeams(teamRes.data?.data || []);
        setRegistrations(
          (registrationRes.data?.data || []).filter(
            (r) => (r.tournament?._id || r.tournament) === tournamentId
          )
        );
      } catch (error) {
        console.error("Failed to load teams/registrations:", error);
        toast.error("Failed to load teams");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [tournamentId]);

  const games = tournament.games || [];
  const formGameConfig = games.find((g) => g._id === gameConfigId);
  const expectedTeamSize = formGameConfig?.tournamentTeamType === "single_player" ? 1 : 2;

  const activeGameConfigIdsOf = (registration) =>
    (registration.gameEntries || [])
      .filter((e) => !e.removed && !e.cancelled)
      .map((e) => String(e.gameConfigId));

  const isEligible = (registration) => {
    if (!gameConfigId) return false;
    const gameConfigIds = activeGameConfigIdsOf(registration);
    if (!gameConfigIds.includes(gameConfigId)) return false;
    const alreadyTeamed = teams.some(
      (t) =>
        String(t.gameConfigId) === gameConfigId &&
        (t.members || []).some((m) => m._id === registration.user?._id)
    );
    return !alreadyTeamed;
  };

  const registeredGameLabels = (registration) => {
    const gameConfigIds = activeGameConfigIdsOf(registration);
    return gameConfigIds
      .map((id) => games.find((g) => g._id === id))
      .filter(Boolean)
      .map((g) => formatGameConfigLabel(g));
  };

  const toggleSelect = (registrationId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(registrationId)) {
        next.delete(registrationId);
      } else {
        if (next.size >= expectedTeamSize) {
          toast.error(`This game only needs ${expectedTeamSize} player${expectedTeamSize > 1 ? "s" : ""} per team`);
          return prev;
        }
        next.add(registrationId);
      }
      return next;
    });
  };

  const handleCreateTeam = async () => {
    const memberIds = registrations
      .filter((r) => selected.has(r._id))
      .map((r) => r.user?._id)
      .filter(Boolean);

    if (memberIds.length !== expectedTeamSize) {
      toast.error(`Select exactly ${expectedTeamSize} player${expectedTeamSize > 1 ? "s" : ""} to form a team`);
      return;
    }

    setCreating(true);
    try {
      const res = await api.post("/api/team", {
        tournament: tournamentId,
        gameConfigId,
        members: memberIds,
      });
      toast.success(res.data?.message || "Team created");
      await fetchTeams();
      setSelected(new Set());
    } catch (err) {
      console.error("Failed to create team:", err);
      toast.error(err.response?.data?.message || "Failed to create team");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteTeam = (id) => {
    toast(
      (t) => (
        <div className="flex flex-col space-y-2">
          <p className="text-sm">Are you sure you want to delete this team?</p>
          <div className="flex space-x-2">
            <button
              onClick={async () => {
                try {
                  const { data } = await api.delete(`/api/team/${id}`);
                  toast.success(data.message || "Team deleted");
                  fetchTeams();
                } catch (error) {
                  toast.error(error?.response?.data?.message || "Delete failed");
                } finally {
                  toast.dismiss(t.id);
                }
              }}
              className="px-3 py-1 bg-red-600 text-white rounded"
            >
              Yes, Delete
            </button>
            <button onClick={() => toast.dismiss(t.id)} className="px-3 py-1 bg-gray-500 text-white rounded">
              Cancel
            </button>
          </div>
        </div>
      ),
      { duration: 4000 }
    );
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--card-background)] p-8 text-center text-muted-foreground">
        Loading teams...
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--background)] p-3">
        <span className="text-sm font-medium text-foreground">Form a team:</span>
        <select
          value={gameConfigId}
          onChange={(e) => {
            setGameConfigId(e.target.value);
            setSelected(new Set());
          }}
          className="rounded-lg border border-[var(--border-color)] bg-[var(--card-background)] px-3 py-1.5 text-sm text-[var(--foreground)]"
        >
          <option value="">Select a game...</option>
          {games.map((g) => (
            <option key={g._id} value={g._id}>
              {formatGameConfigLabel(g)}
            </option>
          ))}
        </select>

        {gameConfigId && (
          <>
            <span className="text-xs text-muted-foreground">
              {selected.size} of {expectedTeamSize} selected
            </span>
            <button
              type="button"
              disabled={selected.size !== expectedTeamSize || creating}
              onClick={handleCreateTeam}
              className="rounded-lg bg-[var(--accent-color)] px-3 py-1.5 text-sm font-semibold text-black disabled:opacity-40"
            >
              {creating ? "Creating..." : "Create Team"}
            </button>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="text-xs font-medium text-muted-foreground hover:underline"
            >
              Clear selection
            </button>
          </>
        )}
      </div>

      {gameConfigId && (
        <div className="mb-6 overflow-x-auto rounded-3xl border border-[var(--border-color)]">
          <table className="min-w-full text-sm">
            <thead className="bg-[var(--secondary-color)] text-[var(--foreground)]">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Select</th>
                <th className="px-4 py-2 text-left font-medium">Player</th>
                <th className="px-4 py-2 text-left font-medium">Email</th>
                <th className="px-4 py-2 text-left font-medium">Games</th>
              </tr>
            </thead>
            <tbody className="bg-[var(--background)] text-[var(--foreground)]">
              {registrations.map((registration) => {
                const eligible = isEligible(registration);
                return (
                  <tr key={registration._id} className="border-t border-[var(--border-color)]">
                    <td className="px-4 py-2">
                      <input
                        type="checkbox"
                        checked={selected.has(registration._id)}
                        disabled={!eligible}
                        onChange={() => toggleSelect(registration._id)}
                        className="h-4 w-4 accent-[var(--accent-color)] disabled:cursor-not-allowed disabled:opacity-30"
                      />
                    </td>
                    <td className="px-4 py-2">
                      {registration.user?.username ||
                        `${registration.user?.firstname || ""} ${registration.user?.lastname || ""}`.trim() ||
                        "-"}
                    </td>
                    <td className="px-4 py-2">{registration.user?.email || "-"}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">
                      {registeredGameLabels(registration).join(", ") || "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="mb-3 text-sm font-medium text-foreground">
        Teams <span className="text-muted-foreground">({teams.length})</span>
      </h2>

      {teams.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--background)] p-4 text-sm text-muted-foreground">
          No teams registered for this tournament yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-[var(--border-color)]">
          <table className="min-w-full text-sm">
            <thead className="bg-[var(--secondary-color)] text-[var(--foreground)]">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Team</th>
                <th className="px-4 py-2 text-left font-medium">Game</th>
                <th className="px-4 py-2 text-left font-medium">Members</th>
                <th className="px-4 py-2 text-left font-medium">Checked In</th>
                <th className="px-4 py-2 text-left font-medium">Created By</th>
                <th className="px-4 py-2 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-[var(--background)] text-[var(--foreground)]">
              {teams.map((team) => (
                <tr key={team._id} className="border-t border-[var(--border-color)]">
                  <td className="px-4 py-2 font-medium">
                    {team.name}
                    <span className="ml-1 text-xs font-normal text-muted-foreground">#{team.serialNo}</span>
                  </td>
                  <td className="px-4 py-2">
                    {games.find((g) => g._id === team.gameConfigId)?.eventTitle || team.game?.name || "N/A"}
                  </td>
                  <td className="px-4 py-2">
                    {team.members?.length > 0
                      ? team.members
                          .map((member) => member.username || `${member.firstname || ""} ${member.lastname || ""}`)
                          .join(", ")
                      : "No members"}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className="rounded-full px-2.5 py-1 text-xs font-semibold"
                      style={{
                        background: team.checkedIn
                          ? "color-mix(in srgb, var(--success-color) 14%, transparent)"
                          : "color-mix(in srgb, var(--muted-foreground) 14%, transparent)",
                        color: team.checkedIn ? "var(--success-color)" : "var(--muted-foreground)",
                      }}
                    >
                      {team.checkedIn ? "Checked In" : "Not Yet"}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    {team.createdBy?.username ||
                      `${team.createdBy?.firstname || ""} ${team.createdBy?.lastname || ""}` ||
                      "N/A"}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setEditingTeamId(team._id)}
                        className="text-muted-foreground transition hover:text-[var(--accent-color)]"
                        aria-label={`Edit ${team.name}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTeam(team._id)}
                        className="text-muted-foreground transition hover:text-red-500"
                        aria-label={`Delete ${team.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editingTeamId && (
        <EditTeamForm
          team={teams.find((t) => t._id === editingTeamId)}
          onClose={() => setEditingTeamId(null)}
          onUpdated={fetchTeams}
        />
      )}
    </div>
  );
}
