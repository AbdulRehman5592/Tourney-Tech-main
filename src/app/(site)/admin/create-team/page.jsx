"use client";

import { useState, useEffect } from "react";
import api from "@/utils/axios";
import { toast } from "react-hot-toast";
import SearchableSelect from "@/components/ui/admin/team/Select";

export default function TeamForm() {
  const [openSelect, setOpenSelect] = useState(null);
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
        console.log("Tournament API response:", res.data);

        const tournamentsData = res.data.data || res.data.tournaments || res.data;

        setTournaments(
          (tournamentsData || []).map((t) => ({
            value: t._id,
            label: t.name || "Unnamed Tournament",
            games: (t.games || []).map((g) => ({
              value: g.game?._id,
              label: g.game?.name || "Unknown Game",
              tournamentTeamType: g.tournamentTeamType || "single_player",
            })),
          }))
        );
      } catch (err) {
        console.error("Tournament fetch error:", err);
        toast.error("Failed to load tournaments");
      }
    }
    fetchTournaments();
  }, []);

  // ✅ When tournament changes → set games
  useEffect(() => {
    if (form.tournament) {
      const selectedTournament = tournaments.find(
        (t) => t.value === form.tournament.value
      );
      if (selectedTournament) {
        setGames(selectedTournament.games || []);
      }
    } else {
      setGames([]);
    }

    setForm((prev) => ({
      ...prev,
      game: null,
      members: [],
      tournamentTeamType: null,
    }));
  }, [form.tournament, tournaments]);

  // ✅ Fetch members once
  useEffect(() => {
    async function fetchMembers() {
      try {
        const res = await api.get("/api/users");
        setUsers(
          (res.data?.data || []).map((u) => ({
            value: u._id,
            label: `${u.firstname || ""} ${u.lastname || ""} (${u.username || "unknown"})`,
          }))
        );
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to load members");
        setUsers([]);
      }
    }
    fetchMembers();
  }, []);

  // ✅ When game changes → auto set team type
  useEffect(() => {
    if (form.game) {
      const selectedGame = games.find((g) => g.value === form.game.value);
      if (selectedGame) {
        setForm((prev) => ({
          ...prev,
          tournamentTeamType: {
            value: selectedGame.tournamentTeamType,
            label:
              selectedGame.tournamentTeamType === "single_player"
                ? "Single Player"
                : "Double Player",
          },
        }));
      }
    }
  }, [form.game, games]);

  // ✅ Submit
const handleSubmit = async (e) => {
  e.preventDefault();

  if (!form.tournament || !form.game || !form.tournamentTeamType) {
    toast.error("Tournament, game, and team type are required");
    return;
  }

  if (
    form.tournamentTeamType.value === "double_player" &&
    form.members.length !== 2
  ) {
    toast.error("Exactly 2 members required for double player teams");
    return;
  }

  if (
    form.tournamentTeamType.value === "single_player" &&
    form.members.length !== 1
  ) {
    toast.error("Exactly 1 member required for single player teams");
    return;
  }

  try {
    console.log("Submitting team:", {
      tournament: form.tournament.value,
      game: form.game.value,
      members: form.members,
    });

    await api.post("/api/team", {
      tournament: form.tournament.value,
      game: form.game.value,
      members: form.members,
    });

    toast.success("Team created successfully");

    // ✅ only reset form, NOT users
    setForm({
      tournament: null,
      game: null,
      members: [],
      tournamentTeamType: null,
    });
    setGames([]); // optional: clear games when tournament resets
  } catch (err) {
    toast.error(err.response?.data?.message || "Failed to create team");
  }
};


  return (
    <form
      onSubmit={handleSubmit}
      className="p-6 bg-[var(--card-background)] rounded-xl shadow-md space-y-4"
    >
      <h2 className="text-xl font-bold mb-2">Create Team</h2>

      <SearchableSelect
        label="Tournament"
        options={tournaments}
        value={form.tournament}
        onChange={(val) => setForm({ ...form, tournament: val })}
        placeholder="Select tournament"
        isOpen={openSelect === "tournament"}
        onOpen={() => setOpenSelect("tournament")}
        onClose={() => setOpenSelect(null)}
      />

      {form.tournament && (
        <SearchableSelect
          label="Game"
          options={games}
          value={form.game}
          onChange={(val) => setForm({ ...form, game: val })}
          placeholder="Select game..."
          isOpen={openSelect === "game"}
          onOpen={() => setOpenSelect("game")}
          onClose={() => setOpenSelect(null)}
        />
      )}

      <SearchableSelect
        label="Member 1 (Team Leader)"
        options={users}
        value={users.find((u) => u.value === form.members[0]) || null}
        onChange={(val) =>
          setForm({
            ...form,
            members: [val?.value || null, form.members[1] || null],
          })
        }
        placeholder="Select first member..."
        isOpen={openSelect === "member1"}
        onOpen={() => setOpenSelect("member1")}
        onClose={() => setOpenSelect(null)}
      />

      {form.tournamentTeamType?.value === "double_player" && (
        <SearchableSelect
          label="Member 2"
          options={users}
          value={users.find((u) => u.value === form.members[1]) || null}
          onChange={(val) =>
            setForm({
              ...form,
              members: [form.members[0] || null, val?.value || null],
            })
          }
          placeholder="Select second member..."
          isOpen={openSelect === "member2"}
          onOpen={() => setOpenSelect("member2")}
          onClose={() => setOpenSelect(null)}
        />
      )}

      <button
        type="submit"
        className="w-full bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-white py-2 px-4 rounded-lg transition"
      >
        Create Team
      </button>
    </form>
  );
}
