"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import api from "@/utils/axios";
import RoundOneMatches from "@/components/ui/dashboard/matches/RoundOne";
import RoundTwoBracket from "@/components/ui/dashboard/matches/RoundTwo";
import SeatingChart from "@/components/ui/dashboard/matches/SeatingChart";

import Link from "next/link";


export default function TournamentPage() {
  const { tournamentId, gameId } = useParams();

  const [round1Matches, setRound1Matches] = useState([]);
  const [playoffMatches, setPlayoffMatches] = useState([]);
  const [gameConfig, setGameConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qualifiersCount, setQualifiersCount] = useState("");
  const [finalizing, setFinalizing] = useState(false);
  const [teams, setTeams] = useState([]);
  const [protectedSeedTeamId, setProtectedSeedTeamId] = useState("");
  const [playoffByeType, setPlayoffByeType] = useState("none");
  const [generatingBracket, setGeneratingBracket] = useState(false);
  const [showSeatingChart, setShowSeatingChart] = useState(false);
  const intervalRef = useRef(null);

  const hasRewardBye =
    gameConfig?.format === "single_elimination" &&
    gameConfig?.rewardByeType &&
    gameConfig.rewardByeType !== "none";

  const isScoreBased = ["round_robin", "mesh", "standard"].includes(gameConfig?.format);

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

  // 🔹 Teams for this tournament+game -- only needed to populate the
  // protected-seed picker before generating a reward-bye bracket.
  const fetchTeams = async () => {
    if (!tournamentId || !gameId) return;
    try {
      const query = new URLSearchParams({ tournament: tournamentId, game: gameId });
      const res = await api.get(`/api/team?${query.toString()}`);
      setTeams(res.data?.data || []);
    } catch (err) {
      console.error("Error fetching teams:", err);
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
        const config = await fetchGameConfig();

        const query = new URLSearchParams({ tournamentId, gameId });
        let res = await api.get(`/api/matches?${query.toString()}`);
        let allMatches = res.data?.data || [];

        const needsProtectedSeedPick =
          config?.format === "single_elimination" &&
          config?.rewardByeType &&
          config.rewardByeType !== "none";

        // Fetched unconditionally: also feeds the optional reward-bye picker
        // on the playoff-decision panel for score-based formats.
        await fetchTeams();

        if (allMatches.length === 0 && needsProtectedSeedPick) {
          // Wait for the admin to pick a protected seed below before generating.
        } else if (allMatches.length === 0) {
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

  // Standard format, indefinite mode only: after each round completes, the
  // admin says whether to generate another one or stop (which hands off to
  // the same finalize-round1 flow used for playoff/no-playoff below).
  const handleNextRoundDecision = async (wantsAnother) => {
    setFinalizing(true);
    try {
      await api.post(
        `/api/tournaments/${tournamentId}/games/${gameConfig._id}/next-round`,
        { continue: wantsAnother }
      );
      await fetchGameConfig();
      await fetchMatches();
    } catch (err) {
      console.error(err);
    } finally {
      setFinalizing(false);
    }
  };

  const handleFinalizeRound1 = async (playoff) => {
    setFinalizing(true);
    try {
      await api.post(
        `/api/tournaments/${tournamentId}/games/${gameConfig._id}/finalize-round1`,
        playoff
          ? {
              playoff: true,
              qualifiersCount: Number(qualifiersCount),
              ...(protectedSeedTeamId && playoffByeType !== "none"
                ? { protectedSeedTeamId, rewardByeType: playoffByeType }
                : {}),
            }
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

  // Single-elimination games with a reward bye configured: the admin must
  // pick which team is protected before the bracket can be generated.
  const handleGenerateBracket = async () => {
    setGeneratingBracket(true);
    try {
      await api.post("/api/matches", {
        tournamentId,
        gameId,
        ...(protectedSeedTeamId ? { protectedSeedTeamId } : {}),
      });
      await fetchGameConfig();
      await fetchMatches();
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingBracket(false);
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

  const byeLabel = {
    first_round: "First Round",
    quarterfinal: "Quarterfinal",
    semifinal: "Semifinal",
    final_four: "Final Four",
    championship: "Championship",
  }[gameConfig?.rewardByeType];

  return (
    <div className="p-4 space-y-12">
      {/* REWARD BYE: PICK PROTECTED SEED BEFORE GENERATING THE BRACKET */}
      {hasRewardBye && round1Matches.length === 0 && playoffMatches.length === 0 && (
        <section className="p-4 rounded-lg border border-purple-500 bg-gray-900 space-y-3">
          <h3 className="text-xl font-bold text-purple-400">
            Reward Bye: {byeLabel} — pick the protected team
          </h3>
          <p className="text-sm text-gray-400">
            That team skips ahead to the {byeLabel} stage; everyone else plays
            their way up to meet them there. Leave unselected to generate a
            normal bracket with no protection.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <select
              value={protectedSeedTeamId}
              onChange={(e) => setProtectedSeedTeamId(e.target.value)}
              className="p-2 rounded bg-[var(--background)] text-white w-64"
            >
              <option value="">No protected seed</option>
              {teams.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.displayId || t.serialNo} {t.name}
                </option>
              ))}
            </select>
            <button
              disabled={generatingBracket}
              onClick={handleGenerateBracket}
              className="px-4 py-2 rounded bg-[var(--accent-color)] text-black font-medium disabled:opacity-50"
            >
              {generatingBracket ? "Generating..." : "Generate Bracket"}
            </button>
          </div>
        </section>
      )}

      {/* SEATING CHART -- auto-generated from table assignments, toggleable */}
      {(round1Matches.length > 0 || playoffMatches.length > 0) && (
        <section>
          <button
            onClick={() => setShowSeatingChart((v) => !v)}
            className="text-lg font-semibold text-white mb-3 flex items-center gap-2"
          >
            {showSeatingChart ? "▾" : "▸"} Seating Chart
          </button>
          {showSeatingChart && (
            <div className="space-y-6">
              {round1Matches.length > 0 && <SeatingChart matches={round1Matches} />}
              {playoffMatches.length > 0 && (
                <>
                  <p className="text-sm font-semibold text-gray-300">Playoff</p>
                  <SeatingChart matches={playoffMatches} />
                </>
              )}
            </div>
          )}
        </section>
      )}

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

      {/* STANDARD FORMAT, INDEFINITE MODE: ANOTHER ROUND? */}
      {gameConfig?.format === "standard" &&
        !gameConfig?.standardRounds &&
        gameConfig?.round1Status === "awaiting_next_round_decision" && (
          <section className="p-4 rounded-lg border border-blue-500 bg-gray-900 space-y-3">
            <h3 className="text-xl font-bold text-blue-400">
              Round complete — play another round?
            </h3>
            <div className="flex gap-3">
              <button
                disabled={finalizing}
                onClick={() => handleNextRoundDecision(true)}
                className="px-4 py-2 rounded bg-[var(--accent-color)] text-black font-medium disabled:opacity-50"
              >
                Yes, Another Round
              </button>
              <button
                disabled={finalizing}
                onClick={() => handleNextRoundDecision(false)}
                className="px-4 py-2 rounded bg-gray-700 text-white font-medium disabled:opacity-50"
              >
                No, Stop Here
              </button>
            </div>
          </section>
        )}

      {/* AWAITING ADMIN PLAYOFF DECISION (round_robin / mesh / standard) */}
      {isScoreBased &&
        round1AllComplete &&
        gameConfig?.round1Status === "awaiting_playoff_decision" && (
          <section className="p-4 rounded-lg border border-yellow-500 bg-gray-900 space-y-3">
            <h3 className="text-xl font-bold text-yellow-400">
              Round 1 complete — start a playoff?
            </h3>
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">
              <input
                type="number"
                min={2}
                placeholder="Teams to qualify"
                value={qualifiersCount}
                onChange={(e) => setQualifiersCount(e.target.value)}
                className="p-2 rounded bg-[var(--background)] text-white w-48"
              />
              <select
                value={playoffByeType}
                onChange={(e) => setPlayoffByeType(e.target.value)}
                className="p-2 rounded bg-[var(--background)] text-white"
              >
                <option value="none">Reward Bye: None</option>
                <option value="first_round">Reward Bye: First Round</option>
                <option value="quarterfinal">Reward Bye: Quarterfinal</option>
                <option value="semifinal">Reward Bye: Semifinal</option>
                <option value="final_four">Reward Bye: Final Four</option>
                <option value="championship">Reward Bye: Championship</option>
              </select>
              {playoffByeType !== "none" && (
                <select
                  value={protectedSeedTeamId}
                  onChange={(e) => setProtectedSeedTeamId(e.target.value)}
                  className="p-2 rounded bg-[var(--background)] text-white w-56"
                >
                  <option value="">Protected team...</option>
                  {teams.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.displayId || t.serialNo} {t.name}
                    </option>
                  ))}
                </select>
              )}
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
