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
  const [playoffMatches, setPlayoffMatches] = useState([]);
  const [gameConfig, setGameConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qualifiersCount, setQualifiersCount] = useState("");
  const [finalizing, setFinalizing] = useState(false);
  const intervalRef = useRef(null);

  const isScoreBased = ["round_robin", "mesh"].includes(gameConfig?.format);

  // 🔹 Fetch the tournament-game config (format, round1Status)
  const fetchGameConfig = async () => {
    if (!tournamentId || !gameId) return null;
    try {
      const res = await api.get(`/api/tournaments/${tournamentId}/games`);
      const games = res.data?.games || [];
      const found = games.find(
        (g) => (g.game?._id || g.game)?.toString() === gameId
      );
      setGameConfig(found || null);
      return found || null;
    } catch (err) {
      console.error("Error fetching game config:", err);
      return null;
    }
  };

  // 🔹 Fetch matches (filtered by tournamentId & gameId)
  const fetchMatches = async () => {
    if (!tournamentId || !gameId) return;

    try {
      const query = new URLSearchParams({ tournamentId, gameId });
      const res = await api.get(`/api/matches?${query.toString()}`);
      const allMatches = res.data?.data || [];

      setRound1Matches(allMatches.filter((m) => m.stage === "round1"));
      setPlayoffMatches(allMatches.filter((m) => m.stage === "playoff"));
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
        await fetchGameConfig();

        const query = new URLSearchParams({ tournamentId, gameId });
        let res = await api.get(`/api/matches?${query.toString()}`);
        let allMatches = res.data?.data || [];

        if (allMatches.length === 0) {
          await api.post("/api/matches", { tournamentId, gameId });
          res = await api.get(`/api/matches?${query.toString()}`);
          allMatches = res.data?.data || [];
        }

        setRound1Matches(allMatches.filter((m) => m.stage === "round1"));
        setPlayoffMatches(allMatches.filter((m) => m.stage === "playoff"));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrCreateMatches();

    // 🔹 Polling for live updates every 5s
    intervalRef.current = setInterval(() => {
      fetchMatches();
      fetchGameConfig();
    }, 5000);

    return () => clearInterval(intervalRef.current);
  }, [tournamentId, gameId]);

  // 🔹 Round 1 update -- the score/agree/disagree PATCH already happened inside
  // EditMatchModal itself; this just applies the fresh match data it returned
  // and re-syncs from the server (a completed match may have advanced others).
  const handleRound1Update = async (id, data) => {
    setRound1Matches((prev) =>
      prev.map((m) => (m._id === id ? { ...m, ...data } : m))
    );

    await fetchMatches();
    await fetchGameConfig();
  };

  const handleFinalizeRound1 = async (playoff) => {
    setFinalizing(true);
    try {
      await api.post(
        `/api/tournaments/${tournamentId}/games/${gameConfig._id}/finalize-round1`,
        playoff
          ? { playoff: true, qualifiersCount: Number(qualifiersCount) }
          : { playoff: false }
      );
      await fetchGameConfig();
      await fetchMatches();
    } catch (err) {
      console.error(err);
    } finally {
      setFinalizing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-white">Loading matches...</p>
      </div>
    );
  }

  const round1AllComplete =
    round1Matches.length > 0 &&
    round1Matches.every((m) => m.status === "completed");

  // Non-power-of-2 elimination brackets run a preliminary "play-in" round
  // (round 0) to trim the field before the main bracket -- rendered as its own
  // flat section since the bracket-tree view only handles power-of-2 columns.
  const preliminaryMatches = round1Matches.filter((m) => m.round === 0);
  const mainBracketMatches = round1Matches.filter((m) => m.round !== 0);
  const playoffPreliminary = playoffMatches.filter((m) => m.round === 0);
  const playoffBracket = playoffMatches.filter((m) => m.round !== 0);

  return (
    <div className="p-4 space-y-12">
      {/* PRELIMINARY ROUND */}
      {!isScoreBased && preliminaryMatches.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold text-white mb-4">
            Preliminary Round
          </h2>
          <RoundOneMatches
            matches={preliminaryMatches}
            onUpdate={handleRound1Update}
          />
        </section>
      )}

      {/* ROUND 1 */}
      {(isScoreBased ? round1Matches.length > 0 : mainBracketMatches.length > 0) && (
        <section>
          <h2 className="text-2xl font-bold text-white mb-4">
            Round 1 Matches
          </h2>
          {isScoreBased ? (
            <RoundOneMatches
              matches={round1Matches}
              onUpdate={handleRound1Update}
            />
          ) : (
            <RoundTwoBracket
              matches={mainBracketMatches}
              format={gameConfig?.format}
              onUpdate={handleRound1Update}
            />
          )}
        </section>
      )}

      {/* AWAITING ADMIN PLAYOFF DECISION (round_robin / mesh only) */}
      {isScoreBased &&
        round1AllComplete &&
        gameConfig?.round1Status === "awaiting_playoff_decision" && (
          <section className="p-4 rounded-lg border border-yellow-500 bg-gray-900 space-y-3">
            <h3 className="text-xl font-bold text-yellow-400">
              Round 1 complete — start a playoff?
            </h3>
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <input
                type="number"
                min={2}
                placeholder="Teams to qualify"
                value={qualifiersCount}
                onChange={(e) => setQualifiersCount(e.target.value)}
                className="p-2 rounded bg-[var(--background)] text-white w-48"
              />
              <button
                disabled={finalizing || !qualifiersCount}
                onClick={() => handleFinalizeRound1(true)}
                className="px-4 py-2 rounded bg-[var(--accent-color)] text-black font-medium disabled:opacity-50"
              >
                Start Playoff
              </button>
              <button
                disabled={finalizing}
                onClick={() => handleFinalizeRound1(false)}
                className="px-4 py-2 rounded bg-gray-700 text-white font-medium disabled:opacity-50"
              >
                No Playoff — Crown Standings Winner
              </button>
            </div>
          </section>
        )}

      {/* PLAYOFF */}
      {playoffMatches.length > 0 && (
        <section className="pb-5 space-y-6">
          <div className="flex items-center justify-between gap-5 flex-col sm:flex-row">
            <h2 className="text-2xl font-bold text-white ">Playoff</h2>
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

          {playoffPreliminary.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">
                Preliminary Round
              </h3>
              <RoundOneMatches
                matches={playoffPreliminary}
                onUpdate={handleRound1Update}
              />
            </div>
          )}

          {playoffBracket.length > 0 && (
            <RoundTwoBracket matches={playoffBracket} onUpdate={handleRound1Update} />
          )}
        </section>
      )}

      {!round1Matches.length && !playoffMatches.length && (
        <p className="text-center text-gray-400">
          No matches found for this tournament & game.
        </p>
      )}
    </div>
  );
}
