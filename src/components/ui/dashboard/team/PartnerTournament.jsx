"use client";

import { useEffect, useState, useMemo } from "react";
import api from "@/utils/axios";
import { Loader2 } from "lucide-react";

export default function PartnerTournaments() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & search
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get("/api/team/fetch-partner");
        const data = res.data?.data || [];
        setTournaments(data); // keep all tournaments; filter/search later
      } catch (err) {
        console.error("Error fetching tournaments:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // ✅ Filter + search
  const filteredTournaments = useMemo(() => {
    return tournaments
      .filter((t) =>
        statusFilter === "all" ? true : t.status === statusFilter
      )
      .filter((t) => {
        const searchText = search.toLowerCase();
        return (
          t.name?.toLowerCase().includes(searchText) ||
          t.partner?.firstname?.toLowerCase().includes(searchText) ||
          t.partner?.lastname?.toLowerCase().includes(searchText) ||
          t.partner?.username?.toLowerCase().includes(searchText)
        );
      });
  }, [tournaments, search, statusFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredTournaments.length / itemsPerPage);
  const paginated = filteredTournaments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset page on filter/search change
  useEffect(() => setCurrentPage(1), [search, statusFilter]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-[var(--accent-color)] w-8 h-8" />
      </div>
    );
  }

  if (!tournaments.length) {
    return (
      <p className="text-center text-[var(--foreground)] opacity-70">
        No tournaments found.
      </p>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <input
          type="text"
          placeholder="Search by tournament or partner..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-1/2 p-2 rounded-lg bg-[var(--card-background)] border border-[var(--border-color)] text-[var(--foreground)] focus:outline-none"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="p-2 rounded-lg bg-[var(--card-background)] border border-[var(--border-color)] text-[var(--foreground)] focus:outline-none"
        >
          <option value="all">All Status</option>
          <option value="upcoming">Upcoming</option>
          <option value="ongoing">Ongoing</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* Tournament Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {paginated.map((t) => (
          <div
            key={t._id}
            className="bg-[var(--card-background)] border border-[var(--border-color)] rounded-2xl p-5 hover:bg-[var(--card-hover)] transition"
          >
            <h2 className="text-lg font-semibold text-[var(--foreground)] mb-2">
              {t.name}
            </h2>

            <p className="text-sm text-[var(--info-color)] mb-1">
              {new Date(t.startDate).toLocaleDateString()} -{" "}
              {new Date(t.endDate).toLocaleDateString()}
            </p>

            <p className="text-sm mb-2 text-[var(--foreground)]">
              📍 {t.location || "Online"}
            </p>

            <p
              className={`inline-block px-3 py-1 text-xs rounded-full mb-3 ${
                t.status === "upcoming"
                  ? "bg-[var(--info-color)]/20 text-[var(--info-color)]"
                  : t.status === "completed"
                    ? "bg-[var(--success-color)]/20 text-[var(--success-color)]"
                    : "bg-[var(--accent-color)]/20 text-[var(--accent-color)]"
              }`}
            >
              {t.status}
            </p>

            {/* Partner Info */}
            {t.partner && (
              <div className="border-t border-[var(--border-color)] pt-3">
                <p className="text-sm text-[var(--accent-color)] font-medium">
                  Partner Assigned
                </p>
                <p className="text-sm text-[var(--foreground)]">
                  {t.partner.firstname} {t.partner.lastname}
                </p>
                <p className="text-xs text-[var(--foreground)] opacity-70">
                  {t.partner.username}
                </p>
              </div>
            )}

            {/* Registered Games */}
            {t.registeredGames?.length > 0 && (
              <div className="border-t border-[var(--border-color)] pt-3 mt-2">
                <p className="text-sm text-[var(--accent-color)] font-medium mb-1">
                  Registered Games
                </p>
                <ul className="list-disc list-inside text-sm text-[var(--foreground)]">
                  {t.registeredGames.map((g, idx) => (
                    <li key={idx}>
                      {g.name} ({g.platform})
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 mt-4">
          <button
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 rounded-lg bg-[var(--secondary-color)] text-[var(--foreground)] disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-[var(--foreground)]">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 rounded-lg bg-[var(--secondary-color)] text-[var(--foreground)] disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
