"use client";

import { useRouter } from "next/navigation";
import CreatorGuard from "@/components/gard/creator/CreatorGuard";
import TournamentForm from "@/components/ui/admin/tournament/TournamentForm";

function CreateTournamentPageInner() {
  const router = useRouter();

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--accent-color)]">
          Create a Tournament
        </h1>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          Your submission will be reviewed by an admin before it goes public.
          Once approved, manage games and staff for it from{" "}
          <span className="font-semibold">My Tournaments</span>.
        </p>
      </div>

      <TournamentForm
        onSuccess={() => router.push("/dashboard/my-tournaments")}
        onClose={() => router.push("/dashboard/my-tournaments")}
      />
    </div>
  );
}

export default function CreateTournamentPage() {
  return (
    <CreatorGuard>
      <CreateTournamentPageInner />
    </CreatorGuard>
  );
}
