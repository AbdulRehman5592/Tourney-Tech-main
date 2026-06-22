import { Trash2, Pencil } from "lucide-react";
import { useState, useMemo } from "react";

export default function TournamentsTable({ tournaments, onEdit, onDelete }) {
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
              <th className="p-3">Banner</th>
              <th className="p-3">Title</th>
              <th className="p-3">Location</th>
              <th className="p-3">Dates</th>
              <th className="p-3">Status</th>
              <th className="p-3">Games</th>
              <th className="p-3">Entry Fee</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentTournaments.length === 0 ? (
              <tr>
                <td colSpan="8" className="p-4 text-center text-gray-400">
                  No tournaments found.
                </td>
              </tr>
            ) : (
              currentTournaments.map((t) => (
                <tr key={t._id} className="border-b border-gray-700">
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
                
                  <td className="p-3">
                    {Array.isArray(t.games) && t.games.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {t.games.map((g, i) => (
                          <span
                            key={i}
                            className="bg-gray-700 text-xs px-2 py-1 rounded"
                          >
                            {g.game?.name || g.name || "Unnamed"}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">No games</span>
                    )}
                  </td>
                   <td className="p-3">
                    {Array.isArray(t.games) && t.games.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {t.games.map((g, i) => (
                          <span
                            key={i}
                            className="text-xs px-2 py-1 rounded"
                          >
                            {g.entryFee?.entryFee || g.entryFee || "Unnamed"}
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
              ))
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
