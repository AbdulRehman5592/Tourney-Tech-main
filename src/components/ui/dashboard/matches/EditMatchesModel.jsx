"use client";

import { useState, useEffect } from "react";
import api from "@/utils/axios";
import { toast } from "react-hot-toast";

// Fallback layout (classic Spades) when a match's game has no configured type --
// keeps behaviour identical to before game types existed.
const DEFAULT_FIELDS = [
  { key: "score", label: "Score", input: "number", min: 0, isPrimary: true },
  { key: "hands", label: "Hands Won", input: "select", min: 0, max: 10 },
  { key: "boston", label: "Boston", input: "select", min: 0, max: 10 },
];

// Reads a field value for a side off the match, preferring the dynamic scores
// map and falling back to the legacy columns so old matches still populate.
function initialValue(match, side, field) {
  const map = match?.[`${side}Scores`];
  const fromMap = map && (map[field.key] ?? map.get?.(field.key));
  if (fromMap !== undefined && fromMap !== null) return fromMap;
  if (field.isPrimary) return match?.[`${side}Score`] ?? 0;
  if (field.key === "boston") return match?.[`${side}boston`] ?? 0;
  if (field.key === "hands") return match?.[`${side}totalWon`] ?? 0;
  return field.min ?? 0;
}

export default function EditMatchModal({
  isOpen,
  onClose,
  match,
  onSave,
  // Set by callers (e.g. the Live Table Overview page) when the viewer is
  // tournament staff (owner/organizer/manager) for this match's tournament --
  // grants the same full-override controls as a global admin. Must mirror
  // SCORE_OVERRIDE_STAFF_ROLES in PATCH /api/matches/[id] or this button will
  // show but the request will 403.
  isStaffOverride = false,
}) {
  const [fields, setFields] = useState(DEFAULT_FIELDS);
  const [teamA, setTeamA] = useState({});
  const [teamB, setTeamB] = useState({});

  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [saving, setSaving] = useState(false);

  const primaryKey = (fields.find((f) => f.isPrimary) || fields[0])?.key;

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

  // Resolve the score layout for this match's game type.
  useEffect(() => {
    if (!isOpen) return;
    const typeName = match?.game?.gameType;
    if (!typeName) {
      setFields(DEFAULT_FIELDS);
      return;
    }
    api
      .get("/api/game-types")
      .then((res) => {
        const found = (res.data?.data || []).find((gt) => gt.name === typeName);
        setFields(found?.scoreFields?.length ? found.scoreFields : DEFAULT_FIELDS);
      })
      .catch(() => setFields(DEFAULT_FIELDS));
  }, [isOpen, match?.game?.gameType]);

  // (Re)initialize inputs whenever the match or the resolved fields change.
  useEffect(() => {
    if (!match) return;
    const a = {};
    const b = {};
    for (const f of fields) {
      a[f.key] = initialValue(match, "teamA", f);
      b[f.key] = initialValue(match, "teamB", f);
    }
    setTeamA(a);
    setTeamB(b);
  }, [match, fields]);

  if (!isOpen || !match) return null;

  const isAdmin = user?.role === "admin" || isStaffOverride;
  const userId = user?._id?.toString();

  const teamAMembers = match?.teamA?.members?.map((m) => m.toString()) || [];
  const teamBMembers = match?.teamB?.members?.map((m) => m.toString()) || [];

  const isTeamA = teamAMembers.includes(userId);
  const isTeamB = teamBMembers.includes(userId);
  const mySide = isTeamA ? "teamA" : isTeamB ? "teamB" : null;

  const isCompleted = match.status === "completed";
  const isOpenForEntry = !isCompleted && !match.scoreEnteredBy;
  const iEnteredPending = !isCompleted && match.scoreEnteredBy === mySide;
  const needsMyResponse =
    !isCompleted && match.scoreEnteredBy && match.scoreEnteredBy !== mySide && mySide;

  const canSubmit = isAdmin || (mySide && (isOpenForEntry || iEnteredPending));
  const fieldsDisabled = !canSubmit || saving;

  const setA = (key, value) => setTeamA((p) => ({ ...p, [key]: value }));
  const setB = (key, value) => setTeamB((p) => ({ ...p, [key]: value }));

  const validateForm = () => {
    const primA = Number(teamA[primaryKey]);
    const primB = Number(teamB[primaryKey]);
    if (isNaN(primA) || isNaN(primB) || primA < 0 || primB < 0) {
      toast.error("Scores must be valid numbers");
      return false;
    }
    if (primA === primB) {
      toast.error("Draw not supported -- scores must differ");
      return false;
    }
    return true;
  };

  const buildScorePayload = () => {
    const teamAScores = {};
    const teamBScores = {};
    for (const f of fields) {
      teamAScores[f.key] = Number(teamA[f.key]) || 0;
      teamBScores[f.key] = Number(teamB[f.key]) || 0;
    }
    return {
      teamAScore: Number(teamA[primaryKey]) || 0,
      teamBScore: Number(teamB[primaryKey]) || 0,
      teamAScores,
      teamBScores,
    };
  };

  const handleSubmitScore = async () => {
    if (!validateForm()) return;
    setSaving(true);
    try {
      const payload = {
        matchNumber: match.matchNumber,
        action: isAdmin ? undefined : "submit",
        ...buildScorePayload(),
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

  const renderFields = (values, setter) =>
    fields.map((f) => {
      if (f.input === "select") {
        const max = Number.isFinite(Number(f.max)) ? Number(f.max) : 10;
        const min = Number(f.min) || 0;
        const options = [];
        for (let n = min; n <= max; n++) options.push(n);
        return (
          <select
            key={f.key}
            value={values[f.key] ?? min}
            disabled={fieldsDisabled}
            onChange={(e) => setter(f.key, e.target.value)}
            className="w-full rounded-lg px-3 py-2 border mb-2 bg-[var(--card-background)] disabled:opacity-60"
          >
            {options.map((n) => (
              <option key={n} value={n}>
                {f.label}: {n}
              </option>
            ))}
          </select>
        );
      }
      return (
        <div key={f.key} className="mb-2">
          <label className="mb-1 block text-xs text-[var(--muted-foreground)]">
            {f.label}
            {f.isPrimary ? " ★" : ""}
          </label>
          <input
            type="number"
            min={f.min ?? 0}
            value={values[f.key] ?? ""}
            disabled={fieldsDisabled}
            onChange={(e) => setter(f.key, e.target.value)}
            className="w-full rounded-lg px-3 py-2 border bg-transparent disabled:opacity-60"
          />
        </div>
      );
    });

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-50">
      <div
        className="w-full max-w-lg rounded-xl p-6 max-h-[90vh] overflow-y-auto scrollbar"
        style={{
          background: "var(--card-background)",
          border: "1px solid var(--border-color)",
        }}
      >
        <h2 className="text-lg font-semibold mb-1">
          Edit Match #{match.matchNumber}
          {match.tableNumber ? ` · Table ${match.tableNumber}` : ""}
        </h2>
        {match?.game?.gameType && (
          <p className="text-xs text-[var(--muted-foreground)] mb-4">
            {match.game.gameType} scoring
          </p>
        )}

        {!isAdmin && (
          <div className="mb-4 text-sm">
            {isCompleted && <p className="text-green-500">✅ Match completed.</p>}
            {isOpenForEntry && (
              <p className="text-gray-300">
                No score entered yet -- enter the full result below on behalf of both teams.
              </p>
            )}
            {iEnteredPending && (
              <p className="text-yellow-400">
                You submitted this score. Waiting for the other team to agree or disagree.
              </p>
            )}
            {needsMyResponse && (
              <p className="text-yellow-400">
                The other team submitted this score. Review it below and agree or disagree.
              </p>
            )}
          </div>
        )}

        <div className="space-y-6">
          <div>
            <h3 className="font-semibold mb-2">
              {match.teamA.displayId || match.teamA.serialNo} {match.teamA.name}
            </h3>
            {renderFields(teamA, setA)}
          </div>
          <div>
            <h3 className="font-semibold mb-2">
              {match.teamB.displayId || match.teamB.serialNo} {match.teamB.name}
            </h3>
            {renderFields(teamB, setB)}
          </div>
        </div>

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
