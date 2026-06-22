"use client";
import { useEffect, useState } from "react";
import api from "@/utils/axios";
import { toast } from "react-hot-toast";

export default function AllRegisteredPlayers() {
  const [registrations, setRegistrations] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(30); // ✅ default 30
  const [search, setSearch] = useState("");

  const fetchRegistrations = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/tournamentRegister/fetch-all-users");
      setRegistrations(res.data?.data || []);
      setFiltered(res.data?.data || []);
    } catch (err) {
      console.error("❌ Failed to fetch registrations:", err);
      toast.error("Failed to fetch registrations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistrations();
  }, []);

  // Search/filter logic
  useEffect(() => {
    const query = search.toLowerCase();
    const filteredData = registrations.filter((reg) => {
      const username = `${reg.user?.firstname || ""} ${reg.user?.lastname || ""}`.toLowerCase();
      const email = reg.user?.email?.toLowerCase() || "";
      const tournament = reg.tournament?.name?.toLowerCase() || "";
      return username.includes(query) || email.includes(query) || tournament.includes(query);
    });
    setFiltered(filteredData);
    setCurrentPage(1); // reset to first page when searching
  }, [search, registrations]);

  // Pagination logic
  const indexOfLast = rowsPerPage === "all" ? filtered.length : currentPage * rowsPerPage;
  const indexOfFirst = rowsPerPage === "all" ? 0 : indexOfLast - rowsPerPage;
  const currentRows = filtered.slice(indexOfFirst, indexOfLast);
  const totalPages =
    rowsPerPage === "all" ? 1 : Math.ceil(filtered.length / rowsPerPage);

  if (loading)
    return <p className="text-center mt-10 text-white">Loading registrations...</p>;

  if (!registrations.length)
    return <p className="opacity-70 text-center mt-10 text-sm">No registrations found</p>;

  return (
    <div className="min-h-screen p-6 bg-[var(--background)] text-[var(--foreground)]">
      <h1 className="text-2xl font-bold mb-6">Registered Users</h1>

      {/* Search + Rows per page */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-3">
        <input
          type="text"
          placeholder="Search by user, email, or tournament"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="p-2 rounded border border-[var(--border-color)] bg-[var(--card-background)] text-white w-full sm:w-64"
        />

        {/* Rows per page dropdown */}
        <div className="flex items-center gap-2">
          <label htmlFor="rowsPerPage" className="text-sm">
            Rows per page:
          </label>
          <select
            id="rowsPerPage"
            value={rowsPerPage}
            onChange={(e) =>
              setRowsPerPage(e.target.value === "all" ? "all" : Number(e.target.value))
            }
            className="p-2 rounded border border-[var(--border-color)] bg-[var(--card-background)]"
          >
            <option value={10}>10</option>
            <option value={30}>30</option>
            <option value={50}>50</option>
            <option value="all">All</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto scrollbar rounded-lg border border-[var(--border-color)]">
        <table className="min-w-full border-collapse">
          <thead className="bg-[var(--secondary-color)] text-[var(--foreground)]">
            <tr>
              <th className="py-2 px-4 text-left text-sm font-semibold border-b border-[var(--border-color)]">
                User
              </th>
              <th className="py-2 px-4 text-left text-sm font-semibold border-b border-[var(--border-color)]">
                Email
              </th>
              <th className="py-2 px-4 text-left text-sm font-semibold border-b border-[var(--border-color)]">
                Tournament
              </th>
              <th className="py-2 px-4 text-left text-sm font-semibold border-b border-[var(--border-color)]">
                Games
              </th>
            </tr>
          </thead>
          <tbody className="bg-[var(--card-background)] text-[var(--foreground)]">
            {currentRows.map((reg) => (
              <tr
                key={reg._id}
                className="hover:bg-[var(--secondary-hover)] transition-colors"
              >
                <td className="py-2 px-4 border-b border-[var(--border-color)]">
                  {reg.user?.firstname} {reg.user?.lastname}
                </td>
                <td className="py-2 px-4 border-b border-[var(--border-color)]">
                  {reg.user?.email}
                </td>
                <td className="py-2 px-4 border-b border-[var(--border-color)]">
                  {reg.tournament?.name}
                </td>
                <td className="py-2 px-4 border-b border-[var(--border-color)]">
                  {reg.gameRegistrationDetails &&
                  Array.isArray(reg.gameRegistrationDetails.games) &&
                  reg.gameRegistrationDetails.games.length > 0 ? (
                    reg.gameRegistrationDetails.games.map((game, i) => (
                      <span
                        key={i}
                        className="mr-1 mb-1 inline-block px-2 py-1 rounded-lg bg-[var(--secondary-hover)] text-sm"
                      >
                        {game.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm opacity-70">No games</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {rowsPerPage !== "all" && (
        <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-2 text-[var(--foreground)]">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 rounded-lg bg-[var(--secondary-color)] hover:bg-[var(--secondary-hover)] disabled:opacity-50"
          >
            Previous
          </button>
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 rounded-lg bg-[var(--secondary-color)] hover:bg-[var(--secondary-hover)] disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
