"use client";

import {
  SingleEliminationBracket,
  SVGViewer,
  Match,
  createTheme,
} from "@g-loot/react-tournament-brackets";
import { useEffect, useState, useRef } from "react";
import EditMatchModal from "./EditMatchesModel";

export default function RoundTwoBracket({ matches = [], teams = [] }) {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [theme, setTheme] = useState(createTheme({}));
  const [editingMatch, setEditingMatch] = useState(null);
  const [mappedMatches, setMappedMatches] = useState([]);

  // 🔹 Format match for bracket display
  const formatMatch = (m) => {
    const winnerId =
      typeof m.winner === "object" ? m.winner?._id : m.winner || null;

    const roundText =
      m.stage === "semi_final"
        ? "Semi Final"
        : m.stage === "final"
        ? "Final"
        : m.stage === "qualifier"
        ? "Qualifier"
        : `Round ${m.round}`;

    return {
      id: m._id,
      name: roundText,
      nextMatchId: m.nextMatchId || null,
      tournamentRoundText: roundText,
      state: m.status === "completed" ? "DONE" : "PENDING",
      participants: [
        {
          id: m.teamA?._id || `TBD-${m._id}-A`,
          name: `${m.teamA?.serialNo ?? ""} ${m.teamA?.name ?? "TBD"}`.trim(),
          isWinner: winnerId === m.teamA?._id,
          resultText: `${m.teamAScore ?? 0}`,
          originalTeam: m.teamA || null, // ✅ keep full team
        },
        {
          id: m.teamB?._id || `TBD-${m._id}-B`,
          name: `${m.teamB?.serialNo ?? ""} ${m.teamB?.name ?? "TBD"}`.trim(),
          isWinner: winnerId === m.teamB?._id,
          resultText: `${m.teamBScore ?? 0}`,
          originalTeam: m.teamB || null, // ✅ keep full team
        },
      ],
      original: m,
    };
  };

  // 🔹 Generate bracket dynamically
  const generateBracket = (matches) => {
    if (!matches.length) return [];

    const allMatches = [...matches];
    const rounds = {};

    matches.forEach((m) => {
      if (!rounds[m.round]) rounds[m.round] = [];
      rounds[m.round].push(m);
    });

    let currentRound = Math.max(...matches.map((m) => m.round));

    while (rounds[currentRound] && rounds[currentRound].length > 1) {
      const nextRound = currentRound + 1;
      rounds[nextRound] = rounds[nextRound] || [];

      for (let i = 0; i < Math.ceil(rounds[currentRound].length / 2); i++) {
        const matchA = rounds[currentRound][i * 2];
        const matchB = rounds[currentRound][i * 2 + 1];

        if (!matchA) continue;

        let existing = matches.find(
          (m) =>
            m.round === nextRound &&
            (m._id === matchA.nextMatchId || m._id === matchB?.nextMatchId)
        );

        if (!existing) {
          existing = matches.find((m) => m.round === nextRound);
        }

        if (!existing) {
          existing = {
            _id: `placeholder-${nextRound}-${i}`,
            round: nextRound,
            stage:
              rounds[currentRound][0].stage === "qualifier"
                ? "semi_final"
                : rounds[currentRound][0].stage === "semi_final"
                ? "final"
                : "final",
            teamA: null,
            teamB: null,
            status: "pending",
            teamAScore: 0,
            teamBScore: 0,
            nextMatchId: null,
          };
          allMatches.push(existing);
        }

        if (!rounds[nextRound].some((m) => m._id === existing._id)) {
          rounds[nextRound].push(existing);
        }

        if (matchA) matchA.nextMatchId = existing._id;
        if (matchB) matchB.nextMatchId = existing._id;

        // 🔹 Propagate winner with full team details (not just "Winner")
        if (existing._id.toString().startsWith("placeholder")) {
          if (matchA?.winner && matchA.teamA && matchA.winner === matchA.teamA._id) {
            if (!existing.teamA) existing.teamA = matchA.teamA;
            else if (!existing.teamB) existing.teamB = matchA.teamA;
          }
          if (matchA?.winner && matchA.teamB && matchA.winner === matchA.teamB._id) {
            if (!existing.teamA) existing.teamA = matchA.teamB;
            else if (!existing.teamB) existing.teamB = matchA.teamB;
          }

          if (matchB?.winner && matchB.teamA && matchB.winner === matchB.teamA._id) {
            if (!existing.teamA) existing.teamA = matchB.teamA;
            else if (!existing.teamB) existing.teamB = matchB.teamA;
          }
          if (matchB?.winner && matchB.teamB && matchB.winner === matchB.teamB._id) {
            if (!existing.teamA) existing.teamA = matchB.teamB;
            else if (!existing.teamB) existing.teamB = matchB.teamB;
          }
        }
      }

      currentRound = nextRound;
    }

    return allMatches;
  };

  // 🔹 Theme setup
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: window.innerHeight - 150,
        });
      }
      setTheme(
        createTheme({
          textColor: { main: "#ededed", highlighted: "#ffffff", dark: "#cccccc" },
          matchBackground: { wonColor: "#101828", lostColor: "#1f2937" },
          score: {
            background: { wonColor: "#FBBF24", lostColor: "rgba(251, 191, 36, 0.1)" },
            text: { highlightedWonColor: "#ffffff", highlightedLostColor: "#999999" },
          },
          border: { color: "#364153", highlightedColor: "#FBBF24" },
          roundHeader: { backgroundColor: "#FBBF24", fontColor: "#030712" },
          connectorColor: "#364153",
          connectorColorHighlight: "#FBBF24",
          svgBackground: "#030712",
        })
      );
    };
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // 🔹 Build bracket whenever matches change
  useEffect(() => {
    const fullBracket = generateBracket(matches);
    setMappedMatches(fullBracket.map(formatMatch));
  }, [matches]);

  // 🔹 Local save updates only placeholders
