"use client";

import { useState, useEffect } from "react";
import api from "@/utils/axios";

import TournamentCard from "@/components/ui/tournaments/TournamentCard";
import { sortTournamentsCompletedLast } from "@/utils/tournamentSort";

export default function MyTournaments() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    const fetchMyTournaments = async () => {
      try {
        const res = await api.get("/api/tournaments/my-tournaments");
        setTournaments(res.data.data || []);
      } catch (err) {
        console.error("Failed to fetch your tournaments:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMyTournaments();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--accent-color)]"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <h1
        className="text-4xl font-extrabold text-center mb-6"
        style={{ color: "var(--accent-color)" }}
      >
        🏆 My Tournaments
      </h1>

      {tournaments.length === 0 ? (
        <div
          className="text-center py-12 rounded-lg"
          style={{ backgroundColor: "var(--card-background)" }}
        >
          <p className="text-gray-400 text-lg">
            You are not assigned to any tournaments yet.
          </p>
          <p className="text-gray-500 text-sm mt-2">
            Contact tournament organizers to get assigned.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {sortTournamentsCompletedLast(tournaments).map((tournament) => (
            <TournamentCard
              key={tournament._id}
              {...tournament}
              selectedId={selectedId}
              onSelect={setSelectedId}
              userRole={tournament.userRole}
            />
          ))}
        </div>
      )}
    </div>
  );
}
