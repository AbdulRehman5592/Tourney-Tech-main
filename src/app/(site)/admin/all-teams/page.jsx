"use client";

import { useEffect, useState } from "react";
import api from "@/utils/axios"; // Axios instance
import { toast } from "react-hot-toast";
import EditTeamForm from "@/components/ui/admin/team/EditTeamForm";
import { Trash2, Pencil } from "lucide-react";

export default function AdminTeamsTable() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");

  const [editingTeam, setEditingTeam] = useState(null); // ✅ store the selected team ID

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/api/team");
      setTeams(data.data || []);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to fetch teams");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Delete team with toast confirmation
  const handleDeleteTeam = (id) => {
    toast(
      (t) => (
        <div className="flex flex-col space-y-2">
          <p className="text-sm">Are you sure you want to delete this team?</p>
          <div className="flex space-x-2">
            <button
              onClick={async () => {
                try {
                  const { data } = await api.delete(`/api/team/${id}`);
                  toast.success(data.message || "Team deleted");
                  fetchTeams();
                } catch (error) {
                  toast.error(error?.response?.data?.message || "Delete failed");
                } finally {
                  toast.dismiss(t.id);
                }
              }}
              className="px-3 py-1 bg-red-600 text-white rounded"
            >
              Yes, Delete
            </button>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="px-3 py-1 bg-gray-500 text-white rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      ),
      { duration: 4000 }
    );
  };

  // ✅ Search filter
  const filteredTeams = teams.filter((team) => {
    const term = searchTerm.toLowerCase();
    const teamName = team.name?.toLowerCase() || "";
    const tournamentName = team.tournament?.name?.toLowerCase() || "";
    const gameName = team.game?.name?.toLowerCase() || "";
    const memberNames =
      team.members?.map((m) => m.username.toLowerCase()).join(", ") || "";
    return (
      teamName.includes(term) ||
      tournamentName.includes(term) ||
      gameName.includes(term) ||
      memberNames.includes(term)
    );
  });

  // ✅ Pagination
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentTeams =
    rowsPerPage === "all"
      ? filteredTeams
      : filteredTeams.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages =
    rowsPerPage === "all" ? 1 : Math.ceil(filteredTeams.length / rowsPerPage);

  return (
    <div className="p-4 w-full">
      <h2 className="text-2xl font-bold mb-4">All Teams</h2>

      {/* Search + Sort Row */}
      <div className="mb-4 flex flex-col sm:flex-row justify-between gap-2">
        <input
          type="text"
          placeholder="Search by team, tournament, game, or member..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full sm:w-2/3 p-2 rounded border border-[var(--border-color)] bg-[var(--card-background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-accent-color"
        />

        {/* ✅ Rows per page select */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-[var(--foreground)]">Show:</label>
          <select
            value={rowsPerPage}
            onChange={(e) => {
              const value = e.target.value === "all" ? "all" : Number(e.target.value);
              setRowsPerPage(value);
              setCurrentPage(1);
            }}
            className="p-2 w-full rounded border border-[var(--border-color)] bg-[var(--card-background)] text-[var(--foreground)]"
          >
            <option value={10}>10</option>
            <option value={30}>30</option>
            <option value={50}>50</option>
            <option value="all">All</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-400">Loading...</div>
      ) : (
        <div className="overflow-x-auto scrollbar rounded-lg border border-[var(--border-color)]">
          <table className="min-w-full border-collapse">
            <thead className="bg-[var(--secondary-color)] text-[var(--foreground)]">
              <tr>
                <th className="py-2 px-4 text-left font-semibold border-b border-[var(--border-color)]">
                  Sr No.
                </th>
                <th className="py-2 px-4 text-left font-semibold border-b border-[var(--border-color)]">
                  Name
                </th>
                <th className="py-2 px-4 text-left font-semibold border-b border-[var(--border-color)]">
                  Tournament
                </th>
                <th className="py-2 px-4 text-left font-semibold border-b border-[var(--border-color)]">
                  Game
                </th>
                <th className="py-2 px-4 text-left font-semibold border-b border-[var(--border-color)]">
                  Members
                </th>
                <th className="py-2 px-4 text-left font-semibold border-b border-[var(--border-color)]">
                  Team Leader
                </th>
                  <th className="py-2 px-4 text-left font-semibold border-b border-[var(--border-color)]">
                  Created At
                </th>
                <th className="py-2 px-4 text-center font-semibold border-b border-[var(--border-color)]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-[var(--card-background)] text-[var(--foreground)]">
              {currentTeams.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-4 text-gray-400">
                    No teams found
                  </td>
                </tr>
              ) : (
                currentTeams.map((team) => (
                  <tr
                    key={team._id}
                    className="hover:bg-[var(--secondary-hover)] transition-colors"
                  >
                    <td className="py-2 px-4 border-b border-[var(--border-color)]">
                      {team.serialNo}
                    </td>
                    <td className="py-2 px-4 border-b border-[var(--border-color)]">
                      {team.name}
                    </td>
                    <td className="py-2 px-4 border-b border-[var(--border-color)]">
                      {team.tournament?.name || "N/A"}
                    </td>
                    <td className="py-2 px-4 border-b border-[var(--border-color)]">
                      {team?.game?.name || "N/A"}
                    </td>
                    <td className="py-2 px-4 border-b border-[var(--border-color)]">
                      {team.members?.map((m) => m.username).join(", ")}
                    </td>
                    <td className="py-2 px-4 border-b border-[var(--border-color)]">
                      {team.createdBy
                        ? `${team.createdBy.firstname} ${team.createdBy.lastname}`
                        : "N/A"}
                    </td>
                    <td className="py-2 px-4 border-b border-[var(--border-color)]">
                      {new Date(team.createdAt).toLocaleString()}
                    </td>
                    <td className="py-2 px-4 border-b border-[var(--border-color)] text-center space-x-2">
                      <button
                        onClick={() => setEditingTeam(team._id)}
                        className="text-[color:var(--accent-color)] underline"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteTeam(team._id)}
                        className="text-red-500 underline"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && rowsPerPage !== "all" && (
            <div className="flex justify-center items-center mt-4 space-x-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded bg-secondary-color hover:bg-secondary-hover disabled:opacity-50"
              >
                Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1 rounded ${
                    page === currentPage
                      ? "bg-primary-color text-foreground"
                      : "bg-secondary-color hover:bg-secondary-hover"
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(p + 1, totalPages))
                }
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded bg-secondary-color hover:bg-secondary-hover disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* ✅ Edit Popup */}
      {editingTeam && (
        <EditTeamForm
          team={teams.find((t) => t._id === editingTeam)}
          onClose={() => setEditingTeam(null)}
          onUpdated={fetchTeams}
        />
      )}
    </div>
  );
}
