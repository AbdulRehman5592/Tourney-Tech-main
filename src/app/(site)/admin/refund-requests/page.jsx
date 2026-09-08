"use client";

import { useEffect, useState } from "react";
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
  const [updatingId, setUpdatingId] = useState(null);

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

  const handleResolve = async (registration, refundStatus) => {
    const note =
      refundStatus === "processed"
        ? prompt("Optional note (e.g. how the refund was sent):") || undefined
        : prompt("Optional reason for denying this refund:") || undefined;

    setUpdatingId(registration._id);
    try {
      await api.patch(`/api/tournamentRegister/${registration._id}/refund`, {
        refundStatus,
        refundNote: note,
      });
      toast.success(`Refund marked as ${refundStatus}`);
      fetchCancelled();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update refund");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Cancellations &amp; Refund Requests</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Every player-cancelled registration, most recent first. Only ones that were
          already paid show a refund request to act on.
        </p>
      </div>

      {loading ? (
        <p className="text-[var(--muted-foreground)]">Loading...</p>
      ) : registrations.length === 0 ? (
        <p className="text-[var(--muted-foreground)]">No cancelled registrations yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[var(--border-color)]">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-[var(--secondary-color)]">
                <th className="px-4 py-3 text-left font-semibold border-b border-[var(--border-color)]">Player</th>
                <th className="px-4 py-3 text-left font-semibold border-b border-[var(--border-color)]">Tournament</th>
                <th className="px-4 py-3 text-left font-semibold border-b border-[var(--border-color)]">Games</th>
                <th className="px-4 py-3 text-left font-semibold border-b border-[var(--border-color)]">Cancelled</th>
                <th className="px-4 py-3 text-left font-semibold border-b border-[var(--border-color)]">Refund Status</th>
                <th className="px-4 py-3 text-center font-semibold border-b border-[var(--border-color)]">Actions</th>
              </tr>
            </thead>
            <tbody style={{ backgroundColor: "var(--card-background)" }}>
              {registrations.map((reg) => {
                const badge = REFUND_BADGE[reg.refundStatus] || REFUND_BADGE.not_applicable;
                const gameNames = (reg.gameRegistrationDetails?.games || [])
                  .map((g) => g?.name)
                  .filter(Boolean)
                  .join(", ");
                return (
                  <tr key={reg._id} className="border-b border-[var(--border-color)]">
                    <td className="px-4 py-2.5">
                      {reg.user
                        ? `${reg.user.firstname || ""} ${reg.user.lastname || ""}`.trim() ||
                          reg.user.username
                        : "Unknown"}
                      <div className="text-xs text-[var(--muted-foreground)]">{reg.user?.email}</div>
                    </td>
                    <td className="px-4 py-2.5">{reg.tournament?.name || "Unknown"}</td>
                    <td className="px-4 py-2.5">{gameNames || "—"}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {reg.cancelledAt ? new Date(reg.cancelledAt).toLocaleString() : "—"}
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
                      {reg.refundNote && (
                        <div className="text-xs text-[var(--muted-foreground)] mt-1">{reg.refundNote}</div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {reg.refundStatus === "requested" ? (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleResolve(reg, "processed")}
                            disabled={updatingId === reg._id}
                            className="px-3 py-1 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
                            style={{ backgroundColor: "var(--success-color)" }}
                          >
                            Mark Processed
                          </button>
                          <button
                            onClick={() => handleResolve(reg, "denied")}
                            disabled={updatingId === reg._id}
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
