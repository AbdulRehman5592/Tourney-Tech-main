"use client";
import { useEffect, useMemo, useState } from "react";
import api from "@/utils/axios";
import { toast } from "react-hot-toast";
import * as XLSX from "xlsx";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
} from "@tanstack/react-table";

export default function AllRegisteredPlayers() {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState([]);

  const fetchRegistrations = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/tournamentRegister/fetch-all-users");
      setRegistrations(res.data?.data || []);
    } catch (err) {
      console.error("❌ Failed to fetch registrations:", err);
      toast.error("Failed to fetch registrations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistrations();
  }, []);

  const columns = useMemo(
    () => [
      { header: "Sr No.", cell: ({ row }) => row.index + 1, enableSorting: false, enableColumnFilter: false },
      {
        header: "User",
        id: "user",
        accessorFn: (row) => `${row.user?.firstname || ""} ${row.user?.lastname || ""}`.trim(),
        cell: ({ getValue, row }) => {
          const status = row.original.gameRegistrationDetails?.status;
          const color =
            status === "approved"
              ? "var(--success-color)"
              : status === "rejected"
              ? "var(--warning-color)"
              : "var(--error-color)";
          return (
            <span className="font-semibold" style={{ color }}>
              {getValue()}
            </span>
          );
        },
      },
      {
        header: "Email",
        id: "email",
        accessorFn: (row) => row.user?.email || "",
      },
      {
        header: "Tournament",
        id: "tournament",
        accessorFn: (row) => row.tournament?.name || "",
      },
      {
        header: "Games",
        id: "games",
        accessorFn: (row) =>
          row.gameRegistrationDetails?.games
            ?.map((g) => {
              const match = row.tournament?.games?.find(
                (tg) => tg._id === g._id || tg.game === g._id
              );
              return match?.eventTitle || g.name;
            })
            .join(", ") || "",
        cell: ({ getValue }) =>
          getValue() ? (
            getValue()
              .split(", ")
              .map((name, i) => (
                <span
                  key={i}
                  className="mr-1 mb-1 inline-block px-2 py-1 rounded-lg bg-[var(--secondary-hover)] text-sm"
                >
                  {name}
                </span>
              ))
          ) : (
            <span className="text-sm opacity-70">No games</span>
          ),
      },
      {
        header: "Registered At",
        id: "registeredAt",
        accessorFn: (row) => row.createdAt,
        cell: ({ getValue }) => (getValue() ? new Date(getValue()).toLocaleString() : "-"),
      },
    ],
    []
  );

  const table = useReactTable({
    data: registrations,
    columns,
    state: { globalFilter, columnFilters },
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 30 } },
  });

  const handlePageSizeChange = (e) => {
    const value = e.target.value;
    table.setPageSize(value === "all" ? registrations.length || 30 : Number(value));
  };

  const handleExport = () => {
    const rows = table.getFilteredRowModel().rows.map((row) => {
      const r = row.original;
      return {
        "Sr No.": row.index + 1,
        User: `${r.user?.firstname || ""} ${r.user?.lastname || ""}`.trim(),
        Email: r.user?.email || "",
        Tournament: r.tournament?.name || "",
        Games:
          r.gameRegistrationDetails?.games
            ?.map((g) => {
              const match = r.tournament?.games?.find(
                (tg) => tg._id === g._id || tg.game === g._id
              );
              return match?.eventTitle || g.name;
            })
            .join(", ") || "No games",
        "Registered At": r.createdAt ? new Date(r.createdAt).toLocaleString() : "-",
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Registered Users");
    XLSX.writeFile(workbook, `registered-users-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  if (loading)
    return <p className="text-center mt-10 text-white">Loading registrations...</p>;

  if (!registrations.length)
    return <p className="opacity-70 text-center mt-10 text-sm">No registrations found</p>;

  return (
    <div className="min-h-screen p-6 bg-[var(--background)] text-[var(--foreground)]">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold">Registered Users</h1>
        <button
          onClick={handleExport}
          className="px-4 py-2 rounded-lg font-semibold transition hover:scale-[1.02]"
          style={{ backgroundColor: "var(--success-color)", color: "white" }}
        >
          Export to Excel
        </button>
      </div>

      {/* Search + Rows per page */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-3">
        <input
          type="text"
          placeholder="Search by user, email, or tournament"
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="p-2 rounded border border-[var(--border-color)] bg-[var(--card-background)] text-white w-full sm:w-64"
        />

        <div className="flex items-center gap-2">
          <label htmlFor="rowsPerPage" className="text-sm">
            Rows per page:
          </label>
          <select
            id="rowsPerPage"
            value={
              table.getState().pagination.pageSize >= registrations.length
                ? "all"
                : table.getState().pagination.pageSize
            }
            onChange={handlePageSizeChange}
            className="p-2 rounded border border-[var(--border-color)] bg-[var(--card-background)]"
          >
            <option value={10}>10</option>
            <option value={30}>30</option>
            <option value={50}>50</option>
            <option value="all">All</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto scrollbar rounded-lg border border-[var(--border-color)]">
        <table className="min-w-full border-collapse">
          <thead className="bg-[var(--secondary-color)] text-[var(--foreground)]">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="py-2 px-4 text-left text-sm font-semibold border-b border-[var(--border-color)]"
                  >
                    <div
                      onClick={header.column.getToggleSortingHandler()}
                      className={`flex items-center gap-1 select-none ${
                        header.column.getCanSort() ? "cursor-pointer" : ""
                      }`}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      <span>
                        {{ asc: "🔼", desc: "🔽" }[header.column.getIsSorted()] ?? ""}
                      </span>
                    </div>

                    {header.column.getCanFilter() && (
                      <input
                        type="text"
                        value={header.column.getFilterValue() ?? ""}
                        onChange={(e) => header.column.setFilterValue(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="Filter..."
                        className="mt-1 w-full p-1 text-xs font-normal rounded border border-[var(--border-color)] bg-[var(--card-background)]"
                      />
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>

          <tbody className="bg-[var(--card-background)] text-[var(--foreground)]">
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="hover:bg-[var(--secondary-hover)] transition-colors">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="py-2 px-4 border-b border-[var(--border-color)]">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}

            {table.getRowModel().rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="py-6 text-center opacity-70 text-sm">
                  No matching registrations
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-2 text-[var(--foreground)]">
        <div className="text-sm text-gray-400">
          Showing{" "}
          <strong>
            {table.getFilteredRowModel().rows.length === 0
              ? 0
              : table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}
          </strong>{" "}
          -
          <strong>
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              table.getFilteredRowModel().rows.length
            )}
          </strong>{" "}
          of <strong>{table.getFilteredRowModel().rows.length}</strong> registrations
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="px-3 py-1 rounded-lg bg-[var(--secondary-color)] hover:bg-[var(--secondary-hover)] disabled:opacity-50"
          >
            Previous
          </button>
          <span>
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
          </span>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="px-3 py-1 rounded-lg bg-[var(--secondary-color)] hover:bg-[var(--secondary-hover)] disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
