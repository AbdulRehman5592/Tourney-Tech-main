"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import api from "@/utils/axios";
import { ExternalLink } from "lucide-react";
import { formatGameConfigLabel } from "@/utils/gameConfigLabel";
import { useWorkspaceTournament } from "../layout";

const FORMAT_LABEL = {
  single_elimination: "Single Elimination",
  double_elimination: "Double Elimination",
  round_robin: "Round Robin",
  mesh: "Mesh",
  standard: "Standard Rotation",
};

const STATUS_STYLE = {
  not_generated: { label: "Not Generated", bg: "color-mix(in srgb, var(--muted-foreground) 14%, transparent)", color: "var(--muted-foreground)" },
  generated: { label: "Bracket Generated", bg: "color-mix(in srgb, var(--accent-color) 14%, transparent)", color: "var(--accent-color)" },
  in_progress: { label: "Round 1 In Progress", bg: "color-mix(in srgb, var(--info-color) 14%, transparent)", color: "var(--info-color)" },
  completed: { label: "Complete", bg: "color-mix(in srgb, var(--success-color) 14%, transparent)", color: "var(--success-color)" },
};

export default function TournamentBracketsTab() {
  const { tournament, tournamentId } = useWorkspaceTournament();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [teamCounts, setTeamCounts] = useState({});

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [matchRes, teamRes] = await Promise.all([
          api.get(`/api/matches?tournamentId=${tournamentId}`),
          api.get(`/api/team?tournament=${tournamentId}`),
        ]);
        setMatches(matchRes.data?.data || []);
        const counts = {};
        (teamRes.data?.data || []).forEach((t) => {
          counts[t.gameConfigId] = (counts[t.gameConfigId] || 0) + 1;
        });
        setTeamCounts(counts);
      } catch (error) {
        console.error("Failed to load brackets:", error);
        toast.error("Failed to load brackets");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [tournamentId]);

  const rows = useMemo(() => {
    const games = tournament.games || [];
    return games.map((g) => {
      const gameMatches = matches.filter((m) => String(m.gameConfigId) === String(g._id));
      const hasCompleted = gameMatches.some((m) => m.status === "completed");

      let statusKey = "not_generated";
      if (g.round1Status === "completed") statusKey = "completed";
      else if (g.round1Status && g.round1Status !== "pending") statusKey = hasCompleted ? "in_progress" : "generated";

      return {
        gameConfigId: g._id,
        label: formatGameConfigLabel(g),
        format: FORMAT_LABEL[g.format] || g.format,
        teamCount: teamCounts[g._id] || 0,
        statusKey,
      };
    });
  }, [tournament.games, matches, teamCounts]);

  if (loading) {
    return (
      <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--card-background)] p-8 text-center text-muted-foreground">
        Loading brackets...
      </div>
    );
  }

  return (
    <div>
      <p className="mb-3 text-sm text-muted-foreground">{rows.length} scheduled games</p>
      <div className="flex flex-col gap-2.5">
        {rows.map((row) => {
          const style = STATUS_STYLE[row.statusKey];
          return (
            <div
              key={row.gameConfigId}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--card-background)] px-5 py-4"
            >
              <div className="min-w-0">
                <p className="font-semibold text-foreground">{row.label}</p>
                <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{row.format}</span>
                  <span className="h-1 w-1 rounded-full bg-[var(--border-color)]" />
                  <span>{row.teamCount} teams</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span
                  className="whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold"
                  style={{ background: style.bg, color: style.color }}
                >
                  {style.label}
                </span>
                <Link
                  href={`/dashboard/game-play/${tournamentId}/matches-overview/${row.gameConfigId}`}
                  className="flex items-center gap-1.5 rounded-lg border border-[var(--border-color)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] hover:border-[var(--accent-color)]"
                >
                  View Bracket
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
