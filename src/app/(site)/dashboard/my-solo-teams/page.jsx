"use client";

import { useEffect, useState } from "react";
import api from "@/utils/axios";
import { toast } from "react-hot-toast";

// Self-service team creation for single-player games -- there's no partner to
// find here, so a registered player can just create their own one-person
// team directly, instead of going through the teamup request/accept flow
// used for double-player games.
export default function MySoloTeamsPage() {
  const [currentUserId, setCurrentUserId] = useState(null);
  const [entries, setEntries] = useState([]); // one row per registered single-player game
  const [loading, setLoading] = useState(true);
  const [creatingKey, setCreatingKey] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const meRes = await api.get("/api/me");
        const userId = meRes?.data?.data?.user?._id;
        setCurrentUserId(userId);

        const res = await api.get("/api/tournamentRegister");
        const allRegistrations = res.data?.data || [];
        const myRegistrations = allRegistrations.filter(
          (r) => (r.user?._id || r.user) === userId
        );

        const rows = [];
        for (const reg of myRegistrations) {
          const tournament = reg.tournament;
          if (!tournament) continue;
          const games = reg.gameRegistrationDetails?.games || [];
          const gameConfigIds = reg.gameRegistrationDetails?.gameConfigIds || [];
          // Each `games[i]` pairs with `gameConfigIds[i]` -- the specific
          // scheduled instance (Tournament.games[]._id), not the catalog
          // game id, since the same catalog game can be scheduled more than
          // once as fully independent competitions.
          games.forEach((game, i) => {
            const gameConfigId = gameConfigIds[i]?.toString();
            const gameConfig = (tournament.games || []).find(
              (g) => g._id === gameConfigId
            );
            if (gameConfig?.tournamentTeamType !== "single_player") return;
            rows.push({
              key: `${tournament._id}-${gameConfigId}`,
              tournamentId: tournament._id,
              tournamentName: tournament.name,
              gameId: gameConfigId,
              gameName: game.name,
              hasTeam: !!reg.gameRegistrationDetails?.team,
            });
          });
        }
        setEntries(rows);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load your registrations");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleCreateTeam = async (entry) => {
    setCreatingKey(entry.key);
    try {
      const formData = new FormData();
      formData.append("tournamentId", entry.tournamentId);
      formData.append("gameId", entry.gameId);
      await api.post("/api/team/create-solo", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Team created successfully");
      setEntries((prev) =>
        prev.map((e) => (e.key === entry.key ? { ...e, hasTeam: true } : e))
      );
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create team");
    } finally {
      setCreatingKey(null);
    }
  };

  if (loading) {
    return <p style={{ color: "var(--foreground)" }}>Loading...</p>;
  }

  return (
    <div
      className="w-full p-6 rounded-2xl shadow-lg space-y-4"
      style={{
        background: "var(--card-background)",
        border: "1px solid var(--border-color)",
      }}
    >
      <div>
        <h2 className="text-xl font-bold" style={{ color: "var(--accent-color)" }}>
          My Solo Teams
        </h2>
        <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
          For single-player games, you don't need a partner -- just create your
          own team below.
        </p>
      </div>

      {entries.length === 0 ? (
        <p style={{ color: "var(--foreground)" }}>
          No single-player game registrations found.
        </p>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div
              key={entry.key}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl p-4"
              style={{ border: "1px solid var(--border-color)" }}
            >
              <div>
                <p className="font-semibold" style={{ color: "var(--foreground)" }}>
                  {entry.tournamentName}
                </p>
                <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                  {entry.gameName}
                </p>
              </div>
              {entry.hasTeam ? (
                <span className="px-3 py-1.5 rounded-lg text-sm font-medium bg-green-600/20 text-green-500">
                  Team created
                </span>
              ) : (
                <button
                  onClick={() => handleCreateTeam(entry)}
                  disabled={creatingKey === entry.key}
                  className="px-4 py-2 rounded-lg font-semibold transition disabled:opacity-60"
                  style={{ background: "var(--primary-color)", color: "var(--foreground)" }}
                >
                  {creatingKey === entry.key ? "Creating..." : "Create My Team"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
