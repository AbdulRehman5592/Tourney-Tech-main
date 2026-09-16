"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";
import { AlertTriangle, X } from "lucide-react";
import api from "@/utils/axios";
import { formatGameConfigLabel } from "@/utils/gameConfigLabel";

// Admin/organizer action: move a registered player from one scheduled game
// to another. `registration` is the row being acted on; `tournament` is the
// already-loaded workspace tournament (has `.games[]` with entryFee/
// eventTitle/round1Status). Mirrors EditTeamForm's modal pattern: parent
// owns open/closed state, this renders unconditionally when mounted.
export default function MoveGameModal({ registration, tournament, onClose, onMoved }) {
  const currentGameConfigIds = (registration.gameRegistrationDetails?.gameConfigIds || []).map(String);
  const currentGames = (tournament.games || []).filter((g) => currentGameConfigIds.includes(String(g._id)));

  const [fromGameConfigId, setFromGameConfigId] = useState(currentGames[0]?._id || "");
  const [toGameConfigId, setToGameConfigId] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [blockedMessage, setBlockedMessage] = useState(null);

  const destinationOptions = (tournament.games || []).filter(
    (g) => !currentGameConfigIds.includes(String(g._id))
  );

  const fromGame = (tournament.games || []).find((g) => g._id === fromGameConfigId);
  const toGame = (tournament.games || []).find((g) => g._id === toGameConfigId);
  const feeDelta = fromGame && toGame ? (toGame.entryFee || 0) - (fromGame.entryFee || 0) : null;

  const playerName =
    registration.user?.username ||
    `${registration.user?.firstname || ""} ${registration.user?.lastname || ""}`.trim() ||
    registration.user?.email ||
    "This player";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fromGameConfigId || !toGameConfigId) {
      toast.error("Choose both the current and destination game");
      return;
    }

    setBlockedMessage(null);
    setSubmitting(true);
    try {
      const res = await api.patch(`/api/tournamentRegister/${registration._id}/move-game`, {
        fromGameConfigId,
        toGameConfigId,
        reason,
      });
      toast.success(res.data?.message || "Player moved");
      onMoved();
      onClose();
    } catch (err) {
      const message = err.response?.data?.message || "Failed to move player";
      // 409 = the two safety checks (source already played / destination
      // bracket already generated) -- surface those as an inline blocked
      // banner, not just a toast, so the admin understands why before
      // trying a different game.
      if (err.response?.status === 409) {
        setBlockedMessage(message);
      } else {
        toast.error(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-[520px] max-w-full rounded-2xl border border-[var(--border-color)] bg-[var(--card-background)]">
        <div className="flex items-center justify-between border-b border-[var(--border-color)] px-6 py-4">
          <h2 className="text-base font-bold text-foreground">Move Player to a Different Game</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <p className="text-sm text-foreground">{playerName}</p>

          {blockedMessage && (
            <div className="flex gap-2 rounded-xl border border-[color-mix(in_srgb,var(--error-color)_40%,transparent)] bg-[color-mix(in_srgb,var(--error-color)_12%,transparent)] p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--error-color)]" />
              <p className="text-xs text-[var(--foreground)]">{blockedMessage}</p>
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Current game</label>
            <select
              value={fromGameConfigId}
              onChange={(e) => {
                setFromGameConfigId(e.target.value);
                setBlockedMessage(null);
              }}
              className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
            >
              {currentGames.map((g) => (
                <option key={g._id} value={g._id}>
                  {formatGameConfigLabel(g)} (${g.entryFee ?? 0})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Move to</label>
            <select
              value={toGameConfigId}
              onChange={(e) => {
                setToGameConfigId(e.target.value);
                setBlockedMessage(null);
              }}
              className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
            >
              <option value="">Select a game...</option>
              {destinationOptions.map((g) => (
                <option key={g._id} value={g._id}>
                  {formatGameConfigLabel(g)} (${g.entryFee ?? 0})
                </option>
              ))}
            </select>
          </div>

          {feeDelta !== null && feeDelta !== 0 && (
            <div
              className="flex items-center justify-between rounded-xl border p-3"
              style={{
                borderColor:
                  feeDelta > 0
                    ? "color-mix(in srgb, var(--accent-color) 35%, transparent)"
                    : "color-mix(in srgb, var(--info-color) 35%, transparent)",
                background:
                  feeDelta > 0
                    ? "color-mix(in srgb, var(--accent-color) 12%, transparent)"
                    : "color-mix(in srgb, var(--info-color) 12%, transparent)",
              }}
            >
              <span className="text-xs text-foreground">
                New fee ${toGame.entryFee ?? 0} vs current ${fromGame.entryFee ?? 0}
              </span>
              <span
                className="text-sm font-bold"
                style={{ color: feeDelta > 0 ? "var(--accent-color)" : "var(--info-color)" }}
              >
                {feeDelta > 0 ? `+$${feeDelta} owed` : `-$${Math.abs(feeDelta)} refund due`}
              </span>
            </div>
          )}
          {feeDelta !== null && feeDelta !== 0 && (
            <p className="text-xs text-muted-foreground">
              Recorded as a Finance adjustment. It isn&apos;t charged or refunded automatically &mdash; collect or
              return the difference separately.
            </p>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Reason (optional)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Player requested to switch after a schedule conflict."
              rows={2}
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
              disabled={submitting || !fromGameConfigId || !toGameConfigId}
              className="rounded-lg bg-[var(--accent-color)] px-4 py-2 text-sm font-semibold text-black disabled:opacity-40"
            >
              {submitting ? "Moving..." : "Confirm Move"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
