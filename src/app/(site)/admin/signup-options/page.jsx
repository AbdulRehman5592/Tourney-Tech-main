"use client";

import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { Plus, Trash2, Pencil, X, Check } from "lucide-react";
import api from "@/utils/axios";

function SimpleListManager({ title, description, fetchUrl, createUrl, itemUrl, renderLabel }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await api.get(fetchUrl);
      setItems(res.data?.data || []);
    } catch {
      toast.error(`Failed to load ${title.toLowerCase()}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return toast.error("Name is required");
    try {
      await api.post(createUrl, { name: newName.trim() });
      toast.success(`${title.slice(0, -1)} added`);
      setNewName("");
      setCreating(false);
      fetchItems();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to create");
    }
  };

  const startEdit = (item) => {
    setEditingId(item._id);
    setEditingName(item.name);
  };

  const handleRename = async (id) => {
    if (!editingName.trim()) return toast.error("Name is required");
    try {
      await api.patch(`${itemUrl}/${id}`, { name: editingName.trim() });
      toast.success("Renamed");
      setEditingId(null);
      fetchItems();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to rename");
    }
  };

  const handleDelete = async (item) => {
    if (!confirm(`Delete "${item.name}"?`)) return;
    try {
      await api.delete(`${itemUrl}/${item._id}`);
      toast.success("Deleted");
      fetchItems();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete");
    }
  };

  return (
    <div className="rounded-2xl border border-[var(--border-color)] p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold">{title}</h2>
          {description && (
            <p className="text-sm text-[var(--muted-foreground)]">{description}</p>
          )}
        </div>
        {creating ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder={`New ${title.toLowerCase().slice(0, -1)} name`}
              className="rounded-lg border border-[var(--border-color)] bg-[var(--secondary-color)] px-3 py-2 text-sm"
            />
            <button
              onClick={handleCreate}
              className="rounded-lg bg-[var(--primary-color)] px-3 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-hover)]"
            >
              Add
            </button>
            <button
              onClick={() => {
                setCreating(false);
                setNewName("");
              }}
              className="rounded-lg border border-[var(--border-color)] px-3 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 rounded-lg bg-[var(--primary-color)] px-4 py-2 font-semibold text-white hover:bg-[var(--primary-hover)]"
          >
            <Plus size={18} /> Add
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-[var(--muted-foreground)]">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-[var(--muted-foreground)]">Nothing here yet.</p>
      ) : (
        <ul className="divide-y divide-[var(--border-color)]">
          {items.map((item) => (
            <li key={item._id} className="flex items-center justify-between py-2 gap-3">
              {editingId === item._id ? (
                <input
                  autoFocus
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleRename(item._id)}
                  className="flex-1 rounded-lg border border-[var(--border-color)] bg-[var(--secondary-color)] px-3 py-1.5 text-sm"
                />
              ) : (
                <span className="text-sm">{renderLabel ? renderLabel(item) : item.name}</span>
              )}

              <div className="flex items-center gap-2 shrink-0">
                {editingId === item._id ? (
                  <>
                    <button
                      onClick={() => handleRename(item._id)}
                      title="Save"
                      className="text-green-500 hover:text-green-400"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      title="Cancel"
                      className="text-gray-400 hover:text-gray-200"
                    >
                      <X size={16} />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => startEdit(item)}
                      title="Rename"
                      className="text-blue-500 hover:text-blue-400"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(item)}
                      title="Delete"
                      className="text-red-500 hover:text-red-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function SignupOptionsPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Signup Options</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Manage the Region and Club lists players pick from when they sign up.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <SimpleListManager
          title="Regions"
          description="Built-in regions (used for team numbering) can be renamed but not deleted."
          fetchUrl="/api/regions"
          createUrl="/api/regions"
          itemUrl="/api/regions"
          renderLabel={(r) => `${r.code} — ${r.name}${r.isBuiltIn ? "" : " (custom)"}`}
        />
        <SimpleListManager
          title="Clubs"
          fetchUrl="/api/clubs"
          createUrl="/api/clubs"
          itemUrl="/api/clubs"
        />
      </div>
    </div>
  );
}
