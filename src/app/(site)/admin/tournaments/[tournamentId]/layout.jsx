"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import { toast } from "react-hot-toast";
import api from "@/utils/axios";
import { ArrowLeft } from "lucide-react";

const WorkspaceContext = createContext(null);

// Shared per-tournament data for every tab (Overview/Players/Teams/Brackets)
// -- fetched once here instead of once per tab, and exposed via `refetch`
// so an action on one tab (e.g. moving a player's game) can refresh the
// tournament doc other tabs depend on (round1Status, entry fees, etc.).
export function useWorkspaceTournament() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useWorkspaceTournament must be used within the tournament workspace layout");
  }
  return ctx;
}

const TABS = [
  { href: "", label: "Overview" },
  { href: "/players", label: "Players" },
  { href: "/teams", label: "Teams" },
  { href: "/brackets", label: "Brackets" },
  { href: "/finance", label: "Finance" },
];

const STATUS_STYLE = {
  upcoming: { bg: "color-mix(in srgb, var(--info-color) 14%, transparent)", color: "var(--info-color)" },
  registration_closed: { bg: "color-mix(in srgb, var(--warning-color) 14%, transparent)", color: "var(--warning-color)" },
  ongoing: { bg: "color-mix(in srgb, var(--success-color) 14%, transparent)", color: "var(--success-color)" },
  completed: { bg: "color-mix(in srgb, var(--muted-foreground) 14%, transparent)", color: "var(--muted-foreground)" },
  draft: { bg: "color-mix(in srgb, var(--muted-foreground) 14%, transparent)", color: "var(--muted-foreground)" },
};

export default function TournamentWorkspaceLayout({ children }) {
  const { tournamentId } = useParams();
  const pathname = usePathname();
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    try {
      const res = await api.get(`/api/tournaments/${tournamentId}`);
      setTournament(res.data?.data || res.data);
    } catch (error) {
      console.error("Failed to load tournament:", error);
      toast.error("Failed to load tournament");
    }
  }, [tournamentId]);

  useEffect(() => {
    setLoading(true);
    refetch().finally(() => setLoading(false));
  }, [refetch]);

  const basePath = `/admin/tournaments/${tournamentId}`;
  const statusStyle = STATUS_STYLE[tournament?.status] || STATUS_STYLE.draft;

  return (
    <div className="space-y-6">
      <Link
        href="/admin/tournaments"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-[var(--accent-color)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All Tournaments
      </Link>

      {loading || !tournament ? (
        <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--card-background)] p-8 text-center text-muted-foreground">
          Loading tournament...
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold text-foreground">{tournament.name}</h1>
                <span
                  className="rounded-full px-2.5 py-1 text-xs font-semibold"
                  style={{ background: statusStyle.bg, color: statusStyle.color }}
                >
                  {tournament.status}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {tournament.location} &bull; {new Date(tournament.startDate).toLocaleDateString()} -{" "}
                {new Date(tournament.endDate).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 border-b border-[var(--border-color)]">
            {TABS.map((tab) => {
              const href = `${basePath}${tab.href}`;
              const isActive = pathname === href || (tab.href === "" && pathname === basePath);
              return (
                <Link
                  key={tab.href}
                  href={href}
                  className={`pb-3 text-sm ${
                    isActive
                      ? "border-b-2 border-[var(--accent-color)] font-semibold text-[var(--accent-color)]"
                      : "border-b-2 border-transparent font-medium text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>

          <WorkspaceContext.Provider value={{ tournament, tournamentId, loading, refetch }}>
            {children}
          </WorkspaceContext.Provider>
        </>
      )}
    </div>
  );
}
