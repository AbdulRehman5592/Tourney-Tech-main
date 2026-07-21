"use client";

import { useEffect, useState } from "react";
import {
  SingleEliminationBracket,
  DoubleEliminationBracket,
  MATCH_STATES,
} from "@g-loot/react-tournament-brackets";
import EditMatchModal from "./EditMatchesModel";
import api from "@/utils/axios";

// Every match's (round, slot) pair is unique across the whole bracket (winners
// and losers rounds never reuse numbers), so it doubles as a stable node id for
// the library's nextMatchId/nextLooserMatchId graph.
const slotId = (round, slot) => `${round}-${slot}`;

function buildParticipant(match, team, isWinner) {
  if (!team) return null;
  const score = team._id === match.teamA?._id ? match.teamAScore : match.teamBScore;
  return {
    id: team._id,
    name: [team.serialNo, team.name].filter(Boolean).join(" "),
    isWinner,
    resultText: match.status === "completed" ? String(score ?? 0) : null,
  };
}

function toLibMatch(match, editable) {
  const winnerId =
    match.winner && (typeof match.winner === "object" ? match.winner._id : match.winner);

  const participants = [match.teamA, match.teamB]
    .map((team) => {
      if (!team) return null;
      const isWinner = match.status === "completed" ? team._id === winnerId : undefined;
      return buildParticipant(match, team, isWinner);
    })
    .filter(Boolean);

  return {
    id: slotId(match.round, match.slot),
    nextMatchId: match.winTarget ? slotId(match.winTarget.round, match.winTarget.match) : null,
    nextLooserMatchId: match.lossTarget
      ? slotId(match.lossTarget.round, match.lossTarget.match)
      : null,
    state: match.status === "completed" ? MATCH_STATES.DONE : "SCHEDULED",
    participants,
    editable,
    raw: match,
  };
}

function BracketMatchCard({ match, onMatchClick, topParty, bottomParty, topWon, bottomWon }) {
  const handleClick = (event) => {
    if (!match.editable) return;
    onMatchClick?.({ match, topWon, bottomWon, event });
  };

  const renderParty = (party, won) => (
    <div
      className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md text-sm ${
        won ? "bg-emerald-600 text-white font-semibold" : "bg-black/20 text-gray-200"
      }`}
    >
      <span className="truncate">{party?.name || "TBD"}</span>
      {party?.resultText != null && (
        <span className="font-mono text-xs opacity-90">{party.resultText}</span>
      )}
    </div>
  );

  return (
    <div
      onClick={handleClick}
      className={`h-full w-full flex flex-col justify-center gap-1.5 rounded-xl border p-2 transition ${
        match.editable
          ? "cursor-pointer border-[var(--accent-color)]/50 hover:border-[var(--accent-color)] hover:shadow-md"
          : "border-white/10"
      }`}
      style={{ background: "#1a1f2e" }}
    >
      {match.raw?.tableNumber && (
        <span className="px-1 text-[10px] uppercase tracking-wide text-gray-400">
          Table {match.raw.tableNumber}
        </span>
      )}
      {renderParty(topParty, topWon)}
      {renderParty(bottomParty, bottomWon)}
    </div>
  );
}

const bracketStyle = {
  width: 260,
  boxHeight: 84,
  canvasPadding: 20,
  spaceBetweenColumns: 50,
  spaceBetweenRows: 24,
  connectorColor: "#3f4655",
  connectorColorHighlight: "#5eead4",
  roundHeader: {
    isShown: true,
    height: 34,
    marginBottom: 20,
    fontSize: 13,
    fontColor: "#e5e7eb",
    backgroundColor: "#252b3b",
    roundTextGenerator: (round, totalRounds) =>
      round === totalRounds ? "Final" : round === totalRounds - 1 ? "Semi-Final" : `Round ${round}`,
  },
};

export default function RoundTwoBracket({ matches = [], format, onUpdate }) {
  const [editingMatch, setEditingMatch] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

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

  const canEditMatch = (raw) => {
    if (!currentUser || !raw?.teamA?._id || !raw?.teamB?._id) return false;
    if (currentUser.role === "admin") return true;
    if (raw.status === "completed") return false;

    const userId = currentUser._id;
    const inTeamA = (raw.teamA.members || []).some((m) =>
      typeof m === "string" ? m === userId : m._id === userId
    );
    const inTeamB = (raw.teamB.members || []).some((m) =>
      typeof m === "string" ? m === userId : m._id === userId
    );
    return inTeamA || inTeamB;
  };

  const handleMatchClick = ({ match }) => setEditingMatch(match.raw);
  const handleSave = (id, updatedMatch) => {
    onUpdate?.(id, updatedMatch);
    setEditingMatch(null);
  };

  if (!matches.length) {
    return <p className="text-center text-gray-400">No matches available</p>;
  }

  const isDoubleElim = format === "double_elimination";
  const options = { style: bracketStyle };

  return (
    <div className="w-full overflow-x-auto overflow-y-auto rounded-xl bg-[#0f1420] p-4">
      {isDoubleElim ? (
        <DoubleEliminationBracket
          matches={{
            upper: matches
              .filter((m) => m.bracketSide !== "losers")
              .map((m) => toLibMatch(m, canEditMatch(m))),
            lower: matches
              .filter((m) => m.bracketSide === "losers")
              .map((m) => toLibMatch(m, canEditMatch(m))),
          }}
          matchComponent={BracketMatchCard}
          onMatchClick={handleMatchClick}
          options={options}
        />
      ) : (
        <SingleEliminationBracket
          matches={matches.map((m) => toLibMatch(m, canEditMatch(m)))}
          matchComponent={BracketMatchCard}
          onMatchClick={handleMatchClick}
          options={options}
        />
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
