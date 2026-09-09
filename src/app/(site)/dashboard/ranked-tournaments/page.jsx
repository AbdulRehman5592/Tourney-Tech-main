"use client";

import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import api from "@/utils/axios";
import TourneyTechStaffGuard from "@/components/gard/staff/TourneyTechStaffGuard";

const FORMAT_LABELS = {
  round_robin: "Round Robin",
  mesh: "Mesh",
  standard: "Standard",
  single_elimination: "Single Elim.",
  double_elimination: "Double Elim.",
};

// Formats with placement (1st-4th) logic already built -- see
// STANDINGS_ELIGIBLE_FORMATS in tournamentBracket.js. Shown here only as a
// heads-up; the checkbox works for every format regardless.
const SCORES_TODAY = new Set(["round_robin", "mesh", "standard"]);

function RankedTournamentsPageInner() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [search, setSearch] = useState("");

  const fetchTournaments = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/api/tournaments");
      setTournaments(data?.data || []);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load tournaments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTournaments();
  }, []);

  const handleToggle = async (tournament, nationallyRanked) => {
    setUpdatingId(tournament._id);
    try {
      await api.patch(`/api/tournaments/${tournament._id}/ranked`, { nationallyRanked });
      toast.success(
        nationallyRanked
          ? `"${tournament.name}" now counts toward national rankings`
          : `"${tournament.name}" excluded from national rankings`
      );
      setTournaments((prev) =>
        prev.map((t) => (t._id === tournament._id ? { ...t, nationallyRanked } : t))
      );
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update");
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = tournaments.filter((t) =>
    t.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">National Ranking Eligibility</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Choose which tournaments count toward National Rankings. This is independent of
          format -- any tournament can be included or excluded, regardless of bracket or
          rotation type.
        </p>
      </div>

      <input
        type="text"
        placeholder="Search tournaments..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full sm:w-80 px-3 py-2 rounded-lg bg-[var(--secondary-color)] border border-[var(--border-color)]"
      />

      {loading ? (
        <p className="text-[var(--muted-foreground)]">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-[var(--muted-foreground)]">No tournaments found.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[var(--border-color)]">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-[var(--secondary-color)]">
                <th className="px-4 py-3 text-left font-semibold border-b border-[var(--border-color)]">Tournament</th>
                <th className="px-4 py-3 text-left font-semibold border-b border-[var(--border-color)]">Status</th>
                <th className="px-4 py-3 text-left font-semibold border-b border-[var(--border-color)]">Games / Formats</th>
                <th className="px-4 py-3 text-left font-semibold border-b border-[var(--border-color)]">Start Date</th>
                <th className="px-4 py-3 text-center font-semibold border-b border-[var(--border-color)]">Nationally Ranked</th>
              </tr>
            </thead>
            <tbody style={{ backgroundColor: "var(--card-background)" }}>
              {filtered.map((t) => {
                const hasScorableFormat = (t.games || []).some((g) => SCORES_TODAY.has(g.format));
                return (
                  <tr key={t._id} className="border-b border-[var(--border-color)]">
                    <td className="px-4 py-2.5 font-medium">{t.name}</td>
                    <td className="px-4 py-2.5 capitalize">{t.status}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {(t.games || []).map((g, i) => (
                          <span
                            key={i}
                            className="text-xs px-2 py-0.5 rounded-full border border-[var(--border-color)]"
                            style={{ backgroundColor: "var(--secondary-color)" }}
                          >
                            {g.eventTitle || g.game?.name || "Unknown"} &middot; {FORMAT_LABELS[g.format] || g.format}
                          </span>
                        ))}
                        {!t.games?.length && (
                          <span className="text-xs text-[var(--muted-foreground)]">No games yet</span>
                        )}
                      </div>
                      {t.nationallyRanked && !hasScorableFormat && t.games?.length > 0 && (
                        <p className="text-xs mt-1 text-[var(--warning-color)]">
                          Marked ranked, but no format here can score points yet.
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {t.startDate ? new Date(t.startDate).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <input
                        type="checkbox"
                        checked={!!t.nationallyRanked}
                        disabled={updatingId === t._id}
                        onChange={(e) => handleToggle(t, e.target.checked)}
                        className="h-4 w-4 accent-[var(--accent-color)] disabled:opacity-50"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function RankedTournamentsPage() {
  return (
    <TourneyTechStaffGuard>
      <RankedTournamentsPageInner />
    </TourneyTechStaffGuard>
  );
}
