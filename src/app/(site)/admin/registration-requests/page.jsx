"use client";

import { useEffect, useState } from "react";
import api from "@/utils/axios";
import { toast } from "react-hot-toast";
import { useBulkSelection } from "@/hooks/useBulkSelection";

export default function AdminRegistrationsTable() {
  const [registrations, setRegistrations] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const rowsPerPage = 10;
  // Local drafts for the Notes column -- typed as the admin edits, only
  // sent to the server on blur so we're not firing a request per keystroke.
  const [noteDrafts, setNoteDrafts] = useState({});
  const [savingNoteId, setSavingNoteId] = useState(null);

  // Bulk approve/reject -- for when an admin has just bulk-registered a
  // group of players (Register Player / Excel import) and doesn't want to
  // click the status dropdown one row at a time.
  const bulkSelection = useBulkSelection((r) => r._id);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);

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

  // Bulk approve/reject -- fans out to the same per-row PATCH the dropdown
  // already uses (no new bulk API needed) and reports success/failure per
  // row, same shape as the Register Player bulk-result panel.
  const handleBulkStatusUpdate = async (status) => {
    const ids = [...bulkSelection.selected];
    if (!ids.length) {
      toast.error("Select at least one registration");
      return;
    }

    setBulkUpdating(true);
    setBulkResult(null);
    try {
      const results = await Promise.allSettled(
        ids.map((id) => {
          const formData = new FormData();
          formData.append("status", status);
          return api.patch(`/api/tournamentRegister/${id}`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        })
      );

      const succeeded = [];
      const failed = [];
      results.forEach((result, i) => {
        const id = ids[i];
        const registration = registrations.find((r) => r._id === id);
        const label = registration?.user?.username || registration?.user?.email || id;

        if (result.status === "fulfilled") {
          succeeded.push(id);
          setRegistrations((prev) =>
            prev.map((r) =>
              r._id === id
                ? {
                    ...r,
                    gameRegistrationDetails: {
                      ...r.gameRegistrationDetails,
                      status: result.value.data.data.gameRegistrationDetails.status,
                      paid: result.value.data.data.gameRegistrationDetails.paid,
                    },
                  }
                : r
            )
          );
        } else {
          failed.push({
            label,
            message: result.reason?.response?.data?.message || "Failed to update",
          });
        }
      });

      setBulkResult({ status, succeeded: succeeded.length, failed });

      if (failed.length === 0) {
        toast.success(`${succeeded.length} registration(s) marked ${status}`);
      } else if (succeeded.length === 0) {
        toast.error(`Failed to update ${failed.length} registration(s)`);
      } else {
        toast(`${succeeded.length} updated, ${failed.length} failed`, { icon: "⚠️" });
      }

      bulkSelection.clear();
    } finally {
      setBulkUpdating(false);
    }
  };

  // Save the note only if it actually changed since the last saved value --
  // avoids a pointless request every time the field is just clicked into and
  // out of.
  const handleNoteBlur = async (registration) => {
    const draft = noteDrafts[registration._id];
    const saved = registration.gameRegistrationDetails?.adminNote || "";
    if (draft === undefined || draft === saved) return;

    setSavingNoteId(registration._id);
    try {
      const formData = new FormData();
      formData.append("adminNote", draft);

      await api.patch(`/api/tournamentRegister/${registration._id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setRegistrations((prev) =>
        prev.map((r) =>
          r._id === registration._id
            ? {
                ...r,
                gameRegistrationDetails: {
                  ...r.gameRegistrationDetails,
                  adminNote: draft,
                },
              }
            : r
        )
      );
    } catch (err) {
      console.error(err);
      toast.error("Failed to save note");
    } finally {
      setSavingNoteId(null);
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

      {/* Bulk approve/reject -- for a batch of admin-added registrants */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-[var(--border-color)] bg-[var(--card-background)] p-3">
        <span className="text-sm font-medium text-[var(--foreground)]">
          {bulkSelection.size} selected
        </span>
        <button
          type="button"
          onClick={() => bulkSelection.selectAll(currentRows)}
          className="text-xs font-semibold text-[var(--accent-color)] hover:underline"
        >
          Select all on this page
        </button>
        <button
          type="button"
          onClick={bulkSelection.clear}
          className="text-xs font-semibold text-[var(--muted-foreground)] hover:underline"
        >
          Clear selection
        </button>
        <button
          type="button"
          disabled={!bulkSelection.size || bulkUpdating}
          onClick={() => handleBulkStatusUpdate("approved")}
          className="rounded-lg px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
          style={{ background: "var(--success-color)" }}
        >
          {bulkUpdating ? "Working..." : `Approve Selected (${bulkSelection.size})`}
        </button>
        <button
          type="button"
          disabled={!bulkSelection.size || bulkUpdating}
          onClick={() => handleBulkStatusUpdate("rejected")}
          className="rounded-lg border border-[var(--border-color)] px-3 py-1.5 text-sm font-semibold text-[var(--foreground)] disabled:opacity-40"
        >
          Reject Selected ({bulkSelection.size})
        </button>
      </div>

      {bulkResult && (
        <div className="mb-4 rounded-lg border border-[var(--border-color)] bg-[var(--card-background)] p-3 text-sm">
          <p className="font-semibold text-[var(--foreground)]">
            {bulkResult.succeeded} marked {bulkResult.status}
            {bulkResult.failed.length > 0 && `, ${bulkResult.failed.length} failed`}
          </p>
          {bulkResult.failed.length > 0 && (
            <ul className="mt-1 space-y-0.5 text-[var(--muted-foreground)]">
              {bulkResult.failed.map((f, i) => (
                <li key={i}>
                  <strong className="text-[var(--foreground)]">{f.label}</strong>: {f.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="scrollbar-x overflow-x-auto">
        <table
          className="border border-[var(--border-color)] rounded-lg overflow-hidden"
          style={{ tableLayout: "auto", width: "max-content" }}
        >
          <thead className="bg-[var(--secondary-color)] text-[var(--foreground)]">
            <tr>
              <th className="py-2 px-4 text-left sticky left-0 z-20 bg-[var(--secondary-color)] w-14">Sr No.</th>
              <th className="py-2 px-4 text-left sticky left-14 z-20 bg-[var(--secondary-color)]">User</th>
              <th className="py-2 px-4 text-left">Select</th>
              <th className="py-2 px-4 text-left">User Email</th>
              <th className="py-2 px-4 text-left">Tournament</th>
              <th className="py-2 px-4 text-left">Game</th>
              <th className="py-2 px-4 text-left">Entry Fee</th>
              <th className="py-2 px-4 text-left">Current Status</th>
              <th className="py-2 px-4 text-left">Actions</th>
              <th className="py-2 px-4 text-left">Notes</th>
              <th className="py-2 px-4 text-left">Players</th>
              <th className="py-2 px-4 text-left">Paid</th>
              <th className="py-2 px-4 text-left">Payment Method</th>
              <th className="py-2 px-4 text-left">Registered At</th>
              <th className="py-2 px-4 text-left">Bank Name</th>
              <th className="py-2 px-4 text-left">Player Account Name</th>
              <th className="py-2 px-4 text-left">Player Transaction ID</th>
              <th className="py-2 px-4 text-left">Receipt</th>
              <th className="py-2 px-4 text-left">Player Payment Memo</th>
            </tr>
          </thead>
          <tbody className="bg-[var(--card-background)] text-[var(--foreground)]">
            {currentRows.map((r, i) => (
              <tr
                key={r._id}
                className="border-b border-[var(--border-color)] hover:bg-[var(--secondary-hover)]"
              >
                <td className="py-2 px-4 sticky left-0 z-10 bg-[var(--card-background)] w-14">
                  {indexOfFirst + i + 1}
                </td>
                <td
                  className={`py-2 px-4 sticky left-14 z-10 bg-[var(--card-background)] font-semibold ${
                    r.gameRegistrationDetails?.status === "approved"
                      ? "text-[var(--success-color)]"
                      : r.gameRegistrationDetails?.status === "rejected"
                      ? "text-[var(--warning-color)]"
                      : "text-[var(--error-color)]"
                  }`}
                >
                  {r.user?.username}
                </td>
                <td className="py-2 px-4">
                  <input
                    type="checkbox"
                    checked={bulkSelection.isSelected(r)}
                    onChange={() => bulkSelection.toggle(r)}
                    className="h-4 w-4 accent-[var(--accent-color)]"
                  />
                </td>
                <td className="py-2 px-4">{r.user?.email}</td>
                <td className="py-2 px-4">{r.tournament?.name || "-"}</td>
                <td className="py-2 px-4">
                  {r.gameRegistrationDetails?.games
                    ?.map((g) => {
                      const match = r.tournament?.games?.find(
                        (tg) => tg._id === g._id || tg.game === g._id
                      );
                      return match?.eventTitle || g.name;
                    })
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

                <td
                  className={`text-center capitalize ${
                    r.gameRegistrationDetails?.status === "approved"
                      ? "text-[var(--success-color)]"
                      : r.gameRegistrationDetails?.status === "rejected"
                      ? "text-[var(--warning-color)]"
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

                <td className="py-2 px-4">
                  <input
                    type="text"
                    placeholder="Add a reminder note..."
                    value={
                      noteDrafts[r._id] !== undefined
                        ? noteDrafts[r._id]
                        : r.gameRegistrationDetails?.adminNote || ""
                    }
                    onChange={(e) =>
                      setNoteDrafts((prev) => ({ ...prev, [r._id]: e.target.value }))
                    }
                    onBlur={() => handleNoteBlur(r)}
                    disabled={savingNoteId === r._id}
                    className="min-w-[200px] px-2 py-1 rounded-lg border border-[var(--border-color)] bg-[var(--card-background)] text-[var(--foreground)] disabled:opacity-50"
                  />
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

                <td className="py-2 px-4 whitespace-nowrap">
                  {r.createdAt ? new Date(r.createdAt).toLocaleString() : "-"}
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
                  <span
                    className={
                      r.gameRegistrationDetails?.paymentDetails
                        ?.isDuplicateTransactionId
                        ? "rounded px-1.5 py-0.5 bg-[var(--error-color)] text-white"
                        : ""
                    }
                    title={
                      r.gameRegistrationDetails?.paymentDetails
                        ?.isDuplicateTransactionId
                        ? "This transaction ID is used by more than one registration"
                        : undefined
                    }
                  >
                    {r.gameRegistrationDetails?.paymentDetails
                      ?.transactionId || "-"}
                    {r.gameRegistrationDetails?.paymentDetails
                      ?.isDuplicateTransactionId && " ⚠ Duplicate"}
                  </span>
                </td>
                <td className="py-2 px-4">
                  {r.gameRegistrationDetails?.paymentDetails?.receiptUrl ? (
                    <a
                      href={r.gameRegistrationDetails.paymentDetails.receiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <img
                        src={r.gameRegistrationDetails.paymentDetails.receiptUrl}
                        alt="Payment receipt"
                        className="h-12 w-12 object-cover rounded border border-[var(--border-color)]"
                      />
                    </a>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="py-2 px-4 min-w-[200px]">
                  {r.gameRegistrationDetails?.paymentDetails?.note || "-"}
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