const handleSave = async (id, data) => {
  const match = mappedMatches.find((m) => m.id === id);

  // 🚫 Skip backend for placeholders
  if (id.toString().startsWith("placeholder")) {
    setMappedMatches((prev) =>
      prev.map((m) =>
        m.id === id
          ? {
              ...m,
              participants: [
                {
                  ...m.participants[0],
                  resultText: data.teamAScore,
                  isWinner: data.winner === m.participants[0].id,
                },
                {
                  ...m.participants[1],
                  resultText: data.teamBScore,
                  isWinner: data.winner === m.participants[1].id,
                },
              ],
              state: data.winner ? "DONE" : "PENDING",
            }
          : m
      )
    );
    setEditingMatch(null);
    return;
  }

  // ✅ Real matches → backend update with full payload
  try {
    const payload = {
      matchNumber: match.original.matchNumber,
      teamAScore: Number(data.teamAScore),
      teamBScore: Number(data.teamBScore),
      teamAtotalWon: Number(data.teamAtotalWon ?? 0),
      teamBtotalWon: Number(data.teamBtotalWon ?? 0),
    };

    const res = await api.patch(`/api/matches/${id}`, payload);

    // Update local UI
    setMappedMatches((prev) =>
      prev.map((m) =>
        m.id === id
          ? {
              ...m,
              participants: [
                {
                  ...m.participants[0],
                  resultText: payload.teamAScore,
                  isWinner: res.data?.data?.winner === m.participants[0].id,
                },
                {
                  ...m.participants[1],
                  resultText: payload.teamBScore,
                  isWinner: res.data?.data?.winner === m.participants[1].id,
                },
              ],
              state: res.data?.data?.status === "completed" ? "DONE" : "PENDING",
            }
          : m
      )
    );
  } catch (err) {
    console.error("Update match failed:", err);
  }

  setEditingMatch(null);
};



  return (
    <div ref={containerRef} className="w-full overflow-auto scrollbar-x">
      {mappedMatches.length ? (
        <SingleEliminationBracket
          matches={mappedMatches}
          matchComponent={(props) => (
            <div onClick={() => setEditingMatch(props.match)}>
              <Match {...props} />
            </div>
          )}
          theme={theme}
          svgWrapper={({ children, ...props }) => (
            <SVGViewer
              background={theme.svgBackground}
              SVGBackground={theme.svgBackground}
              width={dimensions.width}
              height={dimensions.height}
              {...props}
            >
              {children}
            </SVGViewer>
          )}
        />
      ) : (
        <p className="text-center text-gray-400 p-6">No matches available</p>
      )}

      <EditMatchModal
        isOpen={!!editingMatch}
        match={editingMatch?.original || editingMatch}
        teams={teams}
        onClose={() => setEditingMatch(null)}
        onSave={handleSave}
      />
    </div>
  );
}
