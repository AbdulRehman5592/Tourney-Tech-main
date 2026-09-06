"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import * as XLSX from "xlsx";
import {
  ArrowLeft,
  Crown,
  Loader2,
  Printer,
  Download,
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import api from "@/utils/axios";

const CRITERIA_LABEL = { wins: "Wins", points: "Points", hands: "Hands" };

// Same ranking rules as the server's tallyStandings/rankByCriteria
// (src/utils/server/tournamentBracket.js), duplicated here so the page can
// recompute standings per round tab without a round-scoped API.
const CRITERIA_SORT = {
  wins: (x, y) =>
    y.wins - x.wins || y.pointsFor - y.pointsAgainst - (x.pointsFor - x.pointsAgainst),
  points: (x, y) => y.pointsFor - x.pointsFor || y.wins - x.wins,
  hands: (x, y) => y.handsFor - x.handsFor || y.wins - x.wins,
};

function scoreMapValue(scoresField, key) {
  if (!scoresField) return undefined;
  return typeof scoresField.get === "function" ? scoresField.get(key) : scoresField[key];
}

function idOf(ref) {
  if (!ref) return null;
  return typeof ref === "object" ? ref._id?.toString() : ref.toString();
}

// Tallies completed matches (optionally capped to a round, for the round
// tabs) into per-team win/loss/points/hands/bostons + a chronological
// W/L log, then ranks the result by the game's configured win criteria.
function computeStandingsRows(matches, teams, { throughRound, criteria } = {}) {
  const scoped =
    throughRound == null ? matches : matches.filter((m) => (m.round ?? 0) <= throughRound);

  const byTeam = new Map(
    teams.map((t) => [
      t._id,
      {
        teamId: t._id,
        name: t.name,
        displayId: t.displayId || t.serialNo,
        wins: 0,
        losses: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        handsFor: 0,
        bostonsFor: 0,
        played: 0,
        results: [],
      },
    ])
  );

  const completed = scoped
    .filter((m) => m.status === "completed" && m.teamA && m.teamB)
    .sort((a, b) => new Date(a.completedAt || 0) - new Date(b.completedAt || 0));

  for (const m of completed) {
    const aId = idOf(m.teamA);
    const bId = idOf(m.teamB);
    const a = byTeam.get(aId);
    const b = byTeam.get(bId);
    if (!a || !b) continue;

    a.played += 1;
    b.played += 1;
    a.pointsFor += m.teamAScore || 0;
    a.pointsAgainst += m.teamBScore || 0;
    b.pointsFor += m.teamBScore || 0;
    b.pointsAgainst += m.teamAScore || 0;
    a.handsFor += Number(scoreMapValue(m.teamAScores, "hands") ?? m.teamAtotalWon ?? 0);
    b.handsFor += Number(scoreMapValue(m.teamBScores, "hands") ?? m.teamBtotalWon ?? 0);
    a.bostonsFor += Number(scoreMapValue(m.teamAScores, "boston") ?? m.teamAboston ?? 0);
    b.bostonsFor += Number(scoreMapValue(m.teamBScores, "boston") ?? m.teamBboston ?? 0);

    const winnerId = idOf(m.winner);
    if (winnerId === aId) {
      a.wins += 1;
      b.losses += 1;
      a.results.push("W");
      b.results.push("L");
    } else if (winnerId === bId) {
      b.wins += 1;
      a.losses += 1;
      b.results.push("W");
      a.results.push("L");
    }
  }

  const rows = [...byTeam.values()].map((t) => {
    const recentTwo = t.results.slice(-2);
    const trend =
      recentTwo.length < 2
        ? "flat"
        : recentTwo.every((r) => r === "W")
        ? "up"
        : recentTwo.every((r) => r === "L")
        ? "down"
        : "flat";
    return {
      ...t,
      winPct: t.played ? Math.round((t.wins / t.played) * 100) : 0,
      last3: t.results.slice(-3),
      trend,
    };
  });

  rows.sort(CRITERIA_SORT[criteria] || CRITERIA_SORT.wins);
  return rows.map((r, i) => ({ ...r, rank: i + 1 }));
}

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50];

