"use client";

import { useEffect, useState } from "react";
import EditMatchModal from "./EditMatchesModel";
import api from "@/utils/axios";

function MatchCard({ match, onClick, canEdit }) {
  return (
    <div
      className="bg-gray-800 border border-gray-700 rounded-xl shadow-md text-white text-sm p-3 cursor-pointer 
                 hover:ring-2 hover:ring-yellow-400 transition-all duration-200 min-w-[180px]"
      onClick={() => canEdit && onClick(match)}
    >
      <div
        className={`flex justify-between gap-2 items-center px-2 py-1 rounded-md mb-1 ${
          match.winner === match.teamA?._id ? "bg-green-600" : "bg-gray-700"
        }`}
      >
        <span className="truncate">
          {" "}
          {match.teamA?.serialNo} {match.teamA?.name || "TBD"}
        </span>
        <span>{match.teamAScore ?? 0}</span>
      </div>

      <div
        className={`flex justify-between gap-2 items-center px-2 py-1 rounded-md ${
          match.winner === match.teamB?._id ? "bg-green-600" : "bg-gray-700"
        }`}
      >
        <span className="truncate">
          {match.teamB?.serialNo} {match.teamB?.name || "TBD"}
        </span>
        <span>{match.teamBScore ?? 0}</span>
      </div>
    </div>
  );
}

export default function RoundTwoBracket({ matches = [], teams = [] }) {
  const [editingMatch, setEditingMatch] = useState(null);
  const [data, setData] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    if (matches?.length) setData(matches);
  }, [matches]);

  // Fetch current user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await api.get("/api/me");
        setCurrentUser(res.data.data.user);
      } catch (err) {
        console.error("Failed to fetch current user:", err);
      }
    };
    fetchUser();
  }, []);

  const groupByRounds = (matches) => {
    const grouped = {};
    matches.forEach((m) => {
      const round = Number(m.round);
      if (!grouped[round]) grouped[round] = [];
      grouped[round].push(m);
    });
    return grouped;
  };

  const rounds = groupByRounds(data);

  const handleSave = (id, updated) => {
    setData((prev) =>
      prev.map((m) => (m._id === id ? { ...m, ...updated } : m))
    );
    setEditingMatch(null);
  };

  // 🔹 Check if user can edit a match
  const canEditMatch = (match) => {
    if (!currentUser) return false;
    if (currentUser.role === "admin") return true; // admin can edit all matches
    if (match.status === "completed") return false; // completed matches only editable by admin

    // User can edit if they are in teamA or teamB
    const userId = currentUser._id;
    const inTeamA = (match.teamA.members || []).some((m) =>
      typeof m === "string" ? m === userId : m._id === userId
    );
    const inTeamB = (match.teamB.members || []).some((m) =>
      typeof m === "string" ? m === userId : m._id === userId
    );

    return inTeamA || inTeamB;
  };

  return (
    <div className="w-full overflow-x-auto relative bg-gray-900 p-6">
      {Object.keys(rounds).length ? (
        <div
          className="flex gap-12 min-w-max"
          style={{ scrollSnapType: "x mandatory" }}
        >
          {Object.keys(rounds)
            .map((r) => Number(r))
            .sort((a, b) => a - b)
            .map((round) => (
              <div
                key={round}
                className="flex flex-col gap-8 items-center min-w-[200px] scroll-snap-align-start"
              >
                <h3 className="text-center text-yellow-400 font-bold text-lg mb-2">
                  Stage {round - 1}
                </h3>
                {rounds[round].map((match, idx) => {
                  const canEdit = canEditMatch(match);
                  return (
                    <div key={match._id} className="relative">
                      {idx !== rounds[round].length - 1 && (
                        <div className="absolute left-1/2 top-full w-0.5 h-8 bg-gray-600"></div>
                      )}
                      {/* <MatchCard
                        match={match}
                        onClick={setEditingMatch}
                        canEdit={canEdit}
                      /> */}
                      <MatchCard
                        match={match}
                        onClick={() => {
                          // Only open if both teams exist
                          if (match.teamA?._id && match.teamB?._id) {
                            setEditingMatch(match);
                          }
                        }}
                        canEdit={canEdit}
                      />
                    </div>
                  );
                })}
              </div>
            ))}
        </div>
      ) : (
        <p className="text-center text-gray-400">No matches available</p>
      )}

      <EditMatchModal
        isOpen={!!editingMatch}
        match={editingMatch}
        teams={teams}
        onClose={() => setEditingMatch(null)}
        onSave={handleSave}
      />
    </div>
  );
}
