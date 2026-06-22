"use client";

import { useState, useEffect } from "react";
import UserTable from "@/components/ui/admin/UserTable";
import CreateUserForm from "@/components/ui/admin/User/CreateUserForm";
import api from "@/utils/axios";
import { toast } from "react-hot-toast";

export default function ManageUsers() {
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // ✅ Centralized fetch
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/users");
      setUsers(res.data.data);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // ✅ Called after create/edit
  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingUser(null);
    fetchUsers();
  };

  // ✅ Called after delete
  const handleDeleteSuccess = () => {
    fetchUsers();
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">All Users</h1>
        <button
          onClick={() => {
            setEditingUser(null);
            setShowForm((prev) => !prev);
          }}
          className="px-4 py-2 rounded-lg font-semibold 
          bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] 
          text-white transition-all duration-200"
        >
          {showForm ? "Close Form" : "Create User"}
        </button>
      </div>

      {/* Form for Create or Edit */}
      {showForm && (
        <div className="mb-8">
          <CreateUserForm
            user={editingUser}
            onSuccess={handleFormSuccess} // ✅ refresh after create/edit
            onClose={() => setShowForm(false)}
          />
        </div>
      )}

      {/* User Table */}
      <UserTable
        data={users}
        loading={loading}
        onEditUser={(user) => {
          setEditingUser(user);
          setShowForm(true);
        }}
        onDeleteSuccess={handleDeleteSuccess} // ✅ refresh after delete
      />
    </div>
  );
}
