"use client";

import { useEffect, useState } from "react";
import api from "@/utils/axios"; // your axios instance
import Link from "next/link";

export default function UpcomingTournaments() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const showAll = tournaments.length <= 3;
  const topTwo = tournaments.slice(0, 2);
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
          Join exciting tournaments and test your skills against top players.
          Don’t miss out!
        </p>

        {loading ? (
          <p style={{ color: "#9CA3AF" }}>Loading tournaments...</p>
        ) : tournaments.length === 0 ? (
          <p style={{ color: "#9CA3AF" }}>No upcoming tournaments found.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            {/* ✅ If tournaments ≤ 3 → show all */}
            {showAll ? (
              tournaments.map((item, index) => (
                <div
                  key={index}
                  className="p-6 rounded-xl shadow hover:shadow-lg transition"
                  style={{ backgroundColor: "var(--card-background)" }}
                >
                  <h3
                    className="text-xl font-semibold mb-3 capitalize"
                    style={{ color: "var(--accent-color)" }}
                  >
                    {item.name}
                  </h3>

                  <div
                    className="mb-1 font-medium capitalize"
                    style={{ color: "#D1D5DB" }}
                  >
                    📍 Location: {item.location}
                  </div>

                  {/* ✅ Show games in list */}
                  <div className="mb-1">
                    <p className="font-medium" style={{ color: "#D1D5DB" }}>
                      🎮 Games:
                    </p>
                    <ul className="list-disc list-inside space-y-1">
                      {item.games?.map((g, idx) => (
                        <li
                          key={idx}
                          className="capitalize"
                          style={{ color: "#9CA3AF" }}
                        >
                          {g.game?.name} — {g.tournamentTeamType}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <p style={{ color: "#9CA3AF" }}>
                    📅 {new Date(item.startDate).toLocaleDateString()} -{" "}
                    {new Date(item.endDate).toLocaleDateString()}
                  </p>
                </div>
              ))
            ) : (
              <>
                {/* ✅ Show only first 2 */}
                {topTwo.map((item, index) => (
                  <div
                    key={index}
                    className="p-6 rounded-xl shadow hover:shadow-lg transition"
                    style={{ backgroundColor: "var(--card-background)" }}
                  >
                    <h3
                      className="text-xl font-semibold mb-3 capitalize"
                      style={{ color: "var(--accent-color)" }}
                    >
                      {item.name}
                    </h3>

                    <div
                      className="mb-1 font-medium capitalize"
                      style={{ color: "#D1D5DB" }}
                    >
                      📍 Location: {item.location}
                    </div>

                    {/* ✅ Show games in list */}
                    <div className="mb-1">
                      <p className="font-medium" style={{ color: "#D1D5DB" }}>
                        🎮 Games:
                      </p>
                      <ul className="list-disc list-inside space-y-1">
                        {item.games?.map((g, idx) => (
                          <li
                            key={idx}
                            className="capitalize"
                            style={{ color: "#9CA3AF" }}
                          >
                            {g.game?.name} — {g.tournamentTeamType}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <p style={{ color: "#9CA3AF" }}>
                      📅 {new Date(item.startDate).toLocaleDateString()} -{" "}
                      {new Date(item.endDate).toLocaleDateString()}
                    </p>
                  </div>
                ))}

                {/* ✅ 3rd card = "View More" */}
                <div
                  className="flex flex-col items-center justify-center p-6 rounded-xl shadow hover:shadow-lg transition text-center"
                  style={{ backgroundColor: "var(--card-background)" }}
                >
                  <p
                    className="text-lg font-semibold mb-2"
                    style={{ color: "#D1D5DB" }}
                  >
                    +{remainingCount} More Tournaments
                  </p>
                  <Link href="/auth/login">
                    <button
                      className="px-4 py-2 rounded-lg font-medium"
                      style={{
                        backgroundColor: "var(--accent-color)",
                        color: "black",
                      }}
                    >
                      View More
                    </button>
                  </Link>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
