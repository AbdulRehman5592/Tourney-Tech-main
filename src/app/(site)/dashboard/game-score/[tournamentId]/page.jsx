"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import api from "@/utils/axios";
import Link from "next/link";
import { Loader2 } from "lucide-react";

export default function GamePlay() {
  const { tournamentId } = useParams();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tournamentId) return;

    const fetchGames = async () => {
      try {
        // Get current user
        const meRes = await api.get("/api/me");
        const userId = meRes.data?.user?._id || meRes.data?.data?.user?._id;

        // Get registrations for this tournament
        const regRes = await api.get(
          `/api/tournaments/registration-tournament/${tournamentId}`
        );

        const registrations = regRes.data?.data || [];

        let myRegistrations;

        if (Array.isArray(registrations)) {
          myRegistrations = registrations.filter((reg) => reg.user === userId);
        }

        let myGames;

        // Flatten games
        if (myRegistrations) {
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

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {games.map((game) => (
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
