"use client";
import { useState, useMemo } from "react";
import { Trash2, Pencil, Repeat } from "lucide-react";

import Image from "next/image";
export default function GamesTable({ games, onEdit, onDelete , onDuplicate}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

 console.log(games);

  const filteredGames = useMemo(() => {
    return games.filter((game) =>
      game.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [games, search]);

  const paginatedGames = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredGames.slice(start, start + pageSize);
  }, [filteredGames, page]);

  const totalPages = Math.ceil(filteredGames.length / pageSize);

  return (
    <div className="p-6 rounded shadow-sm">
      <input
        className="w-full mb-4 px-4 py-2 bg-[var(--card-background)] rounded border border-[var(--border-color)] text-[var(--foreground)] focus:outline-none  focus:border-[color:var(--accent-color)]"
        placeholder="Search games by name..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1); // reset to page 1 on new search
        }}
      />

      <div className="overflow-x-auto">
        <table className="w-full text-left border border-[var(--border-color)] rounded overflow-hidden">
          <thead className="bg-[var(--card-background)] text-sm">
            <tr>
              <th className="p-3 border-b border-[var(--border-color)]">#</th>
              <th className="p-3 border-b border-[var(--border-color)]">Game Logo</th>
              <th className="p-3 border-b border-[var(--border-color)]">Game Banner</th>
              <th className="p-3 border-b border-[var(--border-color)]">Name</th>
              <th className="p-3 border-b border-[var(--border-color)]">Host</th>
              <th className="p-3 border-b border-[var(--border-color)]">Platform</th>
              <th className="p-3 border-b border-[var(--border-color)] text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedGames.length > 0 ? (
              paginatedGames.map((game, index) => (
                <tr key={game._id} className="hover:bg-[var(--card-background)] border-b border-[var(--border-color)]">
                  <td className="p-3 text-sm">
                    {(page - 1) * pageSize + index + 1}
                  </td>
                  <td className="p-3 text-sm">
                   <Image src={game.icon} alt={game.name} width={40} height={40} className="rounded" />
                  </td>
                  <td className="p-3 text-sm">
                   <Image src={game.coverImage} alt={game.coverImage} width={40} height={40} className="rounded" />
                  </td>
                  <td className="p-3 text-sm">{game.name}</td>
                  <td className="p-3 text-sm">{game.genre || "N/A"}</td>
                  <td className="p-3 text-sm">{game.platform}</td>
                  <td className="p-2 text-sm text-center space-x-2">
                    <button
                      onClick={() => onEdit(game)}
                      className="text-[color:var(--accent-color)] underline"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => onDelete(game._id)}
                      className="text-red-500 underline"
                    >
                     <Trash2 size={16} />
                    </button>

                      <button
                      onClick={() => onDuplicate(game._id)}
                      className="text-green-500 underline"
                    >
                     <Repeat size={16} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="p-4 text-center text-gray-500">
                  No games found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center mt-4 flex-wrap gap-2">
          <button
            onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
            disabled={page === 1}
            className="px-4 py-1 border rounded border-[var(--border-color)] bg-[var(--card-background)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          <div className="flex gap-2 items-center">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i + 1}
                onClick={() => setPage(i + 1)}
                className={`px-3 py-1 border border-[var(--border-color)] rounded transition-all duration-200 ${
                  page === i + 1
                    ? "bg-[color:var(--accent-color)] text-white font-semibold"
                    : "bg-[var(--card-background)]"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <button
            onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={page === totalPages}
            className="px-4 py-1 border rounded border-[var(--border-color)] bg-[var(--card-background)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
