"use client";

import { useState, useEffect } from "react";
import api from "@/utils/axios";
import { toast } from "react-hot-toast";

const HAND_OPTIONS = [...Array(11).keys()];

export default function EditMatchModal({ isOpen, onClose, match, onSave }) {
  const [form, setForm] = useState({
    teamAScore: "",
    teamBScore: "",
    teamAtotalWon: 0,
    teamBtotalWon: 0,
    teamAboston: 0,
    teamBboston: 0,
  });

  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await api.get("/api/me");
        setUser(res.data.data.user);
      } catch (err) {
        console.error("Failed to fetch user:", err);
      } finally {
        setLoadingUser(false);
      }
    };
    if (isOpen) fetchUser();
  }, [isOpen]);

  useEffect(() => {
    if (match) {
      setForm({
        teamAScore: match.teamAScore ?? 0,
        teamBScore: match.teamBScore ?? 0,
        teamAtotalWon: match.teamAtotalWon ?? 0,
        teamBtotalWon: match.teamBtotalWon ?? 0,
        teamAboston: match.teamAboston ?? 0,
        teamBboston: match.teamBboston ?? 0,
      });
    }
  }, [match]);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  if (!isOpen || !match) return null;

  const isAdmin = user?.role === "admin";
  const userId = user?._id?.toString();

  const teamAMembers = match?.teamA?.members?.map((m) => m.toString()) || [];
  const teamBMembers = match?.teamB?.members?.map((m) => m.toString()) || [];

  const isTeamA = teamAMembers.includes(userId);
  const isTeamB = teamBMembers.includes(userId);
  const mySide = isTeamA ? "teamA" : isTeamB ? "teamB" : null;

  const isCompleted = match.status === "completed";
  // Nobody has entered a score yet -> open for either side to submit on
  // behalf of both teams.
  const isOpenForEntry = !isCompleted && !match.scoreEnteredBy;
  // The side that entered the pending score is waiting on the other side.
  const iEnteredPending = !isCompleted && match.scoreEnteredBy === mySide;
  // I'm on the side that needs to agree/disagree with what the other team entered.
  const needsMyResponse =
    !isCompleted && match.scoreEnteredBy && match.scoreEnteredBy !== mySide && mySide;

  const canSubmit = isAdmin || (mySide && (isOpenForEntry || iEnteredPending));

  const validateForm = () => {
    const num = (v) => v !== "" && !isNaN(v) && v >= 0;
    if (!num(form.teamAScore) || !num(form.teamBScore)) {
      toast.error("Scores must be valid numbers");
      return false;
    }
    if (Number(form.teamAScore) === Number(form.teamBScore)) {
      toast.error("Draw not supported -- scores must differ");
      return false;
    }
    return true;
  };

  const handleSubmitScore = async () => {
    if (!validateForm()) return;
    setSaving(true);
    try {
      const payload = {
        matchNumber: match.matchNumber,
        action: isAdmin ? undefined : "submit",
        teamAScore: Number(form.teamAScore),
        teamBScore: Number(form.teamBScore),
        teamAtotalWon: Number(form.teamAtotalWon),
        teamBtotalWon: Number(form.teamBtotalWon),
        teamAboston: Number(form.teamAboston),
        teamBboston: Number(form.teamBboston),
      };
      const res = await api.patch(`/api/matches/${match?._id}`, payload);
      toast.success(res.data.message || "Score submitted");
      if (onSave) onSave(match._id, res.data.data);
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to submit score");
    } finally {
      setSaving(false);
    }
  };

  const handleRespond = async (agree) => {
    setSaving(true);
    try {
      const res = await api.patch(`/api/matches/${match?._id}`, {
        matchNumber: match.matchNumber,
        action: "respond",
        agree,
      });
      toast.success(
        agree
          ? res.data.message || "Score confirmed"
          : "Score disagreed -- you can now submit the correct score"
      );
      if (onSave) onSave(match._id, res.data.data);
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to respond");
    } finally {
      setSaving(false);
    }
  };

  if (loadingUser) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-50 text-white">
        Loading user...
      </div>
    );
  }

  const fieldsDisabled = !canSubmit || saving;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-50">
      <div
        className="w-full max-w-lg rounded-xl p-6"
        style={{
          background: "var(--card-background)",
          border: "1px solid var(--border-color)",
        }}
      >
        <h2 className="text-lg font-semibold mb-4">
          Edit Match #{match.matchNumber}
        </h2>

        {/* STATUS BANNER */}
        {!isAdmin && (
          <div className="mb-4 text-sm">
            {isCompleted && (
              <p className="text-green-500">✅ Match completed.</p>
            )}
            {isOpenForEntry && (
              <p className="text-gray-300">
                No score entered yet -- enter the full result below on behalf of
                both teams.
              </p>
            )}
            {iEnteredPending && (
              <p className="text-yellow-400">
                You submitted this score. Waiting for the other team to agree
                or disagree.
              </p>
            )}
            {needsMyResponse && (
              <p className="text-yellow-400">
                The other team submitted this score. Review it below and
                agree or disagree.
              </p>
            )}
          </div>
        )}

        {/* TEAM INPUTS */}
        <div className="space-y-6">
          {/* TEAM A */}
          <div>
            <h3 className="font-semibold mb-2">
              {match.teamA.serialNo} {match.teamA.name}
            </h3>
            <input
              type="number"
              value={form.teamAScore}
              disabled={fieldsDisabled}
              onChange={(e) => handleChange("teamAScore", e.target.value)}
              className="w-full rounded-lg px-3 py-2 border mb-2 bg-transparent disabled:opacity-60"
            />
            <select
              value={form.teamAtotalWon}
              disabled={fieldsDisabled}
              onChange={(e) => handleChange("teamAtotalWon", e.target.value)}
              className="w-full rounded-lg px-3 py-2 border mb-2 bg-[var(--card-background)] disabled:opacity-60"
            >
              {HAND_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  Hands Won: {n}
                </option>
              ))}
            </select>
            <select
              value={form.teamAboston}
              disabled={fieldsDisabled}
              onChange={(e) => handleChange("teamAboston", e.target.value)}
              className="w-full rounded-lg px-3 py-2 border bg-[var(--card-background)] mb-2 disabled:opacity-60"
            >
              {HAND_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  Boston: {n}
                </option>
              ))}
            </select>
          </div>

          {/* TEAM B */}
          <div>
            <h3 className="font-semibold mb-2">
              {match.teamB.serialNo} {match.teamB.name}
            </h3>
            <input
              type="number"
              value={form.teamBScore}
              disabled={fieldsDisabled}
              onChange={(e) => handleChange("teamBScore", e.target.value)}
              className="w-full rounded-lg px-3 py-2 border mb-2 bg-transparent disabled:opacity-60"
            />
            <select
              value={form.teamBtotalWon}
              disabled={fieldsDisabled}
              onChange={(e) => handleChange("teamBtotalWon", e.target.value)}
              className="w-full rounded-lg px-3 py-2 border mb-2 bg-[var(--card-background)] disabled:opacity-60"
            >
              {HAND_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  Hands Won: {n}
                </option>
              ))}
            </select>
            <select
              value={form.teamBboston}
              disabled={fieldsDisabled}
              onChange={(e) => handleChange("teamBboston", e.target.value)}
              className="w-full rounded-lg px-3 py-2 border bg-[var(--card-background)] mb-2 disabled:opacity-60"
            >
              {HAND_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  Boston: {n}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-500 text-white"
            disabled={saving}
          >
            Cancel
          </button>

          {needsMyResponse && !isAdmin ? (
            <>
              <button
                onClick={() => handleRespond(false)}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
              >
                Disagree
              </button>
              <button
                onClick={() => handleRespond(true)}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
              >
                Agree
              </button>
            </>
          ) : (
            canSubmit && (
              <button
                onClick={handleSubmitScore}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Submit Score"}
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
