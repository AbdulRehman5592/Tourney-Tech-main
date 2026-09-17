"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import api from "@/utils/axios";
import { Search, MoreVertical, ChevronDown, ChevronRight } from "lucide-react";
import { useBulkSelection } from "@/hooks/useBulkSelection";
import { formatGameConfigLabel } from "@/utils/gameConfigLabel";
import MoveGameModal from "@/components/ui/admin/tournament/MoveGameModal";
import { useWorkspaceTournament } from "../layout";

const STATUS_STYLE = {
  approved: { bg: "color-mix(in srgb, var(--success-color) 14%, transparent)", color: "var(--success-color)" },
  pending: { bg: "color-mix(in srgb, var(--accent-color) 14%, transparent)", color: "var(--accent-color)" },
  rejected: { bg: "color-mix(in srgb, var(--error-color) 14%, transparent)", color: "var(--error-color)" },
};

const BULK_CONCURRENCY = 5;

const entryKey = (registrationId, entryId) => `${registrationId}:${entryId}`;

export default function TournamentPlayersTab() {
  const { tournament, tournamentId } = useWorkspaceTournament();
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(new Set());
  const [openMenuKey, setOpenMenuKey] = useState(null);
  const [gameAction, setGameAction] = useState(null); // { registration, entry, mode }
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);

  const bulkSelection = useBulkSelection((row) => entryKey(row.registrationId, row.entryId));

  const fetchAll = async () => {
    try {
      const registrationRes = await api.get("/api/tournamentRegister");
      const regs = (registrationRes.data?.data || []).filter(
        (r) => (r.tournament?._id || r.tournament) === tournamentId
      );
      setRegistrations(regs);
      // Default-expand players who still have a game awaiting a decision.
      setExpanded(
        new Set(
          regs
            .filter((r) => (r.gameEntries || []).some((e) => !e.removed && !e.cancelled && e.status === "pending"))
            .map((r) => r._id)
        )
      );
    } catch (error) {
      console.error("Failed to load registrations:", error);
      toast.error("Failed to load players");
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchAll().finally(() => setLoading(false));
  }, [tournamentId]);

  const games = tournament.games || [];
  const gameConfigOf = (gameConfigId) => games.find((g) => String(g._id) === String(gameConfigId));

  const activeEntriesOf = (registration) =>
    (registration.gameEntries || []).filter((e) => !e.removed && !e.cancelled);

  const filteredRegistrations = useMemo(() => {
    const term = search.toLowerCase().trim();
    const withActiveEntries = registrations.filter((r) => activeEntriesOf(r).length > 0);
    if (!term) return withActiveEntries;
    return withActiveEntries.filter((r) => {
      const name = r.user?.username || `${r.user?.firstname || ""} ${r.user?.lastname || ""}`;
      return name.toLowerCase().includes(term) || r.user?.email?.toLowerCase().includes(term);
    });
  }, [registrations, search]);

  // Every (registration, entry) pair currently visible -- what bulk
  // select-all/approve/reject operate over.
  const visibleRows = useMemo(
    () =>
      filteredRegistrations.flatMap((registration) =>
        activeEntriesOf(registration).map((entry) => ({
          registrationId: registration._id,
          entryId: entry._id,
        }))
      ),
    [filteredRegistrations]
  );

  const toggleExpanded = (registrationId) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(registrationId)) next.delete(registrationId);
      else next.add(registrationId);
      return next;
    });
  };

  const patchEntryStatus = async (registrationId, entryId, status) => {
    const formData = new FormData();
    formData.append("status", status);
    const res = await api.patch(
      `/api/tournamentRegister/${registrationId}/game-entries/${entryId}`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    const updated = res.data?.data;
    if (!updated) throw new Error(res.data?.message || "Unexpected response from server");
    return updated;
  };

  const applyUpdatedRegistration = (updated) => {
    setRegistrations((prev) => prev.map((r) => (r._id === updated._id ? updated : r)));
  };

  const handleStatusUpdate = async (registrationId, entryId, status) => {
    try {
      const updated = await patchEntryStatus(registrationId, entryId, status);
      applyUpdatedRegistration(updated);
      toast.success(`Game ${status}`);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to update status");
    }
  };

  const runBulkUpdate = async (rows, status) => {
    setBulkUpdating(true);
    try {
      const succeeded = [];
      const failed = [];
      for (let i = 0; i < rows.length; i += BULK_CONCURRENCY) {
        const batch = rows.slice(i, i + BULK_CONCURRENCY);
        const results = await Promise.allSettled(
          batch.map((row) => patchEntryStatus(row.registrationId, row.entryId, status))
        );
        results.forEach((result, j) => {
          const row = batch[j];
          const registration = registrations.find((r) => r._id === row.registrationId);
          const label = registration?.user?.username || registration?.user?.email || row.registrationId;
          if (result.status === "fulfilled") {
            succeeded.push(row);
            applyUpdatedRegistration(result.value);
          } else {
            failed.push({
              ...row,
              label,
              message: result.reason?.response?.data?.message || result.reason?.message || "Failed to update",
            });
          }
        });
      }
      setBulkResult({ status, succeeded: succeeded.length, failed });
      if (failed.length === 0) toast.success(`${succeeded.length} game(s) marked ${status}`);
      else if (succeeded.length === 0) toast.error(`Failed to update ${failed.length} game(s)`);
      else toast(`${succeeded.length} updated, ${failed.length} failed`, { icon: "⚠️" });
    } finally {
      setBulkUpdating(false);
    }
  };

  const handleBulkStatusUpdate = async (status) => {
    const keys = bulkSelection.selected;
    const rows = visibleRows.filter((row) => keys.has(entryKey(row.registrationId, row.entryId)));
    if (!rows.length) {
      toast.error("Select at least one game");
      return;
    }
    await runBulkUpdate(rows, status);
    bulkSelection.clear();
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--card-background)] p-8 text-center text-muted-foreground">
        Loading players...
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-2xl border border-[var(--border-color)] bg-[var(--card-background)] px-4 py-2.5 w-72">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search players or email"
            className="w-full bg-transparent text-sm text-[var(--foreground)] outline-none placeholder:text-muted-foreground"
          />
        </div>
        <p className="text-sm text-muted-foreground">{filteredRegistrations.length} players</p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--card-background)] p-3">
        <span className="text-sm font-medium text-foreground">{bulkSelection.size} game(s) selected</span>
        <button
          type="button"
          onClick={() => bulkSelection.selectAll(visibleRows)}
          className="text-xs font-semibold text-[var(--accent-color)] hover:underline"
        >
          Select all
        </button>
        <button
          type="button"
          onClick={bulkSelection.clear}
          className="text-xs font-semibold text-muted-foreground hover:underline"
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

      {bulkResult && bulkResult.failed.length > 0 && (
        <div className="mb-4 rounded-lg border border-[var(--border-color)] bg-[var(--card-background)] p-3 text-sm">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-foreground">
              {bulkResult.succeeded} marked {bulkResult.status}, {bulkResult.failed.length} failed
            </p>
            <button
              type="button"
              disabled={bulkUpdating}
              onClick={() => runBulkUpdate(bulkResult.failed, bulkResult.status)}
              className="rounded-lg border border-[var(--border-color)] px-3 py-1 text-xs font-semibold text-foreground disabled:opacity-40"
            >
              Retry {bulkResult.failed.length} Failed
            </button>
          </div>
          <ul className="mt-1 space-y-0.5 text-muted-foreground">
            {bulkResult.failed.map((f, i) => (
              <li key={i}>
                <strong className="text-foreground">{f.label}</strong>: {f.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="overflow-x-auto rounded-3xl border border-[var(--border-color)]">
        <table className="min-w-full text-sm">
          <thead className="bg-[var(--secondary-color)] text-[var(--foreground)]">
            <tr>
              <th className="px-4 py-2 text-left font-medium"></th>
              <th className="px-4 py-2 text-left font-medium">Player</th>
              <th className="px-4 py-2 text-left font-medium">Games</th>
              <th className="px-4 py-2 text-left font-medium"></th>
            </tr>
          </thead>
          <tbody className="bg-[var(--background)] text-[var(--foreground)]">
            {filteredRegistrations.map((registration) => {
              const entries = activeEntriesOf(registration);
              const isOpen = expanded.has(registration._id);

              return (
                <Fragment key={registration._id}>
                  <tr
                    className="cursor-pointer border-t border-[var(--border-color)] hover:bg-[var(--secondary-color)]"
                    onClick={() => toggleExpanded(registration._id)}
                  >
                    <td className="px-4 py-3">
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">
                        {registration.user?.username ||
                          `${registration.user?.firstname || ""} ${registration.user?.lastname || ""}`.trim() ||
                          "-"}
                      </p>
                      <p className="text-xs text-muted-foreground">{registration.user?.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {entries.map((entry) => {
                          const gameConfig = gameConfigOf(entry.gameConfigId);
                          const statusStyle = STATUS_STYLE[entry.status] || STATUS_STYLE.pending;
                          return (
                            <span
                              key={entry._id}
                              className="whitespace-nowrap rounded-full px-2.5 py-1 text-xs"
                              style={{ background: statusStyle.bg, color: statusStyle.color }}
                            >
                              {gameConfig ? formatGameConfigLabel(gameConfig) : "Unknown game"}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {entries.length} game{entries.length === 1 ? "" : "s"}
                    </td>
                  </tr>

                  {isOpen &&
                    entries.map((entry) => {
                      const gameConfig = gameConfigOf(entry.gameConfigId);
                      const statusStyle = STATUS_STYLE[entry.status] || STATUS_STYLE.pending;
                      const key = entryKey(registration._id, entry._id);
                      const menuKey = key;

                      return (
                        <tr key={key} className="border-t border-[var(--border-color)] bg-[var(--card-background)]/40 align-top">
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={bulkSelection.isSelected({ registrationId: registration._id, entryId: entry._id })}
                              onChange={() =>
                                bulkSelection.toggle({ registrationId: registration._id, entryId: entry._id })
                              }
                              className="h-4 w-4 accent-[var(--accent-color)]"
                            />
                          </td>
                          <td className="px-4 py-3 text-xs text-foreground">
                            {gameConfig ? formatGameConfigLabel(gameConfig) : "Unknown game"}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className="whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold"
                                style={{
                                  background: entry.paid
                                    ? "color-mix(in srgb, var(--success-color) 14%, transparent)"
                                    : "color-mix(in srgb, var(--error-color) 14%, transparent)",
                                  color: entry.paid ? "var(--success-color)" : "var(--error-color)",
                                }}
                              >
                                {entry.paid ? "Paid" : "Unpaid"} ${gameConfig?.entryFee ?? 0}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {entry.team ? entry.team.name : "Not teamed up yet"}
                              </span>
                              <select
                                value={entry.status}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => handleStatusUpdate(registration._id, entry._id, e.target.value)}
                                className="rounded-full px-2.5 py-1 text-xs font-semibold"
                                style={{ background: statusStyle.bg, color: statusStyle.color, border: "none" }}
                              >
                                <option value="pending">Pending</option>
                                <option value="approved">Approved</option>
                                <option value="rejected">Rejected</option>
                              </select>
                            </div>
                          </td>
                          <td className="relative px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => setOpenMenuKey(openMenuKey === menuKey ? null : menuKey)}
                              className="rounded-lg p-1.5 text-muted-foreground hover:bg-[var(--secondary-color)] hover:text-foreground"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>
                            {openMenuKey === menuKey && (
                              <div className="absolute right-4 top-10 z-20 w-56 rounded-xl border border-[var(--border-color)] bg-[var(--secondary-color)] p-1.5 shadow-lg">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setGameAction({ registration, entry, mode: "move" });
                                    setOpenMenuKey(null);
                                  }}
                                  className="block w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-[var(--accent-color)] hover:bg-[color-mix(in_srgb,var(--accent-color)_12%,transparent)]"
                                >
                                  Move to Different Game
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setGameAction({ registration, entry, mode: "remove" });
                                    setOpenMenuKey(null);
                                  }}
                                  className="block w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-[var(--error-color)] hover:bg-[color-mix(in_srgb,var(--error-color)_12%,transparent)]"
                                >
                                  Remove This Game
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {gameAction && (
        <MoveGameModal
          registration={gameAction.registration}
          entry={gameAction.entry}
          mode={gameAction.mode}
          tournament={tournament}
          onClose={() => setGameAction(null)}
          onDone={fetchAll}
        />
      )}
    </div>
  );
}
