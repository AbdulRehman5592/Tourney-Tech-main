"use client";
import { useState, useEffect } from "react";
import api from "@/utils/axios";
import { toast } from "react-hot-toast";

export default function TeamUp() {
  const [search, setSearch] = useState("");
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [tournamentList, setTournamentList] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState("all");

  // Store per-player tournament + game selections
  const [selectedTournamentIds, setSelectedTournamentIds] = useState({});

  // ✅ Fetch players and tournaments
  const fetchPlayers = async () => {
    try {
      const res = await api.get("/api/tournaments/similar-players");
      const matchedUsers = res.data?.data?.matchedUsers || [];

      // Extract unique tournaments from all players
      const tournamentsMap = new Map();
      matchedUsers.forEach((u) => {
        u.tournaments?.forEach((t) => {
          if (t?._id && !tournamentsMap.has(t._id)) {
            tournamentsMap.set(t._id, t);
          }
        });
      });
      setTournamentList(Array.from(tournamentsMap.values()));

      // Format players
      const formatted = matchedUsers.map((u) => ({
        id: u._id,
        firstname: u.firstname || "",
        lastname: u.lastname || "",
        username: u.username || "",
        city: u.city || "Unknown",
        gender: u.gender || "Not specified",
        tournaments: u.tournaments || [],
        requested: false,
      }));

      setPlayers(formatted);
    } catch (err) {
      console.error("❌ Failed to fetch players:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlayers();
  }, []);

  // ✅ Send team-up request
  const handleRequest = async (id) => {
    const selected = selectedTournamentIds[id];
    const tournamentId = selected?.tournamentId;
    const gameId = selected?.gameId;

    if (!tournamentId) {
      toast.error("Please select a tournament first!");
      return;
    }
    if (!gameId) {
      toast.error("Please select a game!");
      return;
    }

    try {
      const payload = { to: id, tournamentId, gameId };
      await api.post("/api/teamup", payload);

      setPlayers((prev) =>
        prev.map((p) => (p.id === id ? { ...p, requested: true } : p))
      );

      toast.success("Team-up request sent!");
    } catch (err) {
      console.error("❌ Failed to send request:", err);
      const msg = err.response?.data?.message;
      if (msg?.includes("E11000")) {
        toast.error("You already sent a request to this player");
      } else {
        toast.error(msg || "Failed to send request");
      }
    }
  };

  const handleCancel = (id) => {
    setPlayers((prev) =>
      prev.map((p) => (p.id === id ? { ...p, requested: false } : p))
    );
    toast("Request cancelled (local only)");
  };

  // ✅ Filter by search and tournament
  const filteredPlayers = players.filter((p) => {
    const matchesSearch = `${p.firstname} ${p.lastname} ${p.username}`
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesTournament =
      selectedTournament === "all" ||
      p.tournaments.some((t) => t._id === selectedTournament);
    return matchesSearch && matchesTournament;
  });

  return (
    <div
      style={{ background: "var(--background)", color: "var(--foreground)" }}
    >
      <h1 className="text-2xl font-bold mb-6">Team Up</h1>

      {/* 🔍 Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3 items-center">
        <input
          type="text"
          placeholder="Search players..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-1/2 rounded-lg px-4 py-2"
          style={{
            background: "var(--secondary-color)",
            border: `1px solid var(--border-color)`,
            color: "var(--foreground)",
          }}
        />

        <select
          value={selectedTournament}
          onChange={(e) => setSelectedTournament(e.target.value)}
          className="w-full sm:w-1/4 p-2 rounded-lg bg-[var(--card-background)] border border-[var(--border-color)] focus:outline-none"
        >
          <option value="all">All Tournaments</option>
          {tournamentList.map((t) => (
            <option key={t._id} value={t._id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {/* 🧍 Players */}
      {loading ? (
        <p className="text-center">Loading players...</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPlayers.length > 0 ? (
            filteredPlayers.map((player) => {
              const selected = selectedTournamentIds[player.id] || {};
              const selectedTournamentData = player.tournaments.find(
                (t) => t._id === selected.tournamentId
              );

              return (
                <div
                  key={player.id}
                  className="p-5 rounded-2xl shadow-md transition hover:shadow-lg"
                  style={{
                    background: "var(--card-background)",
                    border: `1px solid var(--border-color)`,
                  }}
                >
                  <h2 className="text-lg font-semibold mb-2 capitalize">
                    {player.firstname} {player.lastname}
                  </h2>
                  <p className="text-sm">
                    <span className="font-semibold">Username:</span>{" "}
                    {player.username}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">Location:</span>{" "}
                    {player.city}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">Gender:</span>{" "}
                    {player.gender}
                  </p>

                  {!player.requested ? (
                    <div className="pt-4 flex flex-col gap-2">
                      {/* 🎯 Tournament Select */}
                      <select
                        value={selected.tournamentId || ""}
                        onChange={(e) =>
                          setSelectedTournamentIds((prev) => ({
                            ...prev,
                            [player.id]: {
                              tournamentId: e.target.value,
                              gameId: "",
                            },
                          }))
                        }
                        className="w-full p-2 rounded-lg bg-[var(--card-background)] border border-[var(--border-color)] focus:outline-none"
                      >
                        <option value="">Select Tournament</option>
                        {player.tournaments.map((t) => (
                          <option key={t._id} value={t._id}>
                            {t.name}
                          </option>
                        ))}
                      </select>

                      {/* 🎮 Game Select */}
                      {selectedTournamentData && (
                        <select
                          value={selected.gameId || ""}
                          onChange={(e) =>
                            setSelectedTournamentIds((prev) => ({
                              ...prev,
                              [player.id]: {
                                ...prev[player.id],
                                gameId: e.target.value,
                              },
                            }))
                          }
                          className="w-full p-2 rounded-lg bg-[var(--card-background)] border border-[var(--border-color)] focus:outline-none"
                        >
                          <option value="">Select Game</option>
                          {(selectedTournamentData.games || []).map((g) => (
                            <option key={g._id} value={g._id}>
                              {g.name}
                            </option>
                          ))}
                        </select>
                      )}

                      <button
                        type="button"
                        className="w-full font-semibold py-2 px-4 rounded-lg shadow-md transition duration-200"
                        style={{
                          background: "var(--accent-color)",
                          color: "black",
                        }}
                        onClick={() => handleRequest(player.id)}
                      >
                        Send Request
                      </button>
                    </div>
                  ) : (
                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        className="flex-1 font-semibold py-2 px-4 rounded-lg shadow-md cursor-default"
                        style={{
                          background: "var(--success-color)",
                          color: "white",
                        }}
                      >
                        Requested
                      </button>
                      <button
                        type="button"
                        className="px-4 py-2 rounded-lg shadow-md font-semibold transition duration-200"
                        style={{
                          background: "var(--error-color)",
                          color: "white",
                        }}
                        onClick={() => handleCancel(player.id)}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <p className="col-span-full text-center text-sm opacity-75">
              No players found.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
