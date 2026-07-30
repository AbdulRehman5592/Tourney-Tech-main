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
import { GENDER_COLORS } from "@/constants/genderColors";

const MODE_LABELS = { doubles: "Doubles", mixed_doubles: "Mixed Doubles" };

function GenderName({ user }) {
  return (
    <span style={{ color: GENDER_COLORS[user?.gender] || "inherit" }}>
      {user?.firstname} {user?.lastname} ({user?.username})
    </span>
  );
}

export default function DoublesTracking() {
  const [pairs, setPairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState("");

  const fetchPairs = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/admin/doubles");
      setPairs(res.data?.data?.pairs || []);
    } catch (err) {
      console.error("Failed to fetch doubles pairs:", err);
      toast.error("Failed to fetch doubles pairs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPairs();
  }, []);

  const handleApprove = async (id, approved) => {
    try {
      const formData = new FormData();
      formData.append("approved", approved);
      const res = await api.patch(`/api/admin/doubles/${id}/approve-payment`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setPairs((prev) =>
        prev.map((p) => (p._id === id ? { ...p, payment: res.data.data.request.payment } : p))
      );
      toast.success(approved ? "Payment approved" : "Approval reverted");
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to update payment");
    }
  };

  // Requestor balances -- $ due per requestor, summed across their accepted pairs.
  const requestorBalances = useMemo(() => {
    const map = new Map();
    for (const p of pairs) {
      const id = p.from?._id;
      if (!id) continue;
      if (!map.has(id)) map.set(id, { user: p.from, pairCount: 0, totalDue: 0 });
      const entry = map.get(id);
      entry.pairCount += 1;
      entry.totalDue += p.costOwed || 0;
    }
    return Array.from(map.values());
  }, [pairs]);

  const columns = useMemo(
    () => [
      { header: "Sr No.", cell: ({ row }) => row.index + 1, enableSorting: false },
      {
        header: "Requestor",
        id: "from",
        accessorFn: (row) => `${row.from?.firstname || ""} ${row.from?.lastname || ""}`.trim(),
        cell: ({ row }) => <GenderName user={row.original.from} />,
      },
      {
        header: "Requestee",
        id: "to",
        accessorFn: (row) => `${row.to?.firstname || ""} ${row.to?.lastname || ""}`.trim(),
        cell: ({ row }) => <GenderName user={row.original.to} />,
      },
      {
        header: "Tournament",
        id: "tournament",
        accessorFn: (row) => row.tournament?.name || "",
      },
      { header: "Game", id: "game", accessorFn: (row) => row.gameName || "" },
      {
        header: "Mode",
        id: "mode",
        accessorFn: (row) => MODE_LABELS[row.mode] || row.mode || "",
      },
      { header: "$ Due", id: "costOwed", accessorFn: (row) => row.costOwed || 0 },
      {
        header: "Method",
        id: "method",
        accessorFn: (row) => row.payment?.method || "",
      },
      {
        header: "Paid",
        id: "paid",
        accessorFn: (row) => (row.payment?.paid ? "Yes" : "No"),
      },
      {
        header: "Approved",
        id: "approved",
        accessorFn: (row) => (row.payment?.approved ? "Yes" : "No"),
      },
      {
        header: "Actions",
        id: "actions",
        enableSorting: false,
        cell: ({ row }) => {
          const p = row.original;
          return (
            <button
              type="button"
              onClick={() => handleApprove(p._id, !p.payment?.approved)}
              className="px-3 py-1 rounded-lg text-sm font-semibold"
              style={{
                background: p.payment?.approved ? "var(--error-color)" : "var(--success-color)",
                color: "white",
              }}
            >
              {p.payment?.approved ? "Revoke" : "Approve"}
            </button>
          );
        },
      },
    ],
    []
  );

  const table = useReactTable({
    data: pairs,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 30 } },
  });

  const handleExport = () => {
    const rows = table.getFilteredRowModel().rows.map((row) => {
      const p = row.original;
      return {
        "Sr No.": row.index + 1,
        Requestor: `${p.from?.firstname || ""} ${p.from?.lastname || ""}`.trim(),
        "Requestor Gender": p.from?.gender || "",
        Requestee: `${p.to?.firstname || ""} ${p.to?.lastname || ""}`.trim(),
        "Requestee Gender": p.to?.gender || "",
        Tournament: p.tournament?.name || "",
        Game: p.gameName || "",
        Mode: MODE_LABELS[p.mode] || p.mode || "",
        "$ Due": p.costOwed || 0,
        Method: p.payment?.method || "",
        Paid: p.payment?.paid ? "Yes" : "No",
        Approved: p.payment?.approved ? "Yes" : "No",
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Doubles Pairs");
    XLSX.writeFile(workbook, `doubles-tracking-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  if (loading)
    return <p className="text-center mt-10 text-white">Loading doubles pairs...</p>;

  return (
    <div className="min-h-screen p-6 bg-[var(--background)] text-[var(--foreground)]">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold">Doubles Tracking</h1>
        <button
          onClick={handleExport}
          className="px-4 py-2 rounded-lg font-semibold transition hover:scale-[1.02]"
          style={{ backgroundColor: "var(--success-color)", color: "white" }}
        >
          Export to Excel
        </button>
      </div>

      {/* Requestor balances summary */}
      {requestorBalances.length > 0 && (
        <div className="mb-6 overflow-x-auto scrollbar">
          <h2 className="text-lg font-semibold mb-2">Requestor Balances</h2>
          <div className="flex flex-wrap gap-3">
            {requestorBalances.map((b) => (
              <div
                key={b.user?._id}
                className="p-3 rounded-lg border border-[var(--border-color)]"
                style={{ background: "var(--card-background)" }}
              >
                <p className="font-semibold">
                  <GenderName user={b.user} />
                </p>
                <p className="text-sm opacity-80">
                  {b.pairCount} pair{b.pairCount === 1 ? "" : "s"} — ${b.totalDue} due
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <input
        type="text"
        placeholder="Search..."
        value={globalFilter}
        onChange={(e) => setGlobalFilter(e.target.value)}
        className="mb-4 p-2 rounded border border-[var(--border-color)] bg-[var(--card-background)] text-white w-full sm:w-64"
      />

      {pairs.length === 0 ? (
        <p className="opacity-70 text-center mt-10 text-sm">No accepted doubles pairs found</p>
      ) : (
        <>
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
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center mt-4 text-[var(--foreground)]">
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
        </>
      )}
    </div>
  );
}
