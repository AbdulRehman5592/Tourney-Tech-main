"use client";

import { useState, useEffect } from "react";
import api from "@/utils/axios";
import { toast } from "react-hot-toast";
import SearchableSelect from "@/components/ui/admin/team/Select";

// Tournament and game are fixed at team creation (gameConfigId ties a team to
// one specific scheduled instance that matches/brackets are already keyed
// off of) -- editing only re-assigns members, never moves a team to a
// different tournament/game.
export default function EditTeamForm({ team, onClose, onUpdated }) {
  const [users, setUsers] = useState([]);

  const [form, setForm] = useState({
    tournamentTeamType: null,
    members: [],
  });

  // ✅ Prefill form
  useEffect(() => {
    if (team) {
      // Team documents don't carry tournamentTeamType directly -- it lives on
      // the matching entry in tournament.games, keyed by gameConfigId (falling
      // back to matching by game id if gameConfigId isn't available).
      const gameConfig = team.tournament?.games?.find((g) =>
        team.gameConfigId
          ? g._id?.toString() === team.gameConfigId?.toString()
          : g.game?.toString() === team.game?._id?.toString()
      );
      const resolvedTeamType = gameConfig?.tournamentTeamType;

      setForm({
        tournamentTeamType: resolvedTeamType
          ? {
              value: resolvedTeamType,
              label:
                resolvedTeamType === "single_player"
                  ? "Single Player"
                  : "Double Player",
            }
          : null,
        members: team.members.map((m) => m._id),
      });
    }
  }, [team]);

  // ✅ Load users
  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await api.get("/api/users");
        setUsers(
          (res.data?.data || []).map((u) => ({
            value: u._id,
            label: `${u.firstname || ""} ${u.lastname || ""} (${
              u.username || "unknown"
            })`,
          }))
        );
      } catch {
        toast.error("Failed to load members");
      }
    }
    fetchUsers();
  }, []);

  // ✅ Submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      form.tournamentTeamType?.value === "double_player" &&
      form.members.length !== 2
    ) {
      toast.error("Exactly 2 members required");
      return;
    }

    if (
      form.tournamentTeamType?.value === "single_player" &&
      form.members.length !== 1
    ) {
      toast.error("Exactly 1 member required");
      return;
    }

    try {
      const { data } = await api.patch(`/api/team/${team._id}`, {
        members: form.members,
      });

      toast.success(data.message || "Team updated successfully");
      onUpdated();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[var(--card-background)] p-6 rounded-xl w-[500px] max-w-full">
        <h2 className="text-xl font-bold mb-4">Edit Team</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Tournament</label>
            <div className="p-2 rounded border border-[var(--border-color)] bg-[var(--secondary-color)] text-[var(--foreground)] opacity-80">
              {team?.tournament?.name || "N/A"}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Game</label>
            <div className="p-2 rounded border border-[var(--border-color)] bg-[var(--secondary-color)] text-[var(--foreground)] opacity-80">
              {team?.game?.name || "N/A"}
            </div>
          </div>

          <SearchableSelect
            label="Member 1 ( Team Leader )"
            options={users}
            value={users.find((u) => u.value === form.members[0]) || null}
            onChange={(val) =>
              setForm({
                ...form,
                members: [val?.value || null, form.members[1] || null].filter(
                  Boolean
                ),
              })
            }
            placeholder="Select first member"
          />

          {form.tournamentTeamType?.value === "double_player" && (
            <SearchableSelect
              label="Member 2"
              options={users}
              value={users.find((u) => u.value === form.members[1]) || null}
              onChange={(val) =>
                setForm({
                  ...form,
                  members: [form.members[0] || null, val?.value || null].filter(
                    Boolean
                  ),
                })
              }
              placeholder="Select second member"
            />
          )}

          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-500 text-white rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[var(--primary-color)] text-white rounded"
            >
              Update Team
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
