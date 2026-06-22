"use client";
import { useState } from "react";
import BankDetailsForm from "@/components/ui/admin/bank-details/BankDetailsForm";
import BankDetailsTable from "@/components/ui/admin/bank-details/BankDetailsTable";

export default function AddBankDetails() {
  const [showForm, setShowForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // 🔑 force refresh table

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[var(--accent-color)]">
          Bank Details
        </h1>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="font-semibold py-2 px-4 rounded-lg shadow-md transition duration-200 bg-[var(--accent-color)] hover:bg-[var(--primary-hover)] text-black hover:text-white"
          >
            + Add Bank Details
          </button>
        )}
      </div>

      {/* Add Form */}
      {showForm && (
        <BankDetailsForm
          onSuccess={() => {
            setRefreshKey((k) => k + 1); // 🔄 trigger refresh in table
            setShowForm(false);
          }}
          onClose={() => setShowForm(false)}
        />
      )}

      {/* Table always mounted */}
      <BankDetailsTable key={refreshKey} />
    </>
  );
}
