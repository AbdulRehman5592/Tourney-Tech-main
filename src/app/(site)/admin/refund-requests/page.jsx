"use client";

import { useEffect, useState, useMemo } from "react";
import { toast } from "react-hot-toast";
import api from "@/utils/axios";

const REFUND_BADGE = {
  requested: { label: "Refund Requested", color: "var(--warning-color)" },
  processed: { label: "Refund Processed", color: "var(--success-color)" },
  denied: { label: "Refund Denied", color: "var(--error-color)" },
  not_applicable: { label: "No Refund Owed", color: "var(--border-color)" },
};

export default function RefundRequestsPage() {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingKey, setUpdatingKey] = useState(null);

  const fetchCancelled = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/api/tournamentRegister/cancelled");
      setRegistrations(data?.data || []);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load cancelled registrations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCancelled();
  }, []);

  // Flatten to one row per dropped game entry -- a registration can appear
  // more than once if the player dropped several games, and can appear
  // alongside their still-active games (those just don't get a row here).
  const droppedRows = useMemo(() => {
    return registrations.flatMap((reg) =>
      (reg.gameEntries || [])
        .filter((e) => e.cancelled || e.removed)
        .map((entry) => ({ registration: reg, entry }))
    );
  }, [registrations]);

  const handleResolve = async (registration, entry, refundStatus) => {
    const note =
      refundStatus === "processed"
        ? prompt("Optional note (e.g. how the refund was sent):") || undefined
        : prompt("Optional reason for denying this refund:") || undefined;

    const key = entry._id;
    setUpdatingKey(key);
    try {
      await api.patch(
        `/api/tournamentRegister/${registration._id}/game-entries/${entry._id}/refund`,
        { refundStatus, refundNote: note }
      );
      toast.success(`Refund marked as ${refundStatus}`);
      fetchCancelled();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update refund");
    } finally {
      setUpdatingKey(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Cancellations &amp; Refund Requests</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Every player-cancelled or admin-removed game, most recent first. Only ones that were
          already paid show a refund request to act on.
        </p>
      </div>

      {loading ? (
        <p className="text-[var(--muted-foreground)]">Loading...</p>
      ) : droppedRows.length === 0 ? (
        <p className="text-[var(--muted-foreground)]">No dropped games yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[var(--border-color)]">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-[var(--secondary-color)]">
                <th className="px-4 py-3 text-left font-semibold border-b border-[var(--border-color)]">Player</th>
                <th className="px-4 py-3 text-left font-semibold border-b border-[var(--border-color)]">Tournament</th>
                <th className="px-4 py-3 text-left font-semibold border-b border-[var(--border-color)]">Game</th>
                <th className="px-4 py-3 text-left font-semibold border-b border-[var(--border-color)]">Dropped</th>
                <th className="px-4 py-3 text-left font-semibold border-b border-[var(--border-color)]">Refund Status</th>
                <th className="px-4 py-3 text-center font-semibold border-b border-[var(--border-color)]">Actions</th>
              </tr>
            </thead>
            <tbody style={{ backgroundColor: "var(--card-background)" }}>
              {droppedRows.map(({ registration: reg, entry }) => {
                const badge = REFUND_BADGE[entry.refundStatus] || REFUND_BADGE.not_applicable;
                const droppedAt = entry.cancelledAt || entry.removedAt;
                return (
                  <tr key={entry._id} className="border-b border-[var(--border-color)]">
                    <td className="px-4 py-2.5">
                      {reg.user
                        ? `${reg.user.firstname || ""} ${reg.user.lastname || ""}`.trim() ||
                          reg.user.username
                        : "Unknown"}
                      <div className="text-xs text-[var(--muted-foreground)]">{reg.user?.email}</div>
                    </td>
                    <td className="px-4 py-2.5">{reg.tournament?.name || "Unknown"}</td>
                    <td className="px-4 py-2.5">
                      {entry.game?.name || "—"}
                      {entry.removed && (
                        <div className="text-xs text-[var(--muted-foreground)]">Removed by admin</div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {droppedAt ? new Date(droppedAt).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className="text-xs px-2 py-1 rounded-full font-medium"
                        style={{
                          backgroundColor: `color-mix(in srgb, ${badge.color} 18%, transparent)`,
                          color: badge.color,
                        }}
                      >
                        {badge.label}
                      </span>
                      {entry.refundNote && (
                        <div className="text-xs text-[var(--muted-foreground)] mt-1">{entry.refundNote}</div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {entry.refundStatus === "requested" ? (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleResolve(reg, entry, "processed")}
                            disabled={updatingKey === entry._id}
                            className="px-3 py-1 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
                            style={{ backgroundColor: "var(--success-color)" }}
                          >
                            Mark Processed
                          </button>
                          <button
                            onClick={() => handleResolve(reg, entry, "denied")}
                            disabled={updatingKey === entry._id}
                            className="px-3 py-1 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
                            style={{ backgroundColor: "var(--error-color)" }}
                          >
                            Deny
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-[var(--muted-foreground)]">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
