"use client";

import { useState } from "react";
import UserTable from "@/components/ui/admin/UserTable";
import CreateUserForm from "@/components/ui/admin/User/CreateUserForm";
import Button from "@/components/ui/Button";

export default function ManageUsers() {
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  // UserTable owns and fetches its own row data internally; bumping this
  // key is what tells it to refetch, since it re-runs its fetch effect
  // whenever `refreshKey` changes.
  const [refreshKey, setRefreshKey] = useState(0);

  // ✅ Called after create/edit -- triggers UserTable to refetch so the
  // visible list updates immediately instead of requiring a page reload.
  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingUser(null);
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">All Users</h1>
        <Button
          onClick={() => {
            setEditingUser(null);
            setShowForm((prev) => !prev);
          }}
        >
          {showForm ? "Close Form" : "Create User"}
        </Button>
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
        refreshKey={refreshKey}
        onEditUser={(user) => {
          setEditingUser(user);
          setShowForm(true);
        }}
      />
    </div>
  );
}
