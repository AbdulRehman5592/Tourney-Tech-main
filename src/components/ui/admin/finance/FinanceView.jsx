"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import api from "@/utils/axios";
import { Banknote, Pencil, Plus, Search, Trash2 } from "lucide-react";
import AddAdjustmentModal from "./AddAdjustmentModal";

const TYPE_STYLE = {
  payment: { label: "Payment", bg: "color-mix(in srgb, var(--info-color) 14%, transparent)", color: "var(--info-color)" },
  pending: { label: "Pending", bg: "color-mix(in srgb, var(--accent-color) 14%, transparent)", color: "var(--accent-color)" },
  refund: { label: "Refund", bg: "color-mix(in srgb, var(--error-color) 14%, transparent)", color: "var(--error-color)" },
  adjustment: { label: "Adjustment", bg: "color-mix(in srgb, var(--accent-color) 14%, transparent)", color: "var(--accent-color)" },
};

const STATUS_STYLE = {
  paid: { bg: "color-mix(in srgb, var(--success-color) 14%, transparent)", color: "var(--success-color)" },
  pending: { bg: "color-mix(in srgb, var(--accent-color) 14%, transparent)", color: "var(--accent-color)" },
  requested: { bg: "color-mix(in srgb, var(--accent-color) 14%, transparent)", color: "var(--accent-color)" },
  processed: { bg: "color-mix(in srgb, var(--success-color) 14%, transparent)", color: "var(--success-color)" },
  denied: { bg: "color-mix(in srgb, var(--muted-foreground) 14%, transparent)", color: "var(--muted-foreground)" },
  not_applicable: { bg: "color-mix(in srgb, var(--muted-foreground) 14%, transparent)", color: "var(--muted-foreground)" },
  recorded: { bg: "color-mix(in srgb, var(--muted-foreground) 14%, transparent)", color: "var(--muted-foreground)" },
};

function StatCard({ label, value, color }) {
  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--card-background)] p-5">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold" style={{ color }}>
        {value}
      </p>
    </div>
  );
}

