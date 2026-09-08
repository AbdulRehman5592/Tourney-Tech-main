"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/utils/axios"; // your axios instance

function TournamentCard({ item }) {
  const [gamesExpanded, setGamesExpanded] = useState(false);
  const games = item.games || [];

  return (
    <div
      className="p-6 rounded-xl shadow hover:shadow-lg transition"
      style={{ backgroundColor: "var(--card-background)" }}
    >
      <h3
        className="text-xl font-semibold mb-3 capitalize"
        style={{ color: "var(--accent-color)" }}
      >
        {item.name}
      </h3>

      <div className="mb-1 font-medium capitalize" style={{ color: "#D1D5DB" }}>
        📍 Location: {item.location}
      </div>

      {/* Collapsed by default -- just the count, expandable on click */}
      <div className="mb-1">
        <button
          type="button"
          onClick={() => setGamesExpanded((v) => !v)}
          className="font-medium flex items-center gap-1"
          style={{ color: "#D1D5DB" }}
        >
          🎮 {games.length} Game{games.length === 1 ? "" : "s"}
          <span className="text-xs">{gamesExpanded ? "▲" : "▼"}</span>
        </button>
        {gamesExpanded && (
          <ul className="list-disc list-inside space-y-1 mt-1">
            {games.map((g, idx) => (
              <li key={idx} className="capitalize" style={{ color: "#9CA3AF" }}>
                {g.game?.name} — {g.tournamentTeamType}
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mb-4" style={{ color: "#9CA3AF" }}>
        📅 {new Date(item.startDate).toLocaleDateString()} -{" "}
        {new Date(item.endDate).toLocaleDateString()}
      </p>

      <Link
        href={`/dashboard/tournament-details/${item._id}`}
        className="inline-block px-4 py-2 rounded-lg font-medium text-sm"
        style={{ backgroundColor: "var(--accent-color)", color: "black" }}
      >
        View Tournament
      </Link>
    </div>
  );
}

export default function UpcomingTournaments() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  // Everything here is public -- an account is only needed to register, not
  // to browse, so "View More" just reveals the rest of the already-fetched
  // list instead of sending visitors to log in.
  const [showAllCards, setShowAllCards] = useState(false);

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const res = await api.get("/api/tournaments"); // ✅ adjust if your API path differs
        // backend returns { success, data, message }
        setTournaments(res.data.data.filter((t) => t.status === "upcoming"));
      } catch (err) {
        console.error("Failed to fetch tournaments:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTournaments();
  }, []);

  const hasMore = tournaments.length > 3;
  const displayedTournaments =
    showAllCards || !hasMore ? tournaments : tournaments.slice(0, 2);
  const remainingCount = tournaments.length - 2;

  return (
    <section
      id="upcoming"
      className="py-20"
      style={{
        backgroundColor: "var(--background)",
        color: "var(--foreground)",
      }}
    >
      <div className="container mx-auto px-6 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-8">
          Upcoming Tournaments
        </h2>
        <p className="mb-10 max-w-xl mx-auto" style={{ color: "#9CA3AF" }}>
          Find your next tournament. View dates, locations, and games at a
          glance, then open a tournament for full details and registration.
        </p>

        {loading ? (
          <p style={{ color: "#9CA3AF" }}>Loading tournaments...</p>
        ) : tournaments.length === 0 ? (
          <p style={{ color: "#9CA3AF" }}>No upcoming tournaments found.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            {displayedTournaments.map((item, index) => (
              <TournamentCard key={item._id || index} item={item} />
            ))}

            {!showAllCards && hasMore && (
              <div
                className="flex flex-col items-center justify-center p-6 rounded-xl shadow hover:shadow-lg transition text-center"
                style={{ backgroundColor: "var(--card-background)" }}
              >
                <p className="text-lg font-semibold mb-2" style={{ color: "#D1D5DB" }}>
                  +{remainingCount} More Tournaments
                </p>
                <button
                  type="button"
                  onClick={() => setShowAllCards(true)}
                  className="px-4 py-2 rounded-lg font-medium"
                  style={{
                    backgroundColor: "var(--accent-color)",
                    color: "black",
                  }}
                >
                  View More
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
