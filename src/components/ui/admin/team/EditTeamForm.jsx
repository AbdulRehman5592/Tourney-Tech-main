"use client";

import { useState, useEffect } from "react";
import api from "@/utils/axios";
import { toast } from "react-hot-toast";
import SearchableSelect from "@/components/ui/admin/team/Select";

export default function EditTeamForm({ team, onClose, onUpdated }) {
  const [tournaments, setTournaments] = useState([]);
  const [games, setGames] = useState([]);
  const [users, setUsers] = useState([]);

  const [form, setForm] = useState({
    tournament: null,
    game: null,
    members: [],
    tournamentTeamType: null,
  });

  // ✅ Load tournaments
  useEffect(() => {
    async function fetchTournaments() {
      try {
        const res = await api.get("/api/tournaments");
        let fetchedTournaments =
          (res.data?.data || []).map((t) => ({
            value: t._id,
            label: t.name || "Unnamed Tournament",
            games: (t.games || []).map((g) => ({
              value: g.game?._id,
              label: g.game?.name || "Unknown Game",
              tournamentTeamType: g.tournamentTeamType || "single_player",
            })),
          })) || [];

        // ensure prefilled tournament is in options
        if (
          team?.tournament &&
          !fetchedTournaments.some((t) => t.value === team.tournament._id)
        ) {
          fetchedTournaments.push({
            value: team.tournament._id,
            label: team.tournament.name,
            games: (team.tournament.games || []).map((g) => ({
              value: g.game?._id,
              label: g.game?.name || "Unknown Game",
              tournamentTeamType: g.tournamentTeamType,
            })),
          });
        }

        setTournaments(fetchedTournaments);
      } catch {
        toast.error("Failed to load tournaments");
      }
    }
    fetchTournaments();
  }, [team]);

  // ✅ Prefill form
  useEffect(() => {
    if (team) {
      setForm({
        tournament: team.tournament
          ? { value: team.tournament._id, label: team.tournament.name }
          : null,
        game: team.game
          ? {
              value: team.game._id,
              label: team.game.name,
              tournamentTeamType: team.tournamentTeamType,
            }
          : null,
        members: team.members.map((m) => m._id),
        tournamentTeamType: team.tournamentTeamType
          ? {
              value: team.tournamentTeamType,
              label:
                team.tournamentTeamType === "single_player"
                  ? "Single Player"
                  : "Double Player",
            }
          : null,
      });
    }
  }, [team]);

  // ✅ Load games when tournament changes
  useEffect(() => {
    if (form.tournament) {
      const selected = tournaments.find(
        (t) => t.value === form.tournament.value
      );
      setGames(selected?.games || []);
    } else {
      setGames([]);
    }
  }, [form.tournament, tournaments]);

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

    if (!form.tournament || !form.game || !form.tournamentTeamType) {
      toast.error("Tournament, game, and team type required");
      return;
    }

    if (
      form.tournamentTeamType.value === "double_player" &&
      form.members.length !== 2
    ) {
      toast.error("Exactly 2 members required");
      return;
    }

    if (
      form.tournamentTeamType.value === "single_player" &&
      form.members.length !== 1
    ) {
      toast.error("Exactly 1 member required");
      return;
    }

    try {
      const { data } = await api.patch(`/api/team/${team._id}`, {
        tournament: form.tournament.value,
        game: form.game.value,
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
          <SearchableSelect
            label="Tournament"
            options={tournaments}
            value={form.tournament}
            onChange={(val) => setForm({ ...form, tournament: val, game: null })}
            placeholder="Select tournament"
          />

          <SearchableSelect
            label="Game"
            options={games}
            value={form.game}
            onChange={(val) => {
              setForm({
                ...form,
                game: val,
                tournamentTeamType: val
                  ? {
                      value: val.tournamentTeamType,
                      label:
                        val.tournamentTeamType === "single_player"
                          ? "Single Player"
                          : "Double Player",
                    }
                  : null,
              });
            }}
            placeholder="Select game"
          />

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
