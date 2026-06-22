"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import api from "@/utils/axios";
import RoundOneMatches from "@/components/ui/dashboard/matches/RoundOne";
import RoundTwoBracket from "@/components/ui/dashboard/matches/RoundTwo";

import Link from "next/link";


export default function TournamentPage() {
  const { tournamentId, gameId } = useParams();

  const [round1Matches, setRound1Matches] = useState([]);
  const [round2PlusMatches, setRound2PlusMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFirstTime, setIsFirstTime] = useState(false);
  const intervalRef = useRef(null);

  // 🔹 Fetch matches (filtered by tournamentId & gameId)
  const fetchMatches = async () => {
    if (!tournamentId || !gameId) return;

    try {
      const query = new URLSearchParams({ tournamentId, gameId });
      const res = await api.get(`/api/matches?${query.toString()}`);
      const allMatches = res.data?.data || [];

      // Split matches
      const round1 = allMatches.filter((m) => m.round === 1);
      const rounds2Plus = allMatches.filter((m) => m.round >= 2);

      setRound1Matches(round1);
      setRound2PlusMatches(rounds2Plus);
    } catch (err) {
      console.error("Error fetching matches:", err);
    }
  };

  // 🔹 Initial fetch + live polling
  useEffect(() => {
    if (!tournamentId || !gameId) return;

    const fetchOrCreateMatches = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams({ tournamentId, gameId });
        let res = await api.get(`/api/matches?${query.toString()}`);
        let allMatches = res.data?.data || [];

        if (allMatches.length === 0) {
          await api.post("/api/matches", { tournamentId, gameId });
          res = await api.get(`/api/matches?${query.toString()}`);
          allMatches = res.data?.data || [];
        }

        // Split matches
        const round1 = allMatches.filter((m) => m.round === 1);
        const rounds2Plus = allMatches.filter((m) => m.round >= 2);

        setRound1Matches(round1);
        setRound2PlusMatches(rounds2Plus);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
        setIsFirstTime(true);
      }
    };

    fetchOrCreateMatches();

    // 🔹 Polling for live updates every 5s
    intervalRef.current = setInterval(fetchMatches, 5000);

    return () => clearInterval(intervalRef.current);
  }, [tournamentId, gameId]);

  // 🔹 Round 1 update
  const handleRound1Update = async (id, data) => {
    setRound1Matches((prev) =>
      prev.map((m) => (m._id === id ? { ...m, ...data } : m))
    );

    try {
      await api.patch(`/api/matches/${id}`, data);
      await fetchMatches(); // refresh rounds 2+ after update
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-white">Loading matches...</p>
      </div>
    );
  }

  const isRound1Complete =
    round1Matches.length > 0 &&
    round1Matches.every((m) => m.status === "completed");

  return (
    <div className="p-4 space-y-12">
      {/* ROUND 1 */}
      {!isRound1Complete && round1Matches.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold text-white mb-4">
            Round 1 Matches
          </h2>
          <RoundOneMatches
            matches={round1Matches}
            onUpdate={handleRound1Update}
          />
        </section>
      )}

      {/* ROUND 2+ */}
      {isRound1Complete && round2PlusMatches.length > 0 && (
        <section className="pb-5">
          <div className="flex items-center justify-between gap-5 flex-col sm:flex-row mb-4">
            <h2 className="text-2xl font-bold text-white ">Round 2</h2>
            <div className="mt-5 sm:mt-0">
              <Link
                href={`/dashboard/game-score/${tournamentId}/scoreBoard/${gameId}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <button
                  className="w-full p-2.5 rounded-lg font-semibold transition hover:scale-[1.03] shadow-lg"
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

          <RoundTwoBracket matches={round2PlusMatches} />
        </section>
      )}

      {!round1Matches.length && !round2PlusMatches.length && (
        <p className="text-center text-gray-400">
          No matches found for this tournament & game.
        </p>
      )}
    </div>
  );
}
