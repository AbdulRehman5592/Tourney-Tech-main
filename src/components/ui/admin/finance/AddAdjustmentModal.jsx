"use client";

import { useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { X } from "lucide-react";
import api from "@/utils/axios";
import SearchableSelect from "@/components/ui/admin/team/Select";

// Create or edit a manual Finance adjustment -- a free-form accounting
// correction (cash adjustment, fee waiver, etc.) not tied to a game move.
// `rows` are the finance rows already loaded by FinanceView, used to build
// the player/game pickers without a separate lookup API. `editing` is an
// existing adjustment-type row to edit, or null to create a new one.
export default function AddAdjustmentModal({ rows, editing, onClose, onDone }) {
  const isEdit = !!editing;

  // Distinct players (registrations) to pick from -- one option per
  // registrationId, labeled with player + tournament so the same name across
  // different tournaments is still distinguishable.
  const playerOptions = useMemo(() => {
    const seen = new Map();
    for (const r of rows) {
      if (r.type === "adjustment") continue;
      const key = String(r.registrationId);
      if (!seen.has(key)) {
        seen.set(key, {
          value: key,
          label: `${r.player} — ${r.tournament}`,
          registrationId: r.registrationId,
        });
      }
    }
    return [...seen.values()];
  }, [rows]);

  const [registrationOption, setRegistrationOption] = useState(
    isEdit
      ? playerOptions.find((p) => p.value === String(editing.registrationId)) || null
      : null
  );

  // Games that registration is in, derived from the same rows -- reason this
  // works without a separate fetch: every active game entry has already
  // produced a payment/pending/refund row above.
  const gameOptions = useMemo(() => {
    if (!registrationOption) return [];
    const seen = new Map();
    for (const r of rows) {
      if (String(r.registrationId) !== registrationOption.value) continue;
      if (!r.gameConfigId) continue;
      const key = String(r.gameConfigId);
      if (!seen.has(key)) {
        seen.set(key, { value: key, label: r.game });
      }
    }
    return [...seen.values()];
  }, [rows, registrationOption]);

  const [gameOption, setGameOption] = useState(
    isEdit && editing.gameConfigIdLabel
      ? { value: "", label: editing.gameConfigIdLabel }
      : null
  );
  const [amount, setAmount] = useState(isEdit ? String(editing.amount) : "");
  const [reason, setReason] = useState(isEdit ? editing.reason || "" : "");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount === 0) {
      toast.error("Enter a non-zero amount");
      return;
    }
    if (!reason.trim()) {
      toast.error("A reason is required");
      return;
    }
    if (!isEdit && !registrationOption) {
      toast.error("Select a player");
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit) {
        await api.patch(
          `/api/tournamentRegister/${editing.registrationId}/financial-adjustments/${editing.adjustmentId}`,
          { amount: numericAmount, reason: reason.trim() }
        );
        toast.success("Adjustment updated");
      } else {
        await api.post(
          `/api/tournamentRegister/${registrationOption.registrationId}/financial-adjustments`,
          {
            amount: numericAmount,
            reason: reason.trim(),
            gameConfigId: gameOption?.value || undefined,
          }
        );
        toast.success("Adjustment recorded");
      }
      onDone();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save adjustment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-[480px] max-w-full rounded-2xl border border-[var(--border-color)] bg-[var(--card-background)]">
        <div className="flex items-center justify-between border-b border-[var(--border-color)] px-6 py-4">
          <h2 className="text-base font-bold text-foreground">
            {isEdit ? "Edit Adjustment" : "Add Manual Adjustment"}
          </h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {isEdit ? (
            <p className="text-sm text-foreground">{editing.player}</p>
          ) : (
            <SearchableSelect
              label="Player"
              options={playerOptions}
              value={registrationOption}
              onChange={(opt) => {
                setRegistrationOption(opt);
                setGameOption(null);
              }}
              placeholder="Search by player name..."
            />
          )}

          {!isEdit && (
            <SearchableSelect
              label="Game (optional)"
              options={gameOptions}
              value={gameOption}
              onChange={setGameOption}
              placeholder={
                registrationOption ? "Search this player's games..." : "Select a player first"
              }
            />
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Amount (use a negative number for money owed back)
            </label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. -25 or 10"
              className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Reason</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Waived $25 late fee -- player's flight was delayed."
              rows={3}
              className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-muted-foreground"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[var(--border-color)] px-4 py-2 text-sm font-medium text-[var(--foreground)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-[var(--accent-color)] px-4 py-2 text-sm font-semibold text-black disabled:opacity-40"
            >
              {submitting ? "Saving..." : isEdit ? "Save Changes" : "Add Adjustment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
