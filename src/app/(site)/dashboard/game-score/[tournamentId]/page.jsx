"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import api from "@/utils/axios";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import GameScheduleBadge from "@/components/ui/tournaments/GameScheduleBadge";
import { compareByScheduledAt } from "@/utils/gameSchedule";

export default function GamePlay() {
  const { tournamentId } = useParams();
  const [games, setGames] = useState([]);
  // gameId -> scheduledAt; the registration payload carries plain Game docs,
  // so the per-tournament schedule has to be looked up separately.
  const [scheduleByGame, setScheduleByGame] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tournamentId) return;

    const fetchGames = async () => {
      try {
        // Per-game schedule for this tournament
        try {
          const tournamentRes = await api.get(
            `/api/tournaments/${tournamentId}`
          );
          const scheduleMap = {};
          (tournamentRes.data?.games || []).forEach((g) => {
            const id = g.game?._id || g.game;
            if (id) scheduleMap[id.toString()] = g.scheduledAt || null;
          });
          setScheduleByGame(scheduleMap);
        } catch (scheduleErr) {
          // A missing schedule shouldn't block scores -- cards fall back to TBA.
          console.error("Error fetching game schedule:", scheduleErr);
        }

        // Get current user
        const meRes = await api.get("/api/me");
        const userId = meRes.data?.user?._id || meRes.data?.data?.user?._id;

        // Get registrations for this tournament
        const regRes = await api.get(
          `/api/tournaments/registration-tournament/${tournamentId}`
        );

        const registrations = regRes.data?.data || [];

        const normalizeId = (id) => {
          if (!id) return null;
          if (typeof id === "string") return id;
          if (typeof id === "object" && id._id) return id._id.toString();
          if (typeof id === "object" && id.toString) return id.toString();
          return String(id);
        };

        let myRegistrations;

        if (Array.isArray(registrations)) {
          myRegistrations = registrations.filter(
            (reg) => normalizeId(reg.user) === normalizeId(userId)
          );
        }

        let myGames;

        // Flatten games
        if (Array.isArray(myRegistrations) && myRegistrations.length > 0) {
          myGames = myRegistrations.flatMap(
            (reg) => reg.gameRegistrationDetails?.games || []
          );
        } else {
          myGames = registrations?.games.flatMap((reg) => reg?.game || []);
        }

        setGames(myGames);
      } catch (err) {
        console.error("Error fetching registered games:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
  }, [tournamentId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-[var(--accent-color)] w-8 h-8" />
      </div>
    );
  }

  if (!games.length) {
    return (
      <p className="text-center text-gray-400">
        You haven’t registered any games in this tournament.
      </p>
    );
  }

  const orderedGames = [...games].sort((a, b) =>
    compareByScheduledAt(
      { scheduledAt: scheduleByGame[a?._id] },
      { scheduledAt: scheduleByGame[b?._id] }
    )
  );

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {orderedGames.map((game) => (
        <div
          key={game._id}
          className="rounded-2xl shadow-lg border overflow-hidden 
                   hover:scale-[1.02] hover:shadow-2xl transition-transform duration-300"
          style={{
            backgroundColor: "var(--card-background)",
            borderColor: "var(--border-color)",
          }}
        >
          {/* Game Image */}
          <img
            src={game.coverImage || game.bannerUrl}
            alt={game.name}
            className="w-full h-52 object-cover"
          />

          {/* Content */}
          <div className="p-5 flex flex-col justify-between">
            <div className="space-y-3">
              {/* Title */}
              <h2
                className="text-lg sm:text-xl font-extrabold tracking-wide capitalize"
                style={{ color: "var(--foreground)" }}
              >
                {game.name}
              </h2>

              {/* When this game was / is played */}
              <GameScheduleBadge
                value={scheduleByGame[game._id]}
                variant="stacked"
              />

              {/* Description */}
              <p className="text-sm line-clamp-3">
                {game.description || "No description available."}
              </p>

              {/* Fee Section */}
              {/* <div className="mt-2 text-sm space-y-1">
              <p style={{ color: "var(--foreground)" }}>
                <strong style={{ color: "var(--accent-color)" }}>Genre:</strong>{" "}
                {game.genre ? `$${game.genre}` : "N/A"}
              </p>
              <p style={{ color: "var(--foreground)" }}>
                <strong style={{ color: "var(--accent-color)" }}>Platform:</strong>{" "}
                {game.platform || "N/A"}
              </p>
            </div> */}
            </div>

            {/* Action Button */}
            <div className="mt-5">
               <Link href={`/dashboard/game-score/${tournamentId}/scoreBoard/${game._id}`}>
            <button
              className="w-full py-2.5 rounded-lg font-semibold transition hover:scale-[1.03] shadow-lg"
              style={{
                backgroundColor: "var(--success-color)",
                color: "white",
              }}
            >
              View Game ScoreBoard
            </button>
            </Link>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
