import { Trash2, Pencil } from "lucide-react";
import { useState, useMemo } from "react";
import GameScheduleBadge from "@/components/ui/tournaments/GameScheduleBadge";
import { compareByScheduledAt } from "@/utils/gameSchedule";

const APPROVAL_COLOR = {
  approved: "text-green-400",
  pending: "text-yellow-300",
  rejected: "text-red-400",
};

export default function TournamentsTable({ tournaments, onEdit, onDelete, onApprove, onReject }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredTournaments = useMemo(() => {
    return tournaments.filter((t) =>
      t.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, tournaments]);

  const totalPages = Math.ceil(filteredTournaments.length / itemsPerPage);

  const currentTournaments = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTournaments.slice(start, start + itemsPerPage);
  }, [currentPage, filteredTournaments]);

  const handlePrev = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNext = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  return (
    <div className="w-full space-y-4">
      {/* Search */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search tournaments..."
          className="p-2 rounded border border-[var(--border-color)] bg-[var(--card-background)] text-white w-full sm:w-64"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-white">
          <thead className="bg-[var(--card-background)]">
            <tr>
              <th className="p-3">Sr No.</th>
              <th className="p-3">Banner</th>
              <th className="p-3">Title</th>
              <th className="p-3">Location</th>
              <th className="p-3">Dates</th>
              <th className="p-3">Status</th>
              <th className="p-3">Approval</th>
              <th className="p-3">Games &amp; Schedule</th>
              <th className="p-3">Entry Fee</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentTournaments.length === 0 ? (
              <tr>
                <td colSpan="10" className="p-4 text-center text-gray-400">
                  No tournaments found.
                </td>
              </tr>
            ) : (
              currentTournaments.map((t, i) => {
                const sortedGames = Array.isArray(t.games)
                  ? [...t.games].sort(compareByScheduledAt)
                  : [];

                return (
                <tr key={t._id} className="border-b border-gray-700">
                  <td className="p-3">
                    {(currentPage - 1) * itemsPerPage + i + 1}
                  </td>
                  <td className="p-3">
                    {t.bannerUrl ? (
                      <img
                        src={t.bannerUrl}
                        alt="banner"
                        className="w-16 h-12 object-cover rounded"
                      />
                    ) : (
                      <div className="w-16 h-12 bg-gray-700 rounded flex items-center justify-center text-xs text-gray-400">
                        No Image
                      </div>
                    )}
                  </td>
                  <td className="p-3">{t.name}</td>
                  <td className="p-3">{t.location}</td>
                  <td className="p-3">
                    {new Date(t.startDate).toLocaleDateString()} -{" "}
                    {new Date(t.endDate).toLocaleDateString()}
                  </td>
                  <td className="p-3 capitalize text-yellow-300">{t.status}</td>

                  <td className="p-3 align-top">
                    <div className="flex flex-col gap-1.5">
                      <span
                        className={`capitalize font-semibold text-xs ${
                          APPROVAL_COLOR[t.approvalStatus] || APPROVAL_COLOR.approved
                        }`}
                      >
                        {t.approvalStatus || "approved"}
                      </span>
                      {t.approvalStatus === "pending" && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => onApprove(t._id)}
                            className="rounded bg-green-600 px-2 py-1 text-xs font-semibold text-white hover:bg-green-700"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => onReject(t._id)}
                            className="rounded bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {t.approvalStatus === "rejected" && t.approvalNote && (
                        <span className="text-xs text-gray-400 max-w-[160px]">
                          {t.approvalNote}
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="p-3 align-top">
                    {sortedGames.length > 0 ? (
                      <div className="flex flex-col gap-1.5">
                        {sortedGames.map((g, i) => (
                          <div
                            key={g._id || i}
                            className="flex min-h-[46px] flex-col gap-1"
                          >
                            <span className="bg-gray-700 text-xs px-2 py-1 rounded self-start">
                              {g.game?.name || g.name || "Unnamed"}
                            </span>
                            <GameScheduleBadge
                              value={g.scheduledAt}
                              variant="inline"
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">No games</span>
                    )}
                  </td>
                   <td className="p-3 align-top">
                    {sortedGames.length > 0 ? (
                      <div className="flex flex-col gap-1.5">
                        {sortedGames.map((g, i) => (
                          // min-height keeps each fee lined up with its
                          // two-line game + schedule block in the column before
                          <span
                            key={g._id || i}
                            className="flex min-h-[46px] items-start text-xs whitespace-nowrap"
                          >
                            ${g.entryFee ?? 0}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">No entryFee</span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => onEdit(t)}
                        className="text-blue-400 hover:underline cursor-pointer"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => onDelete(t._id)}
                        className="text-red-500 hover:underline cursor-pointer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-2">
          <button
            onClick={handlePrev}
            disabled={currentPage === 1}
            className="px-3 py-1 rounded bg-gray-700 disabled:opacity-50"
          >
            Prev
          </button>
          <span className="text-sm text-white">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={handleNext}
            disabled={currentPage === totalPages}
            className="px-3 py-1 rounded bg-gray-700 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
