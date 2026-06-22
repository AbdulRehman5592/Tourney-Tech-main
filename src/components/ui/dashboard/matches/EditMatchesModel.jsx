"use client";

import { useState, useEffect } from "react";
import api from "@/utils/axios";
import { toast } from "react-hot-toast";

export default function EditMatchModal({ isOpen, onClose, match, onSave }) {
  const [form, setForm] = useState({
    teamAScore: "",
    teamBScore: "",
    teamAtotalWon: 0,
    teamBtotalWon: 0,
    teamAboston: 0,
    teamBboston: 0,
    teamAAgree: false,
    teamBAgree: false,
  });

  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [saving, setSaving] = useState(false);

  // ✅ Fetch current user
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

  // ✅ Load match data
  useEffect(() => {
    if (match) {
      setForm({
        teamAScore: match.teamAScore ?? 0,
        teamBScore: match.teamBScore ?? 0,
        teamAtotalWon: match.teamAtotalWon ?? 0,
        teamBtotalWon: match.teamBtotalWon ?? 0,
        teamAboston: match.teamAboston ?? 0,
        teamBboston: match.teamBboston ?? 0,
        teamAAgree: match.teamAAgree ?? false,
        teamBAgree: match.teamBAgree ?? false,
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

  const bothAgreed = form.teamAAgree && form.teamBAgree;

  const validateForm = () => {
    const num = (v) => !isNaN(v) && v >= 0;
    if (!num(form.teamAScore) || !num(form.teamBScore)) {
      toast.error("Scores must be valid numbers");
      return false;
    }
    return true;
  };

  // ✅ Save Score (without auto-agree)
const handleSave = async () => {
  if (!validateForm()) return;
  setSaving(true);

  try {
    // Basic payload
    let payload = {
      matchNumber: match.matchNumber,
    };

    // ✅ Admin can edit both teams' scores and agreements
    if (isAdmin) {
      payload = {
        ...payload,
        editBy: "admin",
        teamAScore: Number(form.teamAScore),
        teamBScore: Number(form.teamBScore),
        teamAtotalWon: Number(form.teamAtotalWon),
        teamBtotalWon: Number(form.teamBtotalWon),
        teamAboston: Number(form.teamAboston),
        teamBboston: Number(form.teamBboston),
        teamAAgree: form.teamAAgree || false,
        teamBAgree: form.teamBAgree || false,
      };
    }

    // ✅ Team A can only edit their own side
    else if (isTeamA) {
      payload = {
        ...payload,
        editBy: "teamA",
        teamAScore:
          form.teamAScore !== "" && form.teamAScore !== null
            ? Number(form.teamAScore)
            : undefined,
        teamAtotalWon:
          form.teamAtotalWon !== "" && form.teamAtotalWon !== null
            ? Number(form.teamAtotalWon)
            : undefined,
        teamAboston:
          form.teamAboston !== "" && form.teamAboston !== null
            ? Number(form.teamAboston)
            : undefined,
        teamAAgree: form.teamAAgree || false,
      };
    }

    // ✅ Team B can only edit their own side
    else if (isTeamB) {
      payload = {
        ...payload,
        editBy: "teamB",
        teamBScore:
          form.teamBScore !== "" && form.teamBScore !== null
            ? Number(form.teamBScore)
            : undefined,
        teamBtotalWon:
          form.teamBtotalWon !== "" && form.teamBtotalWon !== null
            ? Number(form.teamBtotalWon)
            : undefined,
        teamBboston:
          form.teamBboston !== "" && form.teamBboston !== null
            ? Number(form.teamBboston)
            : undefined,
        teamBAgree: form.teamBAgree || false,
      };
    }

    // ❌ Not part of this match
    else {
      toast.error("You are not allowed to edit this match");
      setSaving(false);
      return;
    }

    // ✅ Send to API
  const res = await api.patch(`/api/matches/${match?._id}`, payload);


    toast.success(res.data.message || "Match updated successfully");

    // ✅ Refresh or update state
    if (onSave) onSave(match._id, res.data.data);
    onClose();
  } catch (err) {
    toast.error(err?.response?.data?.message || "Failed to save match");
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

  const canEditTeamA = isAdmin || isTeamA;
  const canEditTeamB = isAdmin || isTeamB;

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

        {/* STATUS */}
        <div className="flex justify-between text-sm mb-4">
          <p>
            {match.teamA.name}:{" "}
            {form.teamAAgree ? (
              <span className="text-green-500">Agreed ✅</span>
            ) : (
              <span className="text-red-400">Pending ❌</span>
            )}
          </p>
          <p>
            {match.teamB.name}:{" "}
            {form.teamBAgree ? (
              <span className="text-green-500">Agreed ✅</span>
            ) : (
              <span className="text-red-400">Pending ❌</span>
            )}
          </p>
        </div>

        {/* TEAM INPUTS */}
        <div className="space-y-6">
          {/* TEAM A */}
          <div className={`${!canEditTeamA ? "opacity-60" : ""}`}>
            <h3 className="font-semibold mb-2">
              {match.teamA.serialNo} {match.teamA.name}
            </h3>
            <input
              type="number"
              value={form.teamAScore}
              disabled={!canEditTeamA}
              onChange={(e) => handleChange("teamAScore", e.target.value)}
              className="w-full rounded-lg px-3 py-2 border mb-2 bg-transparent"
            />
            <select
              value={form.teamAtotalWon}
              disabled={!canEditTeamA}
              onChange={(e) => handleChange("teamAtotalWon", e.target.value)}
              className="w-full rounded-lg px-3 py-2 border mb-2 bg-[var(--card-background)]"
            >
              {[...Array(11).keys()].map((n) => (
                <option key={n} value={n}>
                  Hands Won: {n}
                </option>
              ))}
            </select>
            <select
              value={form.teamAboston}
              disabled={!canEditTeamA}
              onChange={(e) => handleChange("teamAboston", e.target.value)}
              className="w-full rounded-lg px-3 py-2 border bg-[var(--card-background)] mb-2"
            >
              {[...Array(11).keys()].map((n) => (
                <option key={n} value={n}>
                  Boston: {n}
                </option>
              ))}
            </select>

            {/* ✅ Agree checkbox */}
            <label className="flex items-center gap-2 mt-2 text-sm">
              <input
                type="checkbox"
                disabled={!canEditTeamA}
                checked={form.teamAAgree}
                onChange={(e) => handleChange("teamAAgree", e.target.checked)}
              />
              I agree with the entered score
            </label>
          </div>

          {/* TEAM B */}
          <div className={`${!canEditTeamB ? "opacity-60" : ""}`}>
            <h3 className="font-semibold mb-2">
              {match.teamB.serialNo} {match.teamB.name}
            </h3>
            <input
              type="number"
              value={form.teamBScore}
              disabled={!canEditTeamB}
              onChange={(e) => handleChange("teamBScore", e.target.value)}
              className="w-full rounded-lg px-3 py-2 border mb-2 bg-transparent"
            />
            <select
              value={form.teamBtotalWon}
              disabled={!canEditTeamB}
              onChange={(e) => handleChange("teamBtotalWon", e.target.value)}
              className="w-full rounded-lg px-3 py-2 border mb-2 bg-[var(--card-background)]"
            >
              {[...Array(11).keys()].map((n) => (
                <option key={n} value={n}>
                  Hands Won: {n}
                </option>
              ))}
            </select>
            <select
              value={form.teamBboston}
              disabled={!canEditTeamB}
              onChange={(e) => handleChange("teamBboston", e.target.value)}
              className="w-full rounded-lg px-3 py-2 border bg-[var(--card-background)] mb-2"
            >
              {[...Array(11).keys()].map((n) => (
                <option key={n} value={n}>
                  Boston: {n}
                </option>
              ))}
            </select>

            {/* ✅ Agree checkbox */}
            <label className="flex items-center gap-2 mt-2 text-sm">
              <input
                type="checkbox"
                disabled={!canEditTeamB}
                checked={form.teamBAgree}
                onChange={(e) => handleChange("teamBAgree", e.target.checked)}
              />
              I agree with the entered score
            </label>
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

          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>

        {/* COMPLETE STATUS */}
        {bothAgreed && (
          <div className="mt-4 text-center text-green-500 font-semibold">
            ✅ Both teams agreed. Match ready for next stage.
          </div>
        )}
      </div>
    </div>
  );
}
