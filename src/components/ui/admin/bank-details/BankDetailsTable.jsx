"use client";
import { useEffect, useState, useCallback } from "react";
import { Pencil, Trash2 } from "lucide-react";
import api from "@/utils/axios";
import { toast } from "react-hot-toast";
import BankDetailsForm from "./BankDetailsForm"; // ✅ reuse form

export default function BankDetailsTable() {
  const [accounts, setAccounts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingAccount, setEditingAccount] = useState(null); // ✅ track editing
  const rowsPerPage = 10;

  // Fetch accounts
  const fetchAccounts = useCallback(async () => {
    try {
      const res = await api.get("/api/bankDetails");
      setAccounts(res.data.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch bank accounts");
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // Pagination logic
  const totalPages = Math.ceil(accounts.length / rowsPerPage);
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = accounts.slice(indexOfFirstRow, indexOfLastRow);

  // Delete API
  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/bankDetails/${id}`);
      toast.success("Bank account deleted");
      fetchAccounts(); // ✅ refresh after delete
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete account");
    }
  };

  return (
    <div className="w-full">
      <div className="overflow-x-auto scrollbar-x rounded-lg border border-[var(--border-color)]">
        <table className="min-w-full divide-y divide-[var(--border-color)]">
          <thead className="bg-[var(--secondary-color)]">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-[var(--foreground)]">
                Bank Name
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-[var(--foreground)]">
                Account Number
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-[var(--foreground)]">
                Account Holder
              </th>
              <th className="px-4 py-3 text-center text-sm font-medium text-[var(--foreground)]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)] bg-[var(--card-background)]">
            {currentRows.map((account) => (
              <tr key={account._id} className="hover:bg-[var(--card-hover)]">
                <td className="px-4 py-3 text-sm">{account.bankName}</td>
                <td className="px-4 py-3 text-sm">{account.accountNumber}</td>
                <td className="px-4 py-3 text-sm">{account.accountHolder}</td>
                <td className="px-4 py-3 flex justify-center gap-3">
                  {/* ✅ Open form for edit */}
                  <button
                    onClick={() => setEditingAccount(account)}
                    className="p-2 rounded-lg bg-[var(--secondary-color)] hover:bg-[var(--secondary-hover)]"
                  >
                    <Pencil className="w-4 h-4 text-[var(--info-color)]" />
                  </button>
                  <button
                    onClick={() => handleDelete(account._id)}
                    className="p-2 rounded-lg bg-[var(--secondary-color)] hover:bg-[var(--secondary-hover)]"
                  >
                    <Trash2 className="w-4 h-4 text-[var(--error-color)]" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {accounts.length > rowsPerPage && (
        <div className="flex justify-between items-center mt-4">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
            className="px-4 py-2 rounded-lg bg-[var(--secondary-color)] text-sm hover:bg-[var(--secondary-hover)] disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
            className="px-4 py-2 rounded-lg bg-[var(--secondary-color)] text-sm hover:bg-[var(--secondary-hover)] disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* ✅ Edit Modal instead of inline form */}
      {editingAccount && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-[var(--card-background)] rounded-2xl p-8 shadow-lg w-full max-w-lg">
            <BankDetailsForm
              initialData={editingAccount}
              onSuccess={() => {
                fetchAccounts();
                setEditingAccount(null);
              }}
              onClose={() => setEditingAccount(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
