"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "react-hot-toast";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  flexRender,
} from "@tanstack/react-table";
import { Pencil, Trash2 } from "lucide-react";
import api from "@/utils/axios";

const ACCOUNT_STATUSES = ["active", "suspended", "inactive", "deceased"];

const STATUS_STYLES = {
  active: "bg-green-500/15 text-green-500 border-green-500/30",
  suspended: "bg-yellow-500/15 text-yellow-500 border-yellow-500/30",
  inactive: "bg-gray-500/15 text-gray-400 border-gray-500/30",
  deceased: "bg-red-500/15 text-red-500 border-red-500/30",
};

export default function UserTable({ onEditUser, refreshKey }) {
  const [data, setData] = useState([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [updatingStatusId, setUpdatingStatusId] = useState(null);

  const fetchUsers = async () => {
    try {
      const res = await api.get("/api/users");
      setData(res.data.data);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to fetch users");
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [refreshKey]); // ✅ refetch whenever refreshKey changes

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this user?")) return;

    try {
      const res = await api.delete(`/api/user/${id}`);
      toast.success(res.data.message || "User deleted successfully");
      fetchUsers();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to delete user");
    }
  };

  const handleStatusChange = async (id, accountStatus) => {
    setUpdatingStatusId(id);
    try {
      const res = await api.patch(
        `/api/user/${id}`,
        { accountStatus },
        { headers: { "Content-Type": "application/json" } }
      );
      toast.success(res.data.message || "Status updated");
      setData((prev) =>
        prev.map((u) => (u._id === id ? { ...u, accountStatus } : u))
      );
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update status");
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const columns = useMemo(
    () => [
      { header: "#", cell: ({ row }) => row.index + 1 },
      {
        header: "Full Name",
        accessorFn: (row) => `${row.firstname} ${row.lastname}`,
      },
      { header: "Nickname", accessorKey: "username" },
      { header: "Email", accessorKey: "email" },
      { header: "Gender", accessorKey: "gender" },
      { header: "Phone", accessorKey: "phone" },
      { header: "Region", accessorKey: "city" },
      { header: "City", accessorKey: "subCity" },
      { header: "State", accessorKey: "stateCode" },
      { header: "Club", accessorKey: "club" },
      { header: "Role", accessorKey: "role" },
      {
        header: "Status",
        accessorKey: "accountStatus",
        cell: ({ row }) => {
          const user = row.original;
          const currentStatus = user.accountStatus || "active";
          return (
            <select
              value={currentStatus}
              disabled={updatingStatusId === user._id}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => handleStatusChange(user._id, e.target.value)}
              className={`text-xs font-medium px-2 py-1 rounded-full border capitalize cursor-pointer disabled:opacity-50 ${
                STATUS_STYLES[currentStatus] || STATUS_STYLES.active
              }`}
            >
              {ACCOUNT_STATUSES.map((s) => (
                <option key={s} value={s} className="text-black">
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          );
        },
      },
      {
        header: "DOB",
        accessorKey: "dob",

      },
      {
        header: "Created At",
        accessorKey: "createdAt",
        cell: ({ getValue }) =>
          getValue() ? new Date(getValue()).toLocaleDateString() : "-",
      },
      {
        header: "Actions",
        cell: ({ row }) => {
          const user = row.original;
          return (
            <div className="flex gap-3">
              <button
                onClick={() => onEditUser(user)}
                className="text-blue-500 hover:text-blue-700"
              >
                <Pencil size={18} />
              </button>
              <button
                onClick={() => handleDelete(user._id)}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 size={18} />
              </button>
            </div>
          );
        },
      },
    ],
    [onEditUser, updatingStatusId]
  );

  const table = useReactTable({
    data,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10, // default
      },
    },
  });

  const handlePageSizeChange = (e) => {
    const value = e.target.value;
    if (value === "all") {
      table.setPageSize(data.length || 10);
    } else {
      table.setPageSize(Number(value));
    }
  };

  return (
    <div className="">
      {/* Top Controls */}
      <div className="mt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        {/* Rows per page */}
        <div className="flex items-center gap-2">
          <label htmlFor="pageSize" className="text-sm">
            Rows per page:
          </label>
          <select
            id="pageSize"
            value={
              table.getState().pagination.pageSize >= data.length
                ? "all"
                : table.getState().pagination.pageSize
            }
            onChange={handlePageSizeChange}
            className="p-2 rounded bg-[var(--card-background)]"
          >
            {[10, 30, 50].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
            <option value="all">All</option>
          </select>
        </div>

        {/* Global Search */}
        <input
          type="text"
          placeholder="Search users..."
          className="p-2 bg-[var(--card-background)] rounded w-full sm:w-72"
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="scrollbar-x overflow-x-auto">
        <table className="w-full rounded overflow-hidden">
          <thead className="bg-[var(--card-background)] text-white">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className="text-left p-3 cursor-pointer select-none"
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                    <span className="ml-2">
                      {{
                        asc: "🔼",
                        desc: "🔽",
                      }[header.column.getIsSorted()] ?? ""}
                    </span>
                  </th>
                ))}
              </tr>
            ))}
          </thead>

          <tbody className="bg-[var(--card-background)]">
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="hover:bg-[var(--card-hover)]">
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="p-3 border-t border-[var(--background)]"
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="text-sm text-gray-400">
          Showing{" "}
          <strong>
            {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}
          </strong>{" "}
          -
          <strong>
            {Math.min(
              (table.getState().pagination.pageIndex + 1) *
                table.getState().pagination.pageSize,
              data.length
            )}
          </strong>{" "}
          of <strong>{data.length}</strong> users
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="px-4 py-2 bg-[var(--card-hover)] rounded disabled:opacity-50"
          >
            Previous
          </button>
          <span>
            Page <strong>{table.getState().pagination.pageIndex + 1}</strong> of{" "}
            {table.getPageCount()}
          </span>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="px-4 py-2 bg-[var(--card-background)] rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
