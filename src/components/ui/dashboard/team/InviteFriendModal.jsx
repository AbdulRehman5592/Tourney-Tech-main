"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";
import api from "@/utils/axios";

export default function InviteFriendModal({ tournaments, onClose }) {
  const [tournamentId, setTournamentId] = useState("");
  const [gameId, setGameId] = useState("");
  const [mode, setMode] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [link, setLink] = useState("");

  const tournament = tournaments.find((t) => t._id === tournamentId);
  const gameData = (tournament?.games || []).find((g) => g._id === gameId);

  const handleGenerate = async () => {
    if (!tournamentId || !gameId || !mode) {
      toast.error("Please select tournament, game and doubles type.");
      return;
    }
    try {
      setLoading(true);
      const res = await api.post("/api/invites", { tournamentId, gameId, mode, message });
      const token = res.data?.data?.invite?.token;
      setLink(`${window.location.origin}/invite/${token}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create invite link");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link copied!");
    } catch {
      toast.error("Couldn't copy — select and copy the link manually.");
    }
  };

  const handleShare = async () => {
    if (!navigator.share) return handleCopy();
    try {
      await navigator.share({ title: "Team up with me!", url: link });
    } catch {
      // user cancelled the native share sheet -- no-op
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md p-6 rounded-2xl shadow-lg"
        style={{ background: "var(--card-background)", border: "1px solid var(--border-color)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold mb-4">Invite a Friend to Sign Up</h2>

        {!link ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm opacity-75">
              Can't find your friend in the list? Generate a link, send it to them
              yourself, and they'll be able to sign up (or log in) and accept your
              partner-up request.
            </p>

            <select
              value={tournamentId}
              onChange={(e) => {
                setTournamentId(e.target.value);
                setGameId("");
                setMode("");
              }}
              className="w-full p-2 rounded-lg bg-[var(--card-background)] border border-[var(--border-color)]"
            >
              <option value="">Select Tournament</option>
              {tournaments.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name}
                </option>
              ))}
            </select>

            {tournament && (
              <select
                value={gameId}
                onChange={(e) => {
                  setGameId(e.target.value);
                  setMode("");
                }}
                className="w-full p-2 rounded-lg bg-[var(--card-background)] border border-[var(--border-color)]"
              >
                <option value="">Select Game</option>
                {(tournament.games || []).map((g) => (
                  <option key={g._id} value={g._id}>
                    {g.name}
                  </option>
                ))}
              </select>
            )}

            {gameData && (
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                className="w-full p-2 rounded-lg bg-[var(--card-background)] border border-[var(--border-color)]"
              >
                <option value="">Select Doubles Type</option>
                {gameData.doublesEnabled && <option value="doubles">Doubles</option>}
                {gameData.mixedDoublesEnabled && (
                  <option value="mixed_doubles">Mixed Doubles</option>
                )}
              </select>
            )}

            <input
              type="text"
              placeholder="Optional message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-2 rounded-lg bg-[var(--card-background)] border border-[var(--border-color)]"
            />

            <button
              type="button"
              disabled={loading}
              onClick={handleGenerate}
              className="w-full font-semibold py-2 px-4 rounded-lg disabled:opacity-50"
              style={{ background: "var(--accent-color)", color: "black" }}
            >
              {loading ? "Generating..." : "Generate Invite Link"}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm opacity-75">
              Share this link with your friend however you'd like (text, chat, email...).
            </p>
            <input
              readOnly
              value={link}
              onFocus={(e) => e.target.select()}
              className="w-full p-2 rounded-lg bg-[var(--card-background)] border border-[var(--border-color)] text-sm"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="flex-1 font-semibold py-2 px-4 rounded-lg"
                style={{ background: "var(--accent-color)", color: "black" }}
              >
                Copy Link
              </button>
              <button
                type="button"
                onClick={handleShare}
                className="flex-1 font-semibold py-2 px-4 rounded-lg border"
                style={{ borderColor: "var(--border-color)" }}
              >
                Share
              </button>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full text-sm opacity-75 hover:opacity-100"
        >
          Close
        </button>
      </div>
    </div>
  );
}
