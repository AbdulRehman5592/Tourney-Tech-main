"use client";
import { useState, useEffect } from "react";
import api from "@/utils/axios";
import { toast } from "react-hot-toast";

export default function BankDetailsForm({ initialData = null, onSuccess, onClose }) {
  const [loading, setLoading] = useState(false);
  const [bankData, setBankData] = useState({
    bankName: "",
    accountHolder: "",
    accountNumber: "",
  });

  // Prefill when editing
  useEffect(() => {
    if (initialData) {
      setBankData({
        bankName: initialData.bankName || "",
        accountHolder: initialData.accountHolder || "",
        accountNumber: initialData.accountNumber || "",
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    setBankData({ ...bankData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("bankName", bankData.bankName);
      formData.append("accountHolder", bankData.accountHolder);
      formData.append("accountNumber", bankData.accountNumber);

      let res;
      if (initialData?._id) {
        // 🔹 Update
        res = await api.patch(`/api/bankDetails/${initialData._id}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        // 🔹 Create
        res = await api.post("/api/bankDetails", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      toast.success(res.data?.message || "Bank details saved successfully");

      if (onSuccess) onSuccess();

      if (!initialData) {
        // reset only when adding
        setBankData({ bankName: "", accountHolder: "", accountNumber: "" });
      }

      if (onClose) onClose();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to save bank details");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto mb-8">
      <div
        className="rounded-2xl p-8 shadow-lg border"
        style={{
          background: "var(--card-background)",
          borderColor: "var(--border-color)",
        }}
      >
        <h2
          className="text-2xl font-bold text-center mb-6"
          style={{ color: "var(--accent-color)" }}
        >
          {initialData ? "Edit Bank Details" : "Admin Bank Setup"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Bank Name */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--foreground)" }}>
              Bank Name
            </label>
            <input
              type="text"
              name="bankName"
              value={bankData.bankName}
              onChange={handleChange}
              className="w-full rounded-lg px-3 py-2"
              style={{
                background: "var(--secondary-color)",
                borderColor: "var(--border-color)",
                color: "var(--foreground)",
              }}
              placeholder="e.g. Easypaisa, JazzCash, Meezan Bank"
              required
            />
          </div>

          {/* Account Holder Name */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--foreground)" }}>
              Account Holder Name
            </label>
            <input
              type="text"
              name="accountHolder"
              value={bankData.accountHolder}
              onChange={handleChange}
              className="w-full rounded-lg px-3 py-2"
              style={{
                background: "var(--secondary-color)",
                borderColor: "var(--border-color)",
                color: "var(--foreground)",
              }}
              placeholder="e.g. Admin Name"
              required
            />
          </div>

          {/* Account Number */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--foreground)" }}>
              Account Number
            </label>
            <input
              type="text"
              name="accountNumber"
              value={bankData.accountNumber}
              onChange={handleChange}
              className="w-full rounded-lg px-3 py-2"
              style={{
                background: "var(--secondary-color)",
                borderColor: "var(--border-color)",
                color: "var(--foreground)",
              }}
              placeholder="e.g. 0300-1234567 or IBAN"
              required
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 font-semibold py-2 px-4 rounded-lg shadow-md transition duration-200 bg-[var(--accent-color)] hover:bg-[var(--primary-hover)] text-black hover:text-white disabled:opacity-50"
            >
              {loading ? "Saving..." : initialData ? "Update" : "Save"}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="flex-1 font-semibold py-2 px-4 rounded-lg shadow-md transition duration-200"
              style={{
                background: "var(--error-color)",
                color: "var(--foreground)",
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
