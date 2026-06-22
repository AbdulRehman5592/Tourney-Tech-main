"use client";

import { useEffect, useState } from "react";
import api from "@/utils/axios";
import { toast } from "react-hot-toast";

export default function AdminRegistrationsTable() {
  const [registrations, setRegistrations] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const rowsPerPage = 10;

  // ✅ status order: pending → rejected → approved
  const statusPriority = {
    pending: 1,
    rejected: 2,
    approved: 3,
  };

  // Fetch registrations
  useEffect(() => {
    async function fetchRegistrations() {
      try {
        const res = await api.get(`/api/tournamentRegister`);
        setRegistrations(res.data.data || []);
        setFiltered(res.data.data || []);
      } catch (err) {
        console.error(err);
        toast.error("Failed to fetch registrations");
      } finally {
        setLoading(false);
      }
    }
    fetchRegistrations();
  }, []);

  // ✅ Search + Sort
  useEffect(() => {
    const filteredData = registrations.filter((r) => {
      const username = r.user?.username?.toLowerCase() || "";
      const email = r.user?.email?.toLowerCase() || "";
      const tournament = r.tournament?.name?.toLowerCase() || "";
      const query = search.toLowerCase();
      return (
        username.includes(query) ||
        email.includes(query) ||
        tournament.includes(query)
      );
    });

    const sortedData = filteredData.sort((a, b) => {
      const statusA = a.gameRegistrationDetails?.status || "pending";
      const statusB = b.gameRegistrationDetails?.status || "pending";

      if (statusA !== statusB) {
        return statusPriority[statusA] - statusPriority[statusB];
      }

      // If both same status → sort by newest first
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    setFiltered(sortedData);
    setCurrentPage(1);
  }, [search, registrations]);

  // Approve/Reject handler
  const handleStatusUpdate = async (id, status) => {
    try {
      const formData = new FormData();
      formData.append("status", status);

      const res = await api.patch(`/api/tournamentRegister/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setRegistrations((prev) =>
        prev.map((r) =>
          r._id === id
            ? {
                ...r,
                gameRegistrationDetails: {
                  ...r.gameRegistrationDetails,
                  status: res.data.data.gameRegistrationDetails.status,
                  paid: res.data.data.gameRegistrationDetails.paid,
                },
                updatedAt: res.data.data.updatedAt, // ✅ update timestamp too
              }
            : r
        )
      );

      toast.success(`Registration ${status}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update status");
    }
  };

  // Pagination logic
  const indexOfLast = currentPage * rowsPerPage;
  const indexOfFirst = indexOfLast - rowsPerPage;
  const currentRows = filtered.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filtered.length / rowsPerPage);

  if (loading) return <p className="text-center mt-10">Loading...</p>;

  return (
    <div className="max-w-full">
      <div className="flex items-center justify-between flex-wrap">
        <h1 className="text-2xl font-bold text-[var(--accent-color)] md:mb-0 mb-4">
          Players Registration
        </h1>

        {/* Search input */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search by user, email, or tournament"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="p-2 rounded border border-[var(--border-color)] bg-[var(--card-background)] text-white w-full sm:w-64"
          />
        </div>
      </div>

      <div className="scrollbar-x overflow-x-auto">
        <table
          className="border border-[var(--border-color)] rounded-lg overflow-hidden"
          style={{ tableLayout: "auto", width: "max-content" }}
        >
          <thead className="bg-[var(--secondary-color)] text-[var(--foreground)]">
            <tr>
              <th className="py-2 px-4 text-left">User</th>
              <th className="py-2 px-4 text-left">User Email</th>
              <th className="py-2 px-4 text-left">Tournament</th>
              <th className="py-2 px-4 text-left">Game</th>
              <th className="py-2 px-4 text-left">Entry Fee</th>
              <th className="py-2 px-4 text-left">Players</th>
              <th className="py-2 px-4 text-left">Paid</th>
              <th className="py-2 px-4 text-left">Payment Method</th>
              <th className="py-2 px-4 text-left">Bank Name</th>
              <th className="py-2 px-4 text-left">Player Account Name</th>
              <th className="py-2 px-4 text-left">Player Transaction ID</th>
              <th className="py-2 px-4 text-left">Current Status</th>
              <th className="py-2 px-4 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-[var(--card-background)] text-[var(--foreground)]">
            {currentRows.map((r) => (
              <tr
                key={r._id}
                className="border-b border-[var(--border-color)] hover:bg-[var(--secondary-hover)]"
              >
                <td className="py-2 px-4">{r.user?.username}</td>
                <td className="py-2 px-4">{r.user?.email}</td>
                <td className="py-2 px-4">{r.tournament?.name || "-"}</td>
                <td className="py-2 px-4">
                  {r.gameRegistrationDetails?.games
                    ?.map((g) => g.name)
                    .join(", ")}
                </td>
                <td className="py-2 px-4">
                  {r.gameRegistrationDetails?.games?.reduce(
                    (total, regGame) => {
                      const match = r.tournament?.games?.find(
                        (g) => g._id === regGame._id || g.game === regGame._id
                      );
                      return total + (match?.entryFee || 0);
                    },
                    0
                  )}
                </td>

                <td className="py-2 px-4">
                  {r.gameRegistrationDetails?.games?.length > 0
                    ? r.gameRegistrationDetails.games
                        .map((regGame) => {
                          const game = r.tournament?.games?.find(
                            (g) =>
                              g._id === regGame._id || g.game === regGame._id
                          );
                          if (!game) return null;

                          if (game.teamBased) {
                            return game.tournamentTeamType
                              ? game.tournamentTeamType.replace("_", " ")
                              : "Team Based";
                          } else {
                            return "Single Player";
                          }
                        })
                        .filter(Boolean)
                        .join(" - ")
                    : "-"}
                </td>

                <td className="py-2 px-4">
                  {r.gameRegistrationDetails?.paid ? (
                    <span className="text-[var(--success-color)]">Yes</span>
                  ) : (
                    <span className="text-[var(--error-color)]">No</span>
                  )}
                </td>
                <td className="py-2 px-4">
                  {r.gameRegistrationDetails?.paymentMethod}
                </td>
                <td className="py-2 px-4">
                  {r.gameRegistrationDetails?.paymentDetails?.bankId
                    ?.bankName || "-"}
                </td>
                <td className="py-2 px-4">
                  {r.gameRegistrationDetails?.paymentDetails?.accountName ||
                    "-"}
                </td>
                <td className="py-2 px-4">
                  {r.gameRegistrationDetails?.paymentDetails?.transactionId ||
                    "-"}
                </td>

                <td
                  className={`text-center capitalize ${
                    r.gameRegistrationDetails?.status === "approved"
                      ? "text-[var(--success-color)]"
                      : r.gameRegistrationDetails?.status === "rejected"
                      ? "text-[var(--error-color)]"
                      : "text-white"
                  }`}
                >
                  {r.gameRegistrationDetails?.status}
                </td>

                <td className="py-2 px-4">
                  <select
                    value={r.gameRegistrationDetails?.status || "pending"}
                    onChange={(e) => handleStatusUpdate(r._id, e.target.value)}
                    className="px-2 py-1 rounded-lg border border-gray-300 bg-[var(--card-background)] text-[var(--foreground)]"
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center mt-4 text-[var(--foreground)]">
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
          onClick={() =>
            setCurrentPage((prev) => Math.min(prev + 1, totalPages))
          }
          disabled={currentPage === totalPages}
          className="px-3 py-1 rounded-lg bg-[var(--secondary-color)] hover:bg-[var(--secondary-hover)] disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
