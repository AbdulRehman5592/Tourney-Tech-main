"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Percent,
  Activity,
} from "lucide-react";
import api from "@/utils/axios";

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50];
const SORT_OPTIONS = [
  { value: "rank", label: "Sort by Rank" },
  { value: "attendance", label: "Sort by Attendance" },
  { value: "events", label: "Sort by Events" },
  { value: "top4", label: "Sort by Top 4" },
];

const RANK_BADGE = {
  1: { backgroundColor: "var(--accent-color)", color: "var(--background)" },
  2: { backgroundColor: "#C0C0C0", color: "var(--background)" },
  3: { backgroundColor: "#CD7F32", color: "var(--background)" },
};

const DEFAULT_GAME_TYPE = "Bid Whist";

export default function NationalRankingsPage() {
  const [gameTypes, setGameTypes] = useState([]);
  const [selectedGameType, setSelectedGameType] = useState(null);
  const [gameTypesLoading, setGameTypesLoading] = useState(true);

  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [stateFilter, setStateFilter] = useState("all");
  const [sortBy, setSortBy] = useState("rank");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Rankings are kept strictly separate per game type (Bid Whist, Spades,
  // Pinochle, Bridge, etc.) -- load the game type matrix once, then default
  // to Bid Whist (falling back to the first type if it isn't in the list).
  useEffect(() => {
    const fetchGameTypes = async () => {
      try {
        const res = await api.get("/api/game-types");
        const fetchedTypes = res.data?.data || [];
        setGameTypes(fetchedTypes);
        if (fetchedTypes.length) {
          const defaultType = fetchedTypes.find((t) => t.name === DEFAULT_GAME_TYPE);
          setSelectedGameType((defaultType || fetchedTypes[0]).name);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to load game types:", err);
        setError(err?.response?.data?.message || "Failed to load game types");
        setLoading(false);
      } finally {
        setGameTypesLoading(false);
      }
    };
    fetchGameTypes();
  }, []);

  useEffect(() => {
    if (!selectedGameType) return;

    const fetchRankings = async () => {
      setLoading(true);
      try {
        const res = await api.get("/api/rankings/national", {
          params: { gameType: selectedGameType },
        });
        setRankings(res.data?.data?.rankings || []);
        setCurrentPage(1);
      } catch (err) {
        console.error("Failed to load national rankings:", err);
        setError(err?.response?.data?.message || "Failed to load rankings");
      } finally {
        setLoading(false);
      }
    };
    fetchRankings();
  }, [selectedGameType]);

  const states = useMemo(
    () => [...new Set(rankings.map((r) => r.state).filter(Boolean))].sort(),
    [rankings]
  );

  const filteredRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    let rows = rankings.filter((r) => {
      const matchesTerm =
        !term || r.name?.toLowerCase().includes(term) || r.state?.toLowerCase().includes(term);
      const matchesState = stateFilter === "all" || r.state === stateFilter;
      return matchesTerm && matchesState;
    });

    const sorters = {
      rank: (a, b) => a.rank - b.rank,
      attendance: (a, b) => b.attendancePct - a.attendancePct,
      events: (a, b) => b.events - a.events,
      top4: (a, b) => b.top4 - a.top4,
    };
    rows = [...rows].sort(sorters[sortBy] || sorters.rank);
    return rows;
  }, [rankings, searchTerm, stateFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / rowsPerPage));
  const pagedRows = filteredRows.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const activePlayers = rankings.filter((r) => r.events > 0);
  const avgAttendance = activePlayers.length
    ? Math.round(
        activePlayers.reduce((sum, r) => sum + r.attendancePct, 0) / activePlayers.length
      )
    : 0;
  const rankingMoves = rankings.filter((r) => r.trend !== "flat").length;

  const handleFilterChange = (setter) => (value) => {
    setter(value);
    setCurrentPage(1);
  };

  if (gameTypesLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-[var(--accent-color)] w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
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
              NATIONAL PLAYER RANKINGS
            </h1>
            <p className="text-sm md:text-base text-[var(--muted-foreground)] mt-1">
              {selectedGameType
                ? `Ranked across every completed ${selectedGameType} tournament on Tourney Techs`
                : "Ranked across every completed tournament on Tourney Techs"}
            </p>
          </div>
        </div>
      </div>

      {/* Game type selector -- rankings never mix across game types */}
      {gameTypes.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {gameTypes.map((gt) => (
            <button
              key={gt._id}
              onClick={() => setSelectedGameType(gt.name)}
              className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors"
              style={
                selectedGameType === gt.name
                  ? { backgroundColor: "var(--accent-color)", color: "var(--background)", borderColor: "var(--accent-color)" }
                  : {
                      backgroundColor: "var(--secondary-color)",
                      color: "var(--foreground)",
                      borderColor: "var(--border-color)",
                    }
              }
            >
              {gt.name}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div
          className="p-4 rounded-xl text-center text-sm"
          style={{ backgroundColor: "var(--card-background)", color: "var(--error-color)" }}
        >
          {error}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: Users, label: "Ranked Players", value: rankings.length },
          { icon: Percent, label: "Avg Attendance", value: `${avgAttendance}%` },
          { icon: Activity, label: "Ranking Moves", value: rankingMoves },
        ].map((stat) => (
          <div
            key={stat.label}
            className="p-4 rounded-xl flex items-center gap-3"
            style={{ backgroundColor: "var(--card-background)" }}
          >
            <stat.icon size={22} className="text-[var(--accent-color)]" />
            <div>
              <p className="text-xl font-bold">{stat.value}</p>
              <p className="text-xs text-[var(--muted-foreground)]">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-80">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]"
          />
          <input
            type="text"
            placeholder="Search players or state"
            value={searchTerm}
            onChange={(e) => handleFilterChange(setSearchTerm)(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border text-sm"
            style={{
              backgroundColor: "var(--secondary-color)",
              borderColor: "var(--border-color)",
              color: "var(--foreground)",
            }}
          />
        </div>
        <div className="flex gap-2">
          <select
            value={stateFilter}
            onChange={(e) => handleFilterChange(setStateFilter)(e.target.value)}
            className="px-3 py-2 rounded-lg border text-sm"
            style={{
              backgroundColor: "var(--secondary-color)",
              borderColor: "var(--border-color)",
              color: "var(--foreground)",
            }}
          >
            <option value="all">All States</option>
            {states.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => handleFilterChange(setSortBy)(e.target.value)}
            className="px-3 py-2 rounded-lg border text-sm"
            style={{
              backgroundColor: "var(--secondary-color)",
              borderColor: "var(--border-color)",
              color: "var(--foreground)",
            }}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div
        className="overflow-x-auto scrollbar-x rounded-lg border"
        style={{ borderColor: "var(--border-color)" }}
      >
        <table className="min-w-full border-collapse text-sm">
          <thead style={{ backgroundColor: "var(--secondary-color)" }}>
            <tr>
              <th className="p-3 text-left">Rank</th>
              <th className="p-3 text-left">Player</th>
              <th className="p-3 text-left">Attendance %</th>
              <th className="p-3 text-left">Overall Pts</th>
              <th className="p-3 text-left">Events</th>
              <th className="p-3 text-left">Top 4</th>
              <th className="p-3 text-left">State</th>
              <th className="p-3 text-left">Trend</th>
            </tr>
          </thead>
          <tbody style={{ backgroundColor: "var(--card-background)" }}>
            {loading ? (
              <tr>
                <td colSpan={8} className="p-6 text-center">
                  <Loader2 className="animate-spin text-[var(--accent-color)] w-6 h-6 mx-auto" />
                </td>
              </tr>
            ) : pagedRows.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-6 text-center text-[var(--muted-foreground)]">
                  No ranked players yet -- rankings appear once round-robin, mesh, or standard
                  tournaments finish for {selectedGameType || "this game"}.
                </td>
              </tr>
            ) : (
              pagedRows.map((row) => (
                <tr
                  key={row.userId}
                  className="border-b transition-colors hover:bg-[var(--secondary-hover)]"
                  style={{ borderColor: "var(--border-color)" }}
                >
                  <td className="p-3 font-semibold">
                    <span
                      className="inline-flex items-center justify-center w-7 h-7 rounded-full font-bold"
                      style={RANK_BADGE[row.rank] || { color: "var(--foreground)" }}
                    >
                      {row.rank}
                    </span>
                  </td>
                  <td className="p-3 font-medium">{row.name}</td>
                  <td className="p-3">{row.attendancePct}%</td>
                  <td className="p-3 font-semibold" style={{ color: "var(--accent-color)" }}>
                    {row.overallPoints}
                  </td>
                  <td className="p-3">{row.events}</td>
                  <td className="p-3">{row.top4}</td>
                  <td className="p-3">{row.state || "--"}</td>
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
              ))
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
    </div>
  );
}
