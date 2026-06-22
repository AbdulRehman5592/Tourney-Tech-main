"use client";

import { useEffect, useState, useMemo } from "react";
import api from "@/utils/axios";
import { useParams } from "next/navigation";

export default function Scoreboard() {
  const { tournamentId, gameId } = useParams();
  const [scoreboard, setScoreboard] = useState({});
  const [loading, setLoading] = useState(true);

  // ✅ Independent search + pagination
  const [searchRound1, setSearchRound1] = useState("");
  const [searchRound2, setSearchRound2] = useState("");
  const [pageRound1, setPageRound1] = useState(1);
  const [pageRound2, setPageRound2] = useState(1);

  const perPage = 5;

  useEffect(() => {
    if (!tournamentId || !gameId) return;

    const fetchScoreboard = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams({ tournamentId, gameId });
        const res = await api.get(`/api/scorecard?${query.toString()}`);
        setScoreboard(res.data?.data?.rounds || {});
      } catch (err) {
        console.error("Error fetching scoreboard:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchScoreboard();
  }, [tournamentId, gameId]);

  // ✅ Flatten matches
  const allMatches = useMemo(() => {
    return Object.entries(scoreboard).flatMap(([round, data]) =>
      data.matches.map((match) => ({
        ...match,
        round: Number(round),
        stage: data.stage,
      }))
    );
  }, [scoreboard]);

  // ✅ Grouped + search (independent)
  const groupedRounds = useMemo(() => {
    const roundOne = allMatches.filter(
      (m) =>
        m.round === 1 &&
        (searchRound1.trim() === "" ||
          m.teamA?.toLowerCase().includes(searchRound1.toLowerCase()) ||
          m.teamB?.toLowerCase().includes(searchRound1.toLowerCase()))
    );

    const roundTwoPlus = allMatches.filter(
      (m) =>
        m.round >= 2 &&
        (searchRound2.trim() === "" ||
          m.teamA?.toLowerCase().includes(searchRound2.toLowerCase()) ||
          m.teamB?.toLowerCase().includes(searchRound2.toLowerCase()))
    );

    return { roundOne, roundTwoPlus };
  }, [allMatches, searchRound1, searchRound2]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-white">Loading scoreboard...</p>
      </div>
    );
  }

  if (!allMatches.length) {
    return (
      <p className="text-center text-gray-400">No matches available yet.</p>
    );
  }

  return (
    <div className="space-y-10">
      {/* Round 1 Table */}
      <TableSection
        title="Round 1"
        matches={groupedRounds.roundOne}
        search={searchRound1}
        setSearch={setSearchRound1}
        page={pageRound1}
        setPage={setPageRound1}
        perPage={perPage}
      />

      {/* Round 2 Table */}
      <TableSection
        title="Round 2"
        matches={groupedRounds.roundTwoPlus}
        search={searchRound2}
        setSearch={setSearchRound2}
        page={pageRound2}
        setPage={setPageRound2}
        perPage={perPage}
      />
    </div>
  );
}

// ✅ Reusable Table Section
function TableSection({
  title,
  matches,
  search,
  setSearch,
  page,
  setPage,
  perPage,
}) {
  const totalPages = Math.ceil(matches.length / perPage);
  const start = (page - 1) * perPage;
  const paginated = matches.slice(start, start + perPage);

  return (
    <div>
      <h2 className="text-xl font-bold text-yellow-400 mb-4">{title}</h2>

      {/* Local Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder={`Search in ${title}...`}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1); // reset pagination when searching
          }}
          className="px-3 py-2 rounded-lg bg-[var(--secondary-color)] text-white border border-[var(--border-color)] w-full md:w-1/3"
        />
      </div>

      <div className="overflow-x-auto  scrollbar-x">
        <table className="w-full border-collapse rounded-lg overflow-hidden" style={{ tableLayout: "auto", width: "max-content" }}>
          <thead className="bg-gray-800 text-white">
            <tr>
              <th className="p-3 text-left">Match #</th>
              <th className="p-3 text-left">Team A</th>
              <th className="p-3 text-left">Team A Region</th>
              <th className="p-3 text-left">Score</th>
              <th className="p-3 text-left">Team A Boston</th>
              <th className="p-3 text-left">Team B</th>
              <th className="p-3 text-left">Team B Region</th>
              <th className="p-3 text-left">Score</th>
              <th className="p-3 text-left">Team B Boston</th>
              <th className="p-3 text-left">Winner</th>
              <th className="p-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="bg-gray-900 text-gray-200">
            {paginated.length > 0 ? (
              paginated.map((match, i) => (
                <tr
                  key={i}
                  className="border-b border-gray-700 hover:bg-gray-800 transition"
                >
                  <td className="p-3">#{match.matchNumber}</td>
                  <td
                    className={`p-3 ${
                      match.winner === match.teamA ? "text-green-400 font-bold" : ""
                    }`}
                  >
                    {match.teamA || "TBD"}
                  </td>
                  <td className="p-3">{match.teamACity || "N/A"}</td>
                  <td className="p-3">{match.teamAScore ?? "-"}</td>
                  <td className="p-3">{match.teamABoston ?? "-"}</td>
                  <td
                    className={`p-3 ${
                      match.winner === match.teamB ? "text-green-400 font-bold" : ""
                    }`}
                  >
                    {match.teamB || "TBD"}
                  </td>
                  <td className="p-3">{match.teamBCity || "N/A"}</td>
                  <td className="p-3">{match.teamBScore ?? "-"}</td>
                  <td className="p-3">{match.teamBBoston ?? "-"}</td>
                  <td className="p-3 text-yellow-400 font-semibold">
                    {match.winner || "TBD"}
                  </td>
                  <td
                    className={`p-3 ${
                      match.status === "completed"
                        ? "text-green-400"
                        : "text-blue-400"
                    }`}
                  >
                    {match.status}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="p-4 text-center text-gray-400 italic">
                  No data found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && paginated.length > 0 && (
        <div className="flex justify-center mt-4 gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50"
          >
            Prev
          </button>
          <span className="text-white px-2">
            {page} / {totalPages}
          </span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