export default function TournamentStandingsPage() {
  const { tournamentId, gameId } = useParams();

  const [tournament, setTournament] = useState(null);
  const [gameConfig, setGameConfig] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState("overall");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const intervalRef = useRef(null);

  useEffect(() => {
    if (!tournamentId || !gameId) return;

    const fetchAll = async () => {
      try {
        const [tournamentRes, matchesRes] = await Promise.all([
          api.get(`/api/tournaments/${tournamentId}`),
          api.get(
            `/api/matches?${new URLSearchParams({ tournamentId, gameId })}`
          ),
        ]);

        const t = tournamentRes.data;
        setTournament(t);
        setGameConfig((t?.games || []).find((g) => g._id?.toString() === gameId) || null);
        setMatches((matchesRes.data?.data || []).filter((m) => m.stage === "round1"));
      } catch (err) {
        console.error("Failed to load standings:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
    intervalRef.current = setInterval(fetchAll, 8000);
    return () => clearInterval(intervalRef.current);
  }, [tournamentId, gameId]);

  const isScoreBased = ["round_robin", "mesh", "standard"].includes(gameConfig?.format);
  const criteria = gameConfig?.winCriteria || "wins";

  // Teams come straight off the populated teamA/teamB of each match rather
  // than a separate /api/team call -- that endpoint is admin-only, but any
  // team that's actually played a match is already fully represented here.
  const teams = useMemo(() => {
    const byId = new Map();
    for (const m of matches) {
      for (const t of [m.teamA, m.teamB]) {
        if (t && typeof t === "object" && t._id && !byId.has(t._id)) byId.set(t._id, t);
      }
    }
    return [...byId.values()];
  }, [matches]);

  const roundNumbers = useMemo(
    () =>
      [...new Set(matches.map((m) => m.round).filter((r) => r != null && r > 0))].sort(
        (a, b) => a - b
      ),
    [matches]
  );

  const overallRows = useMemo(
    () => computeStandingsRows(matches, teams, { criteria }),
    [matches, teams, criteria]
  );

  const displayRows = useMemo(() => {
    const throughRound = activeTab === "overall" ? null : Number(activeTab);
    return computeStandingsRows(matches, teams, { throughRound, criteria });
  }, [matches, teams, criteria, activeTab]);

  const filteredRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return displayRows;
    return displayRows.filter(
      (r) =>
        r.name?.toLowerCase().includes(term) || r.displayId?.toLowerCase().includes(term)
    );
  }, [displayRows, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / rowsPerPage));
  const pagedRows = filteredRows.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const roundsCompleted = useMemo(
    () =>
      roundNumbers.filter((r) => {
        const roundMatches = matches.filter((m) => m.round === r);
        return roundMatches.length > 0 && roundMatches.every((m) => m.status === "completed");
      }).length,
    [roundNumbers, matches]
  );

  const totalHands = overallRows.reduce((sum, r) => sum + r.handsFor, 0);
  const totalBostons = overallRows.reduce((sum, r) => sum + r.bostonsFor, 0);

  const handleSearchChange = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const handleExport = () => {
    const rows = filteredRows.map((r) => ({
      Rank: r.rank,
      Team: [r.displayId, r.name].filter(Boolean).join(" "),
      Wins: r.wins,
      Losses: r.losses,
      Points: r.pointsFor,
      Hands: r.handsFor,
      Bostons: r.bostonsFor,
      "Win %": `${r.winPct}%`,
    }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Standings");
    XLSX.writeFile(
      workbook,
      `standings-${tournament?.name || tournamentId}-${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-[var(--accent-color)] w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <Link
        href={`/dashboard/game-play/${tournamentId}/matches-overview/${gameId}`}
        className="flex items-center gap-2 text-[var(--accent-color)] hover:underline w-fit"
      >
        <ArrowLeft size={18} />
        Back to Matches
      </Link>

      {/* Banner */}
      <div
        className="rounded-2xl p-6 md:p-8 border"
        style={{
          background:
            "linear-gradient(135deg, var(--primary-color) 0%, var(--card-background) 100%)",
          borderColor: "var(--border-color)",
        }}
      >
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1
              className="text-2xl md:text-4xl font-extrabold tracking-wide"
              style={{ color: "white" }}
            >
              TOURNAMENT STANDINGS
            </h1>
            <p className="text-sm md:text-base text-[var(--muted-foreground)] mt-1">
              {tournament?.name}
              {gameConfig?.game?.name ? ` — ${gameConfig.game.name}` : ""}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold" style={{ color: "var(--accent-color)" }}>
              Play. Compete. Connect.
            </p>
            <p className="text-xs text-[var(--muted-foreground)]">Ranked by {CRITERIA_LABEL[criteria]}</p>
          </div>
        </div>
      </div>

      {!isScoreBased ? (
        <div
          className="p-6 rounded-xl text-center"
          style={{ backgroundColor: "var(--card-background)" }}
        >
          <p className="text-[var(--muted-foreground)]">
            Standings aren't tracked for elimination bracket formats — check the bracket view
            on the matches page instead.
          </p>
        </div>
      ) : (
        <>
          {/* Round tabs */}
          <div className="flex gap-2 overflow-x-auto scrollbar-x pb-1">
            <button
              onClick={() => handleTabChange("overall")}
              className="px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition"
              style={
                activeTab === "overall"
                  ? { backgroundColor: "var(--accent-color)", color: "var(--background)" }
                  : { backgroundColor: "var(--secondary-color)", color: "var(--foreground)" }
              }
            >
              OVERALL
            </button>
            {roundNumbers.map((r) => (
              <button
                key={r}
                onClick={() => handleTabChange(String(r))}
                className="px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition"
                style={
                  activeTab === String(r)
                    ? { backgroundColor: "var(--accent-color)", color: "var(--background)" }
                    : { backgroundColor: "var(--secondary-color)", color: "var(--foreground)" }
                }
              >
                ROUND {r}
              </button>
            ))}
          </div>

          {/* Search + rows-per-page */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="relative w-full sm:w-80">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]"
              />
              <input
                type="text"
                placeholder="Search team, player or number"
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg border text-sm"
                style={{
                  backgroundColor: "var(--secondary-color)",
                  borderColor: "var(--border-color)",
                  color: "var(--foreground)",
                }}
              />
            </div>
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-3 py-2 rounded-lg border text-sm w-fit"
              style={{
                backgroundColor: "var(--secondary-color)",
                borderColor: "var(--border-color)",
                color: "var(--foreground)",
              }}
            >
              {ROWS_PER_PAGE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n} per page
                </option>
              ))}
              <option value={filteredRows.length || 1}>All teams</option>
            </select>
          </div>

          {/* Table */}
          <div
            className="overflow-x-auto scrollbar-x rounded-lg border"
            style={{ borderColor: "var(--border-color)" }}
          >
            <table className="min-w-full border-collapse text-sm">
              <thead style={{ backgroundColor: "var(--secondary-color)" }}>
                <tr>
                  <th className="p-3 text-left">#</th>
                  <th className="p-3 text-left">Team</th>
                  <th
                    className="p-3 text-left"
                    style={{ color: "var(--success-color)" }}
                  >
                    Wins
                  </th>
                  <th className="p-3 text-left" style={{ color: "var(--error-color)" }}>
                    Losses
                  </th>
                  <th className="p-3 text-left">Points</th>
                  <th className="p-3 text-left">Hands</th>
                  <th className="p-3 text-left">Bostons</th>
                  <th className="p-3 text-left">Win %</th>
                  <th className="p-3 text-left">Last 3</th>
                  <th className="p-3 text-left">Trend</th>
                </tr>
              </thead>
              <tbody style={{ backgroundColor: "var(--card-background)" }}>
                {pagedRows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-6 text-center text-[var(--muted-foreground)]">
                      No standings yet — check back once matches are completed.
                    </td>
                  </tr>
                ) : (
                  pagedRows.map((row) => {
                    const isLeader = row.rank === 1;
                    const isChampion = idOf(gameConfig?.winner) === row.teamId;
                    return (
                      <tr
                        key={row.teamId}
                        className="border-b transition-colors hover:bg-[var(--secondary-hover)]"
                        style={{
                          borderBottomColor: "var(--border-color)",
                          borderLeftWidth: isLeader ? "4px" : "0px",
                          borderLeftStyle: "solid",
                          borderLeftColor: "var(--accent-color)",
                          backgroundColor: isLeader
                            ? "color-mix(in srgb, var(--accent-color) 10%, var(--card-background))"
                            : undefined,
                        }}
                      >
                        <td className="p-3 font-semibold">
                          <span className="inline-flex items-center gap-1">
                            {isLeader && <Crown size={16} className="text-[var(--accent-color)]" />}
                            {row.rank}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="font-medium">
                            {[row.displayId, row.name].filter(Boolean).join(" ")}
                          </span>
                          {isChampion && (
                            <span
                              className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full"
                              style={{
                                backgroundColor: "var(--accent-color)",
                                color: "var(--background)",
                              }}
                            >
                              Champion
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <span
                            className="inline-block min-w-[2rem] text-center px-2 py-0.5 rounded-full font-semibold"
                            style={{
                              backgroundColor:
                                "color-mix(in srgb, var(--success-color) 20%, transparent)",
                              color: "var(--success-color)",
                            }}
                          >
                            {row.wins}
                          </span>
                        </td>
                        <td className="p-3">
                          <span
                            className="inline-block min-w-[2rem] text-center px-2 py-0.5 rounded-full font-semibold"
                            style={{
                              backgroundColor:
                                "color-mix(in srgb, var(--error-color) 20%, transparent)",
                              color: "var(--error-color)",
                            }}
                          >
                            {row.losses}
                          </span>
                        </td>
                        <td className="p-3">{row.pointsFor}</td>
                        <td className="p-3">{row.handsFor}</td>
                        <td className="p-3">{row.bostonsFor}</td>
                        <td className="p-3">{row.winPct}%</td>
                        <td className="p-3">
                          <div className="flex gap-1">
                            {Array.from({ length: 3 }).map((_, i) => {
                              const result = row.last3[row.last3.length - 3 + i];
                              return (
                                <span
                                  key={i}
                                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                                  style={
                                    result === "W"
                                      ? { backgroundColor: "var(--success-color)", color: "white" }
                                      : result === "L"
                                      ? { backgroundColor: "var(--error-color)", color: "white" }
                                      : {
                                          backgroundColor: "var(--secondary-color)",
                                          color: "var(--muted-foreground)",
                                        }
                                  }
                                >
                                  {result || ""}
                                </span>
                              );
                            })}
                          </div>
                        </td>
                        <td className="p-3">
                          {row.trend === "up" ? (
                            <TrendingUp size={18} className="text-[var(--success-color)]" />
                          ) : row.trend === "down" ? (
                            <TrendingDown size={18} className="text-[var(--error-color)]" />
                          ) : (
                            <Minus size={18} className="text-[var(--muted-foreground)]" />
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg text-sm disabled:opacity-40"
                style={{ backgroundColor: "var(--secondary-color)", color: "var(--foreground)" }}
              >
                Prev
              </button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className="w-8 h-8 rounded-lg text-sm font-medium"
                  style={
                    currentPage === i + 1
                      ? { backgroundColor: "var(--accent-color)", color: "var(--background)" }
                      : { backgroundColor: "var(--secondary-color)", color: "var(--foreground)" }
                  }
                >
                  {i + 1}
                </button>
              ))}
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg text-sm disabled:opacity-40"
                style={{ backgroundColor: "var(--secondary-color)", color: "var(--foreground)" }}
              >
                Next
              </button>
            </div>
          )}

          {/* Stats footer */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Teams", value: teams.length },
              { label: "Total Hands", value: totalHands },
              { label: "Total Bostons", value: totalBostons },
              { label: "Rounds Completed", value: `${roundsCompleted}/${roundNumbers.length}` },
            ].map((stat) => (
              <div
                key={stat.label}
                className="p-4 rounded-xl text-center"
                style={{ backgroundColor: "var(--card-background)" }}
              >
                <p className="text-2xl font-bold" style={{ color: "var(--accent-color)" }}>
                  {stat.value}
                </p>
                <p className="text-xs text-[var(--muted-foreground)] mt-1">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-[var(--muted-foreground)]">
              Live standings update automatically.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
                style={{ backgroundColor: "var(--secondary-color)", color: "var(--foreground)" }}
              >
                <Printer size={16} />
                Print
              </button>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
                style={{ backgroundColor: "var(--accent-color)", color: "var(--background)" }}
              >
                <Download size={16} />
                Export
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
