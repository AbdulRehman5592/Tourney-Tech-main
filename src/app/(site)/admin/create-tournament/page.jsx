"use client";

import { useEffect, useRef, useState } from "react";
import api from "@/utils/axios";
import TournamentForm from "@/components/ui/admin/tournament/TournamentForm";
import TournamentsTable from "@/components/ui/admin/tournament/TournamentsTable";

import { toast } from "react-hot-toast";

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editTournament, setEditTournament] = useState(null);
  const formRef = useRef(null);

  // The form renders ABOVE the tournaments table, so clicking "Edit" on a
  // row further down the page opened it off-screen with no visual cue --
  // scroll it into view whenever it opens (add or edit) so it's obvious
  // something happened.
  useEffect(() => {
    if (showForm) {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [showForm, editTournament]);

  const fetchTournaments = async () => {
    try {
      const res = await api.get("/api/tournaments?includeDrafts=true");
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

  const handleApprove = async (id) => {
    try {
      await api.patch(`/api/tournaments/${id}`, { approvalStatus: "approved" });
      toast.success("Tournament approved -- now visible to everyone");
      fetchTournaments();
    } catch (err) {
      console.error("Approve failed", err);
      toast.error(err.response?.data?.message || "Failed to approve tournament");
    }
  };

  const handleReject = async (id) => {
    const approvalNote = window.prompt("Reason for rejecting this tournament (optional):") || "";
    try {
      await api.patch(`/api/tournaments/${id}`, { approvalStatus: "rejected", approvalNote });
      toast.success("Tournament rejected");
      fetchTournaments();
    } catch (err) {
      console.error("Reject failed", err);
      toast.error(err.response?.data?.message || "Failed to reject tournament");
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
          <div ref={formRef}>
            <TournamentForm
              initialData={editTournament}
              onSuccess={fetchTournaments}
              onClose={() => setShowForm(false)}
            />
          </div>
        )}

        <div className="mt-6">
          <TournamentsTable
            tournaments={tournaments}
            onEdit={(t) => {
              setEditTournament(t);
              setShowForm(true);
            }}
            onDelete={handleDelete}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        </div>
      </div>
    </div>
  );
}
