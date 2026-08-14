"use client";
import { useState, useEffect } from "react";
import api from "@/utils/axios";
import { toast } from "react-hot-toast";
import { GENDER_COLORS } from "@/constants/genderColors";
import InviteFriendModal from "@/components/ui/dashboard/team/InviteFriendModal";

const MODE_LABELS = { doubles: "Doubles", mixed_doubles: "Mixed Doubles" };

function isMixedDoublesGenderOk(genderA, genderB) {
  if (genderA === "male" && genderB === "male") return false;
  if (genderA === "female" && genderB === "female") return false;
  return true;
}

export default function TeamUp() {
  const [search, setSearch] = useState("");
  const [players, setPlayers] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  // All pending/accepted requests involving the current user, keyed by the
  // *other* player's id -- this is the source of truth for what a card shows,
  // instead of local-only state that used to reset on every page refresh.
  const [requestsByPlayer, setRequestsByPlayer] = useState({});

  // Store per-player tournament + game + mode selections
  const [selectedTournamentIds, setSelectedTournamentIds] = useState({});
  const [showInviteModal, setShowInviteModal] = useState(false);

  // ✅ Fetch every player on the site + every tournament/game that has
  // Doubles or Mixed Doubles enabled (site-wide, not scoped to the viewer).
  const fetchPlayers = async () => {
    try {
      const [similarRes, teamupRes] = await Promise.all([
        api.get("/api/tournaments/similar-players"),
        api.get("/api/teamup"),
      ]);
      const data = similarRes.data?.data || {};
      const me = data.currentUser || null;
      setCurrentUser(me);
      setTournaments(data.tournaments || []);

      const formatted = (data.players || []).map((u) => ({
        id: u._id,
        firstname: u.firstname || "",
        lastname: u.lastname || "",
        username: u.username || "",
        city: u.city || "Unknown",
        gender: u.gender || "Not specified",
      }));
      setPlayers(formatted);

      const myRequests = teamupRes.data?.data?.requests || [];
      const byPlayer = {};
      myRequests.forEach((r) => {
        if (!me) return;
        const otherId = r.from?._id === me._id ? r.to?._id : r.from?._id;
        if (!otherId) return;
        if (!byPlayer[otherId]) byPlayer[otherId] = [];
        byPlayer[otherId].push(r);
      });
      setRequestsByPlayer(byPlayer);
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
    const mode = selected?.mode;

    if (!tournamentId) {
      toast.error("Please select a tournament first!");
      return;
    }
    if (!gameId) {
      toast.error("Please select a game!");
      return;
    }
    if (!mode) {
      toast.error("Please select Doubles or Mixed Doubles!");
      return;
    }

    try {
      const payload = { to: id, tournamentId, gameId, mode };
      await api.post("/api/teamup", payload);
      toast.success("Team-up request sent!");
      fetchPlayers();
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

  const handleCancel = async (requestId) => {
    try {
      await api.delete(`/api/teamup/${requestId}`);
      toast.success("Request cancelled");
      fetchPlayers();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to cancel request");
    }
  };

  const handleDropPartner = async (requestId) => {
    if (!window.confirm("Drop this partner? This cannot be undone.")) return;
    try {
      await api.delete(`/api/teamup/${requestId}`);
      toast.success("Partner dropped");
      fetchPlayers();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to drop partner");
    }
  };

  // ✅ Filter by search only -- every player on the site is browsable
  const filteredPlayers = players.filter((p) =>
    `${p.firstname} ${p.lastname} ${p.username}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div
      style={{ background: "var(--background)", color: "var(--foreground)" }}
    >
      <h1 className="text-2xl font-bold mb-6">Team Up</h1>

      {!loading && tournaments.length === 0 && (
        <p
          className="mb-6 p-3 rounded-lg text-sm"
          style={{ background: "var(--secondary-color)" }}
        >
          No tournaments currently have Doubles or Mixed Doubles enabled. Ask
          an admin to enable it on a tournament's game first.
        </p>
      )}

      {/* 🔍 Search + Invite */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
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
        <button
          type="button"
          onClick={() => setShowInviteModal(true)}
          disabled={tournaments.length === 0}
          className="whitespace-nowrap font-semibold py-2 px-4 rounded-lg disabled:opacity-50"
          style={{ background: "var(--accent-color)", color: "black" }}
        >
          Invite a Friend to Sign Up
        </button>
      </div>

      {showInviteModal && (
        <InviteFriendModal
          tournaments={tournaments}
          onClose={() => setShowInviteModal(false)}
        />
      )}

      {/* 🧍 Players */}
      {loading ? (
        <p className="text-center">Loading players...</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPlayers.length > 0 ? (
            filteredPlayers.map((player) => {
              const selected = selectedTournamentIds[player.id] || {};
              const selectedTournamentData = tournaments.find(
                (t) => t._id === selected.tournamentId
              );
              const selectedGameData = (selectedTournamentData?.games || []).find(
                (g) => g._id === selected.gameId
              );
              const genderConflict =
                selected.mode === "mixed_doubles" &&
                !isMixedDoublesGenderOk(currentUser?.gender, player.gender);

              const existingRequests = requestsByPlayer[player.id] || [];
              const acceptedRequests = existingRequests.filter(
                (r) => r.status === "accepted"
              );
              const pendingRequests = existingRequests.filter(
                (r) => r.status === "pending"
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
                    <span style={{ color: GENDER_COLORS[player.gender] || "inherit" }}>
                      {player.firstname} {player.lastname}
                    </span>
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

                  {/* ✅ Confirmed partnerships -- reflects real server state,
                      so this survives page refresh and shows up for both
                      sides of the pairing. */}
                  {acceptedRequests.length > 0 && (
                    <div className="mt-3 flex flex-col gap-2">
                      {acceptedRequests.map((r) => (
                        <div
                          key={r._id}
                          className="p-3 rounded-lg border"
                          style={{ borderColor: "var(--success-color)" }}
                        >
                          <p
                            className="text-sm font-semibold"
                            style={{ color: "var(--success-color)" }}
                          >
                            ✅ Partnered — {r.tournament?.name || "Tournament"}
                          </p>
                          <p className="text-xs opacity-80">
                            {MODE_LABELS[r.mode] || r.mode}
                          </p>
                          <button
                            type="button"
                            className="mt-2 w-full py-1.5 px-3 rounded-lg text-sm font-semibold"
                            style={{ background: "var(--error-color)", color: "white" }}
                            onClick={() => handleDropPartner(r._id)}
                          >
                            Drop Partner
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {pendingRequests.length > 0 && (
                    <div className="mt-3 flex flex-col gap-2">
                      {pendingRequests.map((r) => {
                        const sentByMe = r.from?._id === currentUser?._id;
                        return (
                          <div
                            key={r._id}
                            className="p-3 rounded-lg border"
                            style={{ borderColor: "var(--border-color)" }}
                          >
                            <p className="text-xs">
                              {sentByMe
                                ? `Request pending — ${r.tournament?.name || "Tournament"}`
                                : `They want to team up with you — see Received Requests`}
                            </p>
                            {sentByMe && (
                              <button
                                type="button"
                                className="mt-2 w-full py-1.5 px-3 rounded-lg text-sm font-semibold"
                                style={{ background: "var(--error-color)", color: "white" }}
                                onClick={() => handleCancel(r._id)}
                              >
                                Cancel Request
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

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
                              mode: "",
                            },
                          }))
                        }
                        className="w-full p-2 rounded-lg bg-[var(--card-background)] border border-[var(--border-color)] focus:outline-none"
                      >
                        <option value="">Select Tournament</option>
                        {tournaments.map((t) => (
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
                                mode: "",
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

                      {/* 🏸 Mode Select -- only the modes enabled for this game */}
                      {selectedGameData && (
                        <select
                          value={selected.mode || ""}
                          onChange={(e) =>
                            setSelectedTournamentIds((prev) => ({
                              ...prev,
                              [player.id]: {
                                ...prev[player.id],
                                mode: e.target.value,
                              },
                            }))
                          }
                          className="w-full p-2 rounded-lg bg-[var(--card-background)] border border-[var(--border-color)] focus:outline-none"
                        >
                          <option value="">Select Doubles Type</option>
                          {selectedGameData.doublesEnabled && (
                            <option value="doubles">
                              Doubles (${selectedGameData.doublesCost}/pair)
                            </option>
                          )}
                          {selectedGameData.mixedDoublesEnabled && (
                            <option value="mixed_doubles">
                              Mixed Doubles (${selectedGameData.mixedDoublesCost}/pair)
                            </option>
                          )}
                        </select>
                      )}

                      {genderConflict && (
                        <p className="text-xs" style={{ color: "var(--error-color)" }}>
                          Mixed doubles requires opposite genders.
                        </p>
                      )}

                      <button
                        type="button"
                        disabled={genderConflict}
                        className="w-full font-semibold py-2 px-4 rounded-lg shadow-md transition duration-200 disabled:opacity-50"
                        style={{
                          background: "var(--accent-color)",
                          color: "black",
                        }}
                        onClick={() => handleRequest(player.id)}
                      >
                        Send Request
                      </button>
                    </div>
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