// Shared table+stat-cards view behind both the global Finance page
// (/admin/finance, no tournamentId -- cross-tournament, own tournament
// filter dropdown) and the tournament-scoped Finance tab
// (/admin/tournaments/[tournamentId]/finance -- pins tournamentId, hides
// the now-redundant tournament column/filter/page header).
export default function FinanceView({ tournamentId }) {
  const [summary, setSummary] = useState({ collected: 0, pending: 0, refunded: 0, adjustments: 0 });
  const [rows, setRows] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [tournamentFilter, setTournamentFilter] = useState("all");
  const [resolvingId, setResolvingId] = useState(null);
  const [adjustmentModal, setAdjustmentModal] = useState(null); // { editing } | null
  const [deletingId, setDeletingId] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      const effectiveTournament = tournamentId || (tournamentFilter !== "all" ? tournamentFilter : "");
      if (effectiveTournament) params.set("tournamentId", effectiveTournament);
      const [financeRes, tournamentRes] = await Promise.all([
        api.get(`/api/finance?${params.toString()}`),
        tournamentId ? Promise.resolve(null) : api.get("/api/tournaments?includeDrafts=true"),
      ]);
      setSummary(financeRes.data?.data?.summary || { collected: 0, pending: 0, refunded: 0, adjustments: 0 });
      setRows(financeRes.data?.data?.rows || []);
      if (tournamentRes) setTournaments(tournamentRes.data?.data || []);
    } catch (error) {
      console.error("Failed to load finance data:", error);
      toast.error("Failed to load finance data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId, tournamentFilter]);

  const filteredRows = useMemo(() => {
    let result = rows;
    if (typeFilter !== "all") result = result.filter((r) => r.type === typeFilter);
    if (search.trim()) {
      const term = search.toLowerCase();
      result = result.filter(
        (r) => r.player.toLowerCase().includes(term) || r.tournament.toLowerCase().includes(term)
      );
    }
    return result;
  }, [rows, typeFilter, search]);

  const handleResolveRefund = async (row, refundStatus) => {
    const refundNote = window.prompt(`Note for marking this refund "${refundStatus}"? (optional)`) || "";
    setResolvingId(row.id);
    try {
      await api.patch(
        `/api/tournamentRegister/${row.registrationId}/game-entries/${row.entryId}/refund`,
        { refundStatus, refundNote }
      );
      toast.success(`Refund marked as ${refundStatus}`);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update refund");
    } finally {
      setResolvingId(null);
    }
  };

  const handleDeleteAdjustment = async (row) => {
    if (!window.confirm("Delete this adjustment? This can't be undone.")) return;
    setDeletingId(row.id);
    try {
      await api.delete(
        `/api/tournamentRegister/${row.registrationId}/financial-adjustments/${row.adjustmentId}`
      );
      toast.success("Adjustment deleted");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete adjustment");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {!tournamentId && (
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-[var(--secondary-color)] p-3 text-[var(--accent-color)] shadow-sm">
            <Banknote className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Admin reports</p>
            <h1 className="text-3xl font-semibold text-foreground">Finance</h1>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Collected" value={`$${summary.collected.toLocaleString()}`} color="var(--success-color)" />
        <StatCard label="Pending" value={`$${summary.pending.toLocaleString()}`} color="var(--accent-color)" />
        <StatCard label="Refunded" value={`$${summary.refunded.toLocaleString()}`} color="var(--error-color)" />
        <StatCard
          label="Net Adjustments"
          value={`${summary.adjustments >= 0 ? "+" : "-"}$${Math.abs(summary.adjustments).toLocaleString()}`}
          color="var(--info-color)"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-2xl border border-[var(--border-color)] bg-[var(--card-background)] px-4 py-2.5 w-64">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search player or tournament"
            className="w-full bg-transparent text-sm text-[var(--foreground)] outline-none placeholder:text-muted-foreground"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-2xl border border-[var(--border-color)] bg-[var(--card-background)] px-4 py-2.5 text-sm text-[var(--foreground)]"
        >
          <option value="all">All types</option>
          <option value="payment">Payments</option>
          <option value="pending">Pending</option>
          <option value="refund">Refunds</option>
          <option value="adjustment">Adjustments</option>
        </select>
        {!tournamentId && (
          <select
            value={tournamentFilter}
            onChange={(e) => setTournamentFilter(e.target.value)}
            className="rounded-2xl border border-[var(--border-color)] bg-[var(--card-background)] px-4 py-2.5 text-sm text-[var(--foreground)]"
          >
            <option value="all">All tournaments</option>
            {tournaments.map((t) => (
              <option key={t._id} value={t._id}>
                {t.name}
              </option>
            ))}
          </select>
        )}
        <button
          type="button"
          onClick={() => setAdjustmentModal({ editing: null })}
          className="ml-auto flex items-center gap-1.5 rounded-2xl bg-[var(--accent-color)] px-4 py-2.5 text-sm font-semibold text-black"
        >
          <Plus className="h-4 w-4" />
          Add Adjustment
        </button>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--card-background)] p-8 text-center text-muted-foreground">
          Loading finance data...
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-[var(--border-color)]">
          <table className="min-w-full text-sm">
            <thead className="bg-[var(--secondary-color)] text-[var(--foreground)]">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Date</th>
                <th className="px-4 py-2 text-left font-medium">Player</th>
                {!tournamentId && <th className="px-4 py-2 text-left font-medium">Tournament</th>}
                <th className="px-4 py-2 text-left font-medium">Game</th>
                <th className="px-4 py-2 text-left font-medium">Type</th>
                <th className="px-4 py-2 text-left font-medium">Method</th>
                <th className="px-4 py-2 text-left font-medium">Amount</th>
                <th className="px-4 py-2 text-left font-medium">Status</th>
                <th className="px-4 py-2 text-left font-medium"></th>
              </tr>
            </thead>
            <tbody className="bg-[var(--background)] text-[var(--foreground)]">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={tournamentId ? 8 : 9} className="px-4 py-8 text-center text-muted-foreground">
                    No financial records found.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const typeStyle = TYPE_STYLE[row.type];
                  const statusStyle = STATUS_STYLE[row.status] || STATUS_STYLE.recorded;
                  const amountColor =
                    row.amount > 0
                      ? "var(--success-color)"
                      : row.amount < 0
                      ? "var(--error-color)"
                      : "var(--foreground)";

                  return (
                    <tr key={row.id} className="border-t border-[var(--border-color)]">
                      <td className="px-4 py-2 whitespace-nowrap text-xs text-muted-foreground">
                        {row.date ? new Date(row.date).toLocaleDateString() : "-"}
                      </td>
                      <td className="px-4 py-2">{row.player}</td>
                      {!tournamentId && <td className="px-4 py-2">{row.tournament}</td>}
                      <td className="px-4 py-2">{row.game}</td>
                      <td className="px-4 py-2">
                        <span
                          className="whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold"
                          style={{ background: typeStyle.bg, color: typeStyle.color }}
                        >
                          {typeStyle.label}
                        </span>
                      </td>
                      <td className="px-4 py-2 capitalize">{row.method || "-"}</td>
                      <td className="px-4 py-2 font-semibold" style={{ color: amountColor }}>
                        {row.amount < 0 ? "-" : row.amount > 0 ? "+" : ""}$
                        {Math.abs(row.amount).toLocaleString()}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className="whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold capitalize"
                          style={{ background: statusStyle.bg, color: statusStyle.color }}
                        >
                          {row.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        {row.type === "refund" && row.status === "requested" && (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={resolvingId === row.id}
                              onClick={() => handleResolveRefund(row, "processed")}
                              className="rounded-lg px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-40"
                              style={{ background: "var(--success-color)" }}
                            >
                              Mark Processed
                            </button>
                            <button
                              type="button"
                              disabled={resolvingId === row.id}
                              onClick={() => handleResolveRefund(row, "denied")}
                              className="rounded-lg border border-[var(--border-color)] px-2.5 py-1 text-xs font-semibold text-foreground disabled:opacity-40"
                            >
                              Deny
                            </button>
                          </div>
                        )}
                        {row.type === "adjustment" && row.adjustmentType === "manual" && (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setAdjustmentModal({ editing: row })}
                              className="text-muted-foreground transition hover:text-[var(--accent-color)]"
                              aria-label="Edit adjustment"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              disabled={deletingId === row.id}
                              onClick={() => handleDeleteAdjustment(row)}
                              className="text-muted-foreground transition hover:text-red-500 disabled:opacity-40"
                              aria-label="Delete adjustment"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {adjustmentModal && (
        <AddAdjustmentModal
          rows={rows}
          editing={adjustmentModal.editing}
          onClose={() => setAdjustmentModal(null)}
          onDone={fetchData}
        />
      )}
    </div>
  );
}
