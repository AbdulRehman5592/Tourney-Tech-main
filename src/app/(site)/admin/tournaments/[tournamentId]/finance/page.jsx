"use client";

import FinanceView from "@/components/ui/admin/finance/FinanceView";
import { useWorkspaceTournament } from "../layout";

export default function TournamentFinanceTab() {
  const { tournamentId } = useWorkspaceTournament();
  return <FinanceView tournamentId={tournamentId} />;
}
