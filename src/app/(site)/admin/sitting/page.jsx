"use client";

import { useEffect, useState } from "react";
import { Pencil, Trash2, Plus } from "lucide-react";
import SittingForm from "@/components/ui/admin/sitting/SittingForm";
import api from "@/utils/axios"; // ✅ axios instance with auth

export default function SittingArrangementsPage() {
  const [arrangements, setArrangements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const fetchArrangements = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/sitting-arrangment");
      setArrangements(res.data.data || []);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/sitting-arrangment/${id}`);
      fetchArrangements();
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const handleEdit = (arrangement) => {
    setEditing(arrangement); // ✅ set current item
    setOpenForm(true); // ✅ open modal with editing mode
  };

  useEffect(() => {
    fetchArrangements();
  }, []);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🎭 Sitting Arrangements</h1>
        <button
          className="bg-[var(--accent-color)] text-[var(--background)] flex items-center gap-2  px-4 py-2 rounded-lg  transition"
          style={{ background: "var(--accent-color)" }}
          onClick={() => {
            setEditing(null); // ✅ reset for add
            setOpenForm(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" /> Add Arrangement
        </button>
      </div>

      {/* Table */}
      <div
        className="rounded-xl shadow-md overflow-x-auto"
        style={{ background: "var(--card-background)" }}
      >
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr
              style={{
                background: "var(--secondary-color)",
                color: "var(--foreground)",
              }}
            >
              <th className="p-3 text-left">Tournament</th>
              <th className="p-3 text-left">Game</th>
              <th className="p-3 text-left">Image</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="4" className="text-center p-4">
                  Loading...
                </td>
              </tr>
            ) : arrangements.length ? (
              arrangements.map((item) => (
                <tr
                  key={item._id}
                  className="border-b"
                  style={{ borderColor: "var(--border-color)" }}
                >
                  <td className="p-3">{item.tournament?.name}</td>
                  <td className="p-3">{item.game?.name}</td>
                  <td className="p-3">
                    {item.image || item?.gallery?.image ? (
                      <img
                        src={item.image || item?.gallery?.image}
                        alt="Sitting"
                        className="w-10 h-10 rounded-md object-cover border"
                        style={{ borderColor: "var(--border-color)" }}
                      />
                    ) : (
                      <span style={{ color: "var(--foreground)" }}>
                        No Image
                      </span>
                    )}
                      {/* update later */}
                    {/* {item.gallery?.image ? (
                      <img
                        src={item.gallery.image}
                        alt={item.gallery.name || "Sitting"}
                        className="w-10 h-10 rounded-md object-cover border"
                      />
                    ) : (
                      <span style={{ color: "var(--foreground)" }}>
                        No Image
                      </span>
                    )} */}
                  </td>
                  <td className="p-3 ">
                    <div className="flex gap-3 h-full">
                      <button
                        onClick={() => handleEdit(item)}
                        style={{ color: "var(--info-color)" }}
                        className="hover:opacity-80"
                      >
                        <Pencil className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(item._id)}
                        style={{ color: "var(--error-color)" }}
                        className="hover:opacity-80"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan="4"
                  className="text-center p-4"
                  style={{ color: "var(--foreground)" }}
                >
                  No arrangements found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Form Modal */}
      {openForm && (
        <SittingForm
          onClose={() => setOpenForm(false)}
          onSuccess={() => {
            setOpenForm(false);
            fetchArrangements();
          }}
          editing={editing} // ✅ pass editing item
        />
      )}
    </div>
  );
}
