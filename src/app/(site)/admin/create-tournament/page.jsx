"use client";

import { useEffect, useState } from "react";
import api from "@/utils/axios";
import TournamentForm from "@/components/ui/admin/tournament/TournamentForm";
import TournamentsTable from "@/components/ui/admin/tournament/TournamentsTable";

import { toast } from "react-hot-toast";

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editTournament, setEditTournament] = useState(null);

  const fetchTournaments = async () => {
    try {
      const res = await api.get("/api/tournaments");
      setTournaments(res.data.data);
    } catch (err) {
      console.error("Failed to load tournaments", err);
    }
  };

  useEffect(() => {
    fetchTournaments();
  }, []);

  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/tournaments/${id}`);
      toast.success("Tournament Deleted Successfully");
      fetchTournaments();
    } catch (err) {
      console.error("Delete failed", err);
      toast.error("Error deleting tournament");
    }
  };

  return (
    <div className="">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-[var(--accent-color)]">
            Tournaments
          </h1>
          <button
            className="bg-[var(--accent-color)] hover:opacity-90 text-[var(--background)] px-4 py-2 rounded"
            onClick={() => {
              setEditTournament(null);
              setShowForm((prev) => !prev);
            }}
          >
            {showForm ? "Close" : "Add Tournament"}
          </button>
        </div>

        {showForm && (
          <TournamentForm
            initialData={editTournament}
            onSuccess={fetchTournaments}
            onClose={() => setShowForm(false)}
          />
        )}

        <div className="mt-6">
          <TournamentsTable
            tournaments={tournaments}
            onEdit={(t) => {
              setEditTournament(t);
              setShowForm(true);
            }}
            onDelete={handleDelete}
          />
        </div>
      </div>
    </div>
  );
}
