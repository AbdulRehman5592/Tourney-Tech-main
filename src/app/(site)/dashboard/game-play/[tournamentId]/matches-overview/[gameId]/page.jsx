"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import api from "@/utils/axios";
import { toast } from "react-hot-toast";
import RoundOneMatches from "@/components/ui/dashboard/matches/RoundOne";
import RoundTwoBracket from "@/components/ui/dashboard/matches/RoundTwo";
import SeatingChart from "@/components/ui/dashboard/matches/SeatingChart";

import Link from "next/link";

const CRITERIA_LABEL = { wins: "Wins", points: "Points", hands: "Hands" };

function StandingsTable({ data, winnerId }) {
  if (!data?.standings?.length) return null;
  return (
    <div className="overflow-x-auto scrollbar-x">
      <table className="w-full border-collapse text-sm" style={{ width: "max-content" }}>
        <thead className="bg-gray-800 text-white">
          <tr>
            <th className="p-2 text-left">#</th>
            <th className="p-2 text-left">Team</th>
            <th className="p-2 text-left">{CRITERIA_LABEL[data.criteria] || "Wins"}</th>
            <th className="p-2 text-left">Points For</th>
            <th className="p-2 text-left">Points Against</th>
            <th className="p-2 text-left">Hands</th>
          </tr>
        </thead>
        <tbody className="bg-gray-900 text-gray-200">
          {data.standings.map((row) => (
            <tr key={row.teamId} className="border-b border-gray-700">
              <td className="p-2 font-semibold">{row.rank}</td>
              <td className="p-2">
                {row.teamId === winnerId && "🏆 "}
                {[row.displayId, row.name].filter(Boolean).join(" ")}
              </td>
              <td className="p-2">{row.wins}</td>
              <td className="p-2">{row.pointsFor}</td>
              <td className="p-2">{row.pointsAgainst}</td>
              <td className="p-2">{row.handsFor}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

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
  const [playoffFormat, setPlayoffFormat] = useState("single_elimination");
  const [generatingBracket, setGeneratingBracket] = useState(false);
  const [showSeatingChart, setShowSeatingChart] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const [standings, setStandings] = useState(null);
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
      // `gameId` (URL param) is the specific scheduled instance
      // (Tournament.games[]._id), not the catalog game id -- the same
      // catalog game can be scheduled more than once with different times.
      const found = games.find((g) => g._id?.toString() === gameId);
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
      const query = new URLSearchParams({ tournament: tournamentId, gameConfigId: gameId });
      const res = await api.get(`/api/team?${query.toString()}`);
      setTeams(res.data?.data || []);
    } catch (err) {
      console.error("Error fetching teams:", err);
    }
  };

  // 🔹 Only tournament staff (or a global admin) may stop/continue rotation,
  // decide on a playoff, or generate the bracket -- the API already enforces
  // this, but the buttons were being shown to every viewer regardless, so a
  // regular player's click just 403'd silently. This gates the UI to match.
  const checkStaffStatus = async () => {
    if (!tournamentId) return;
    try {
      const meRes = await api.get("/api/me");
      const user = meRes.data?.data?.user;
      if (!user) return;
      if (user.role === "admin") {
        setIsStaff(true);
        return;
      }
      const tRes = await api.get("/api/tournaments");
      const tournament = (tRes.data?.data || []).find((t) => t._id === tournamentId);
      setIsStaff(
        (tournament?.staff || []).some((s) => s.user?._id === user._id)
      );
    } catch (err) {
      console.error("Failed to check staff status:", err);
    }
  };

  // 🔹 Ranked standings -- previewed before the playoff decision, and shown
  // as the final result once round1Status is "completed" with no playoff.
  const fetchStandings = async (config) => {
    const resolvedGameId = config?._id || gameConfig?._id;
    if (!tournamentId || !resolvedGameId) return;
    try {
      const res = await api.get(
        `/api/tournaments/${tournamentId}/games/${resolvedGameId}/standings`
      );
      setStandings(res.data?.data || null);
    } catch (err) {
      console.error("Failed to fetch standings:", err);
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
    checkStaffStatus();

    // 🔹 Polling for live updates every 5s
    intervalRef.current = setInterval(() => {
      fetchMatches();
      fetchGameConfig();
    }, 5000);

    return () => clearInterval(intervalRef.current);
  }, [tournamentId, gameId]);

  // Preview standings once the qualifying rounds are done, and show them as
  // the final result once the game is fully decided with no playoff.
  useEffect(() => {
    const status = gameConfig?.round1Status;
    if (
      isScoreBased &&
      (status === "awaiting_playoff_decision" || status === "completed")
    ) {
      fetchStandings(gameConfig);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameConfig?.round1Status, gameConfig?._id]);

  // 🔹 Pre-fill the qualifiers count and playoff format from the plan set at
  // tournament setup (gameConfig.playoffQualifiersCount / playoffFormat) once
  // the decision panel appears -- only while the admin hasn't typed/picked
  // anything in themselves (qualifiersCount === "" is the "not yet
  // initialized" signal for both fields).
  useEffect(() => {
    if (
      gameConfig?.round1Status === "awaiting_playoff_decision" &&
      gameConfig?.playoffQualifiersCount &&
      qualifiersCount === ""
    ) {
      setQualifiersCount(String(gameConfig.playoffQualifiersCount));
      setPlayoffFormat(gameConfig.playoffFormat || "single_elimination");
    }
  }, [gameConfig, qualifiersCount]);

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
      toast.error(err?.response?.data?.message || "Failed to record that decision");
    } finally {
      setFinalizing(false);
    }
  };

  // Reverses the single most recent stop/playoff decision -- see
  // undo-decision route for exactly what it will and won't undo.
  const handleUndoDecision = async () => {
    setFinalizing(true);
    try {
      const res = await api.post(
        `/api/tournaments/${tournamentId}/games/${gameConfig._id}/undo-decision`
      );
      toast.success(res.data?.message || "Decision undone");
      await fetchGameConfig();
      await fetchMatches();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to undo");
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
              playoffFormat,
              // Reward bye / protected seed only applies to single elimination.
              ...(playoffFormat === "single_elimination" && protectedSeedTeamId && playoffByeType !== "none"
                ? { protectedSeedTeamId, rewardByeType: playoffByeType }
                : {}),
            }
          : { playoff: false }
      );
      await fetchGameConfig();
      await fetchMatches();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to record that decision");
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
      toast.error(err?.response?.data?.message || "Failed to generate the bracket");
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
          {isStaff ? (
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
          ) : (
            <p className="text-sm text-gray-400 italic">
              Waiting for the tournament organizer to generate the bracket.
            </p>
          )}
        </section>
      )}

      {/* FULL STANDINGS PAGE -- round-by-round table, only meaningful for the
          score-based formats standings apply to. */}
      {isScoreBased && (round1Matches.length > 0 || playoffMatches.length > 0) && (
        <div className="flex justify-end">
          <Link href={`/dashboard/game-play/${tournamentId}/standings/${gameId}`}>
            <button
              className="px-4 py-2 rounded-lg font-semibold transition hover:scale-[1.03] shadow-lg"
              style={{ backgroundColor: "var(--accent-color)", color: "var(--background)" }}
            >
              View Full Standings
            </button>
          </Link>
        </div>
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
            {isStaff ? (
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
            ) : (
              <p className="text-sm text-gray-400 italic">
                Waiting for the organizer to decide whether to continue.
              </p>
            )}
          </section>
        )}

      {/* AWAITING ADMIN PLAYOFF DECISION (round_robin / mesh / standard) */}
      {isScoreBased &&
        round1AllComplete &&
        gameConfig?.round1Status === "awaiting_playoff_decision" && (
          <section className="p-4 rounded-lg border border-yellow-500 bg-gray-900 space-y-3">
            <h3 className="text-xl font-bold text-yellow-400">
              Qualifying rounds complete — start a playoff?
            </h3>

            {standings && <StandingsTable data={standings} />}

            {isStaff ? (
              <>
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">
                  <select
                    value={playoffFormat}
                    onChange={(e) => setPlayoffFormat(e.target.value)}
                    className="p-2 rounded bg-[var(--background)] text-white"
                  >
                    <option value="single_elimination">Single Elimination</option>
                    <option value="double_elimination">Double Elimination</option>
                  </select>
                  <input
                    type="number"
                    min={2}
                    placeholder="Teams to qualify"
                    value={qualifiersCount}
                    onChange={(e) => setQualifiersCount(e.target.value)}
                    className="p-2 rounded bg-[var(--background)] text-white w-48"
                  />
                  {playoffFormat === "single_elimination" && (
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
                  )}
                  {playoffFormat === "single_elimination" && playoffByeType !== "none" && (
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

                {/* Only reachable via an explicit "Stop Here" on indefinite
                    standard rotation -- round_robin/mesh/capped-standard land
                    here automatically once every match is done, so there's no
                    prior "stop" click to undo. */}
                {gameConfig?.format === "standard" && !gameConfig?.standardRounds && (
                  <button
                    disabled={finalizing}
                    onClick={handleUndoDecision}
                    className="text-sm text-gray-400 hover:text-white underline disabled:opacity-50"
                  >
                    ↩ Undo — resume rotation (accidentally stopped?)
                  </button>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-400 italic">
                Waiting for the organizer to decide on a playoff.
              </p>
            )}
          </section>
        )}

      {/* FINAL RESULT: NO PLAYOFF, CROWNED BY STANDINGS */}
      {isScoreBased &&
        gameConfig?.round1Status === "completed" &&
        playoffMatches.length === 0 && (
          <section className="p-4 rounded-lg border border-green-500 bg-gray-900 space-y-3">
            <h3 className="text-xl font-bold text-green-400">
              🏆 Final Standings
            </h3>
            {standings && (
              <StandingsTable data={standings} winnerId={gameConfig?.winner?.toString?.() || gameConfig?.winner} />
            )}
            {isStaff && (
              <button
                disabled={finalizing}
                onClick={handleUndoDecision}
                className="text-sm text-gray-400 hover:text-white underline disabled:opacity-50"
              >
                ↩ Undo — back to playoff decision (wrong button?)
              </button>
            )}
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
