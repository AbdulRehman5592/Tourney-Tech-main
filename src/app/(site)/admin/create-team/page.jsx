"use client";

import { useState, useEffect } from "react";
import api from "@/utils/axios";
import { toast } from "react-hot-toast";
import SearchableSelect from "@/components/ui/admin/team/Select";

export default function TeamForm() {
  const [openSelect, setOpenSelect] = useState(null);
  const [tournaments, setTournaments] = useState([]);
  const [games, setGames] = useState([]);
  // Registrations + teams for the currently-selected tournament -- used to
  // work out, per game, which registered players are still available to
  // team up vs. already on a team, instead of listing every player in the
  // system with no indication either way.
  const [registrations, setRegistrations] = useState([]);
  const [teams, setTeams] = useState([]);
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
              // Keyed by the specific scheduled instance (subdocument id),
              // not the catalog game id -- the same catalog game can be
              // scheduled more than once as fully independent competitions.
              value: g._id,
              label: g.eventTitle || g.game?.name || "Unknown Game",
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

  // ✅ When tournament changes → set games, and load who's registered/teamed
  useEffect(() => {
    if (form.tournament) {
      const selectedTournament = tournaments.find(
        (t) => t.value === form.tournament.value
      );
      if (selectedTournament) {
        setGames(selectedTournament.games || []);
      }

      const tournamentId = form.tournament.value;
      Promise.all([
        api.get("/api/tournamentRegister"),
        api.get(`/api/team?tournament=${tournamentId}`),
      ])
        .then(([regRes, teamRes]) => {
          setRegistrations(
            (regRes.data?.data || []).filter(
              (r) => (r.tournament?._id || r.tournament) === tournamentId
            )
          );
          setTeams(teamRes.data?.data || []);
        })
        .catch((err) => {
          console.error("Failed to load registrations/teams:", err);
          toast.error("Failed to load registered players");
        });
    } else {
      setGames([]);
      setRegistrations([]);
      setTeams([]);
    }

    setForm((prev) => ({
      ...prev,
      game: null,
      members: [],
      tournamentTeamType: null,
    }));
  }, [form.tournament, tournaments]);

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

  const activeGameConfigIdsOf = (registration) =>
    (registration.gameEntries || [])
      .filter((e) => !e.removed && !e.cancelled)
      .map((e) => String(e.gameConfigId));

  // Registered-for-this-game players, split into who's still available to
  // team up vs. who's already on a team for this specific game.
  const gameConfigId = form.game?.value;
  const registeredForGame = gameConfigId
    ? registrations.filter((r) => activeGameConfigIdsOf(r).includes(gameConfigId))
    : [];
  const teamedUserIds = new Set(
    teams
      .filter((t) => String(t.gameConfigId) === gameConfigId)
      .flatMap((t) => (t.members || []).map((m) => m._id))
  );
  const teamNameForUser = (userId) =>
    teams.find(
      (t) =>
        String(t.gameConfigId) === gameConfigId &&
        (t.members || []).some((m) => m._id === userId)
    )?.name;

  // Member dropdown options -- every player registered for the selected
  // game, each tagged with a colored badge showing availability right in
  // the list (instead of a separate hard-to-scan block below). Already-
  // teamed players stay visible for context but aren't selectable.
  const memberOptions = registeredForGame.map((r) => {
    const teamed = teamedUserIds.has(r.user?._id);
    return {
      value: r.user?._id,
      label:
        r.user?.username ||
        `${r.user?.firstname || ""} ${r.user?.lastname || ""}`.trim() ||
        "Unknown player",
      disabled: teamed,
      badge: teamed
        ? {
            text: teamNameForUser(r.user?._id) || "Teamed up",
            bg: "color-mix(in srgb, var(--muted-foreground) 22%, transparent)",
            color: "var(--muted-foreground)",
          }
        : {
            text: "Available",
            bg: "color-mix(in srgb, var(--success-color) 22%, transparent)",
            color: "var(--success-color)",
          },
    };
  });

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

  if (
    form.members.length === 2 &&
    form.members[0] &&
    form.members[0] === form.members[1]
  ) {
    toast.error("Member 1 and Member 2 must be different players");
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
      gameConfigId: form.game.value,
      members: form.members,
    });

    toast.success("Team created successfully");

    // ✅ Reset the form, then reload this tournament's registrations/teams so
    // the just-teamed players immediately drop out of the available list.
    const tournamentId = form.tournament.value;
    setForm({
      tournament: form.tournament,
      game: null,
      members: [],
      tournamentTeamType: null,
    });
    api
      .get(`/api/team?tournament=${tournamentId}`)
      .then((res) => setTeams(res.data?.data || []))
      .catch(() => {});
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

      {form.game && (
        <>
          <SearchableSelect
            label="Member 1 (Team Leader)"
            options={memberOptions.filter((u) => u.value !== form.members[1])}
            value={memberOptions.find((u) => u.value === form.members[0]) || null}
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
              // Can't be the same player already picked as Member 1.
              options={memberOptions.filter((u) => u.value !== form.members[0])}
              value={memberOptions.find((u) => u.value === form.members[1]) || null}
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

          {registeredForGame.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No players are registered for this game yet.
            </p>
          )}
        </>
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
