"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import api from "@/utils/axios";

import TournamentCard from "@/components/ui/tournaments/TournamentCard";
import { sortTournamentsCompletedLast } from "@/utils/tournamentSort";

const APPROVAL_BADGE = {
  pending: { label: "Pending admin approval", color: "var(--warning-color)" },
  rejected: { label: "Rejected by admin", color: "var(--error-color)" },
};

export default function MyTournaments() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [canCreate, setCanCreate] = useState(false);

  useEffect(() => {
    const fetchMyTournaments = async () => {
      try {
        const res = await api.get("/api/tournaments/my-tournaments");
        setTournaments(res.data.data || []);
      } catch (err) {
        console.error("Failed to fetch your tournaments:", err);
      } finally {
        setLoading(false);
      }
    };

    const checkCreatorAccess = async () => {
      try {
        const res = await api.get("/api/me");
        const user = res.data?.data?.user;
        setCanCreate(!!(user?.role === "admin" || user?.canCreateTournaments));
      } catch (err) {
        console.error("Failed to check creator access:", err);
      }
    };

    fetchMyTournaments();
    checkCreatorAccess();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--accent-color)]"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col items-center gap-4 mb-6 sm:flex-row sm:justify-between">
        <h1
          className="text-4xl font-extrabold text-center sm:text-left"
          style={{ color: "var(--accent-color)" }}
        >
          🏆 My Tournaments
        </h1>
        {canCreate && (
          <Link
            href="/dashboard/create-tournament"
            className="rounded-lg px-4 py-2 font-semibold text-black"
            style={{ background: "var(--accent-color)" }}
          >
            + Create Tournament
          </Link>
        )}
      </div>

      {tournaments.length === 0 ? (
        <div
          className="text-center py-12 rounded-lg"
          style={{ backgroundColor: "var(--card-background)" }}
        >
          <p className="text-gray-400 text-lg">
            You are not assigned to any tournaments yet.
          </p>
          <p className="text-gray-500 text-sm mt-2">
            Contact tournament organizers to get assigned.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {sortTournamentsCompletedLast(tournaments).map((tournament) => {
            const badge = APPROVAL_BADGE[tournament.approvalStatus];
            return (
              <div key={tournament._id} className="space-y-2">
                {badge && (
                  <div className="flex items-center gap-2 text-sm">
                    <span
                      className="rounded-full px-3 py-1 font-semibold text-white"
                      style={{ background: badge.color }}
                    >
                      {badge.label}
                    </span>
                    {tournament.approvalStatus === "rejected" &&
                      tournament.approvalNote && (
                        <span className="text-[var(--muted-foreground)]">
                          {tournament.approvalNote}
                        </span>
                      )}
                  </div>
                )}
                <TournamentCard
                  {...tournament}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  userRole={tournament.userRole}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
