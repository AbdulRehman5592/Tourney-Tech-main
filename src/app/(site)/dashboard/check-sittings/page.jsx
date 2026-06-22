"use client";

import { useEffect, useState } from "react";
import api from "@/utils/axios";

export default function SittingArrangementsPage() {
  const [arrangements, setArrangements] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🔎 Filters
  const [search, setSearch] = useState("");
  const [selectedTournament, setSelectedTournament] = useState("");
  const [selectedGame, setSelectedGame] = useState("");

  // 📑 Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  useEffect(() => {
    const fetchArrangements = async () => {
      try {
        const res = await api.get("/api/sitting-arrangment");
        setArrangements(res.data.data || []);
      } catch (err) {
        console.error("Error fetching arrangements:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchArrangements();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p style={{ color: "var(--foreground)" }}>Loading...</p>
      </div>
    );
  }

  // 🏆 Unique filter options
  const tournaments = Array.from(
    new Set(arrangements.map((item) => item.tournament?.name).filter(Boolean))
  );
  const games = Array.from(
    new Set(arrangements.map((item) => item.game?.name).filter(Boolean))
  );

  // 🔎 Apply filters
  const filtered = arrangements.filter((item) => {
    const matchesSearch =
      item.tournament?.name?.toLowerCase().includes(search.toLowerCase()) ||
      item.game?.name?.toLowerCase().includes(search.toLowerCase());

    const matchesTournament =
      !selectedTournament || item.tournament?.name === selectedTournament;

    const matchesGame = !selectedGame || item.game?.name === selectedGame;

    return matchesSearch && matchesTournament && matchesGame;
  });

  // 📑 Pagination logic
  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentItems = filtered.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  return (
    <div className="min-h-screen p-6">
      <h1
        className="text-2xl font-bold mb-6"
      >
        My Sitting Arrangements
      </h1>

      {/* 🔎 Search + Filters */}
      <div className="grid gap-4 mb-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Search */}
        <input
          type="text"
          placeholder="Search by tournament or game..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
          className="w-full p-2 rounded-lg"
          style={{
            backgroundColor: "var(--secondary-color)",
            color: "var(--foreground)",
            border: "1px solid var(--border-color)",
          }}
        />

        {/* Tournament Filter */}
        <select
          value={selectedTournament}
          onChange={(e) => {
            setSelectedTournament(e.target.value);
            setCurrentPage(1);
          }}
          className="w-full p-2 rounded-lg"
          style={{
            backgroundColor: "var(--secondary-color)",
            color: "var(--foreground)",
            border: "1px solid var(--border-color)",
          }}
        >
          <option value="">All Tournaments</option>
          {tournaments.map((t, idx) => (
            <option key={idx} value={t}>
              {t}
            </option>
          ))}
        </select>

        {/* Game Filter */}
        <select
          value={selectedGame}
          onChange={(e) => {
            setSelectedGame(e.target.value);
            setCurrentPage(1);
          }}
          className="w-full p-2 rounded-lg"
          style={{
            backgroundColor: "var(--secondary-color)",
            color: "var(--foreground)",
            border: "1px solid var(--border-color)",
          }}
        >
          <option value="">All Games</option>
          {games.map((g, idx) => (
            <option key={idx} value={g}>
              {g}
            </option>
          ))}
        </select>
      </div>

      {/* 🃏 Cards */}
      {currentItems.length === 0 ? (
        <p style={{ color: "var(--foreground)" }}>No arrangements found.</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {currentItems.map((item) => (
            <div
              key={item._id}
              className="rounded-xl shadow-md overflow-hidden transition transform hover:-translate-y-1 hover:shadow-lg flex flex-col"
              style={{
                backgroundColor: "var(--card-background)",
                border: "1px solid var(--border-color)",
              }}
            >
              {/* Tournament Name */}
              <div
                className="p-3 font-semibold text-lg"
                style={{
                  backgroundColor: "var(--secondary-color)",
                  color: "var(--accent-color)",
                }}
              >
                {item.tournament?.name || "Untitled Tournament"}
              </div>

              {/* Game Name */}
              <div className="px-4 py-2 text-sm">
                <span style={{ color: "var(--foreground)" }}>
                  🎮 {item.game?.name || "Unknown Game"}
                </span>
              </div>

              {/* Portrait Image */}
              {item.image && (
                <div className="px-4 pb-4 flex justify-center">
                  <img
                    src={item.image}
                    alt="Arrangement"
                    className="max-h-[400px] w-auto object-contain rounded-lg"
                    style={{ border: "1px solid var(--border-color)" }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 📑 Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-8 space-x-2">
          {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((num) => (
            <button
              key={num}
              onClick={() => setCurrentPage(num)}
              className={`px-3 py-1 rounded-lg ${
                currentPage === num
                  ? "font-bold"
                  : "opacity-70 hover:opacity-100"
              }`}
              style={{
                backgroundColor:
                  currentPage === num
                    ? "var(--primary-color)"
                    : "var(--secondary-color)",
                color: "var(--foreground)",
              }}
            >
              {num}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
