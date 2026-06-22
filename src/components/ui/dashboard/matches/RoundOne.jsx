"use client";
import { useState, useEffect, useMemo } from "react";

import api from "@/utils/axios";
import EditMatchModal from "./EditMatchesModel";

export default function RoundOneMatches({
  matches,
  onUpdate,
  pageSize = 12,
  isRefresh,
}) {
  const [editingMatch, setEditingMatch] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Fetch current user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await api.get("/api/me");
        setCurrentUser(res.data.data.user);
      } catch (err) {
        console.error("Failed to fetch current user:", err);
      } finally {
        setLoadingUser(false);
      }
    };
    fetchUser();
  }, []);

  // Search filter (everyone can see all matches)
  const filteredMatches = useMemo(() => {
    return matches.filter(
      (m) =>
        m.teamA.name.toLowerCase().includes(search.toLowerCase()) ||
        m.teamB.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [matches, search]);

  const totalPages = Math.ceil(filteredMatches.length / pageSize);
  const currentMatches = filteredMatches.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  const handleSave = (id, updatedMatch) => {
    if (onUpdate) onUpdate(!isRefresh);
    setEditingMatch(null);
  };

  const getResult = (match, teamId) => {
    if (!match.winner) return "Pending";
    const winnerId =
      typeof match.winner === "object" ? match.winner._id : match.winner;
    return teamId === winnerId ? "Win" : "Lose";
  };

  // Check if current user can edit
  const isUserInMembers = (members, userId) => {
    return (members || []).some((m) =>
      typeof m === "string" ? m === userId : m._id === userId
    );
  };

  const canEditMatch = (match) => {
    if (!currentUser) return false;
    const userId = currentUser._id;

    if (currentUser.role === "admin") return true;

    return (
      isUserInMembers(match.teamA.members, userId) ||
      isUserInMembers(match.teamB.members, userId)
    );
  };

  if (loadingUser) return <p>Loading user...</p>;

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by team..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2 rounded-xl"
          style={{
            background: "var(--card-background)",
            border: "1px solid var(--border-color)",
            color: "var(--foreground)",
          }}
        />
      </div>

      {/* Matches Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {currentMatches.map((match) => {
          const canEdit = canEditMatch(match);

          return (
            <div
              key={match._id}
              className="rounded-2xl p-4 shadow-md"
              style={{
                background: "var(--card-background)",
                border: "1px solid var(--border-color)",
              }}
            >
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold">
                  Match #{match.matchNumber}
                </h3>
                <span className="text-sm text-gray-400">
                  {match.stage || "Round 1"}
                </span>
              </div>

              {/* Teams */}
              <div className="space-y-2 mb-4">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-medium">
                      {match.teamA.serialNo || ""}{" "}
                    </span>
                    <span className="font-medium">{match.teamA.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono">{match.teamAScore ?? 0}</span>
                    <span className="font-medium text-sm">
                      {getResult(match, match.teamA._id)}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-medium">
                      {match.teamB.serialNo || ""}{" "}
                    </span>
                    <span className="font-medium">{match.teamB.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono">{match.teamBScore ?? 0}</span>
                    <span className="font-medium text-sm">
                      {getResult(match, match.teamB._id)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              {!match.winner ? (
                <button
                  onClick={() => setEditingMatch(match)}
                  disabled={!canEdit}
                  className={`w-full rounded-xl px-3 py-2 text-sm font-medium ${
                    canEdit
                      ? "bg-[var(--accent-color)] text-[var(--background)]"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  Add / Edit Score
                </button>
              ) : (
                <>
                  {currentUser?.role === "admin" ? (
                    <button
                      onClick={() => setEditingMatch(match)}
                      className="w-full rounded-xl px-3 py-2 text-sm font-medium bg-yellow-500 text-white"
                    >
                      Update Score (Admin)
                    </button>
                  ) : (
                    <p className="text-xs text-[var(--success-color)] text-center">
                      Match Completed
                    </p>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-4 mt-4">
          <button
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className="px-4 py-2 rounded-lg"
            style={{
              background: "var(--secondary-color)",
              color: "var(--foreground)",
            }}
          >
            Prev
          </button>
          <span className="text-sm text-gray-400">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
            className="px-4 py-2 rounded-lg"
            style={{
              background: "var(--secondary-color)",
              color: "var(--foreground)",
            }}
          >
            Next
          </button>
        </div>
      )}

      <EditMatchModal
        isOpen={!!editingMatch}
        match={editingMatch}
        onClose={() => setEditingMatch(null)}
        onSave={handleSave}
      />
    </div>
  );
}
