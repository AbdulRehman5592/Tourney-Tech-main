
"use client";
import { useState, useEffect } from "react";
import api from "@/utils/axios";
import GameForm from "@/components/ui/admin/games/GameForm";
import GamesTable from "@/components/ui/admin/games/GameTable";

import { toast } from "react-hot-toast";

export default function GamesPage() {
  const [games, setGames] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editGame, setEditGame] = useState(null);

  const fetchGames = async () => {
    try {
      const res = await api.get("/api/games");
      setGames(res.data.data);
    } catch (err) {
      console.error("Failed to fetch games", err);
    }
  };

  useEffect(() => {
    fetchGames();
  }, []);

const handleAddOrUpdate = async (data) => {
  try {
    const config = {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    };

    let res;
    if (editGame) {
      res = await api.patch(`/api/games/${editGame._id}`, data, config);
    } else {
      res = await api.post("/api/games", data, config);
    }

    if (res.status === 201 || res.status === 200) {
      toast.success("Game saved successfully");
      await fetchGames();
      setShowForm(false);
      setEditGame(null);
    }
  } catch (err) {
    console.error("Game save failed", err);
    toast.error(err.response?.data?.message || "Something went wrong.");
  }
};


 const handleDelete = async (id) => {
  try {
    const res = await api.delete(`/api/games/${id}`);
    toast.success("Game deleted successfully");
    await fetchGames();


  } catch (err) {
    console.error("Delete error:", err);
    toast.error(err.response?.data?.message || "Something went wrong.");
  }



};

 const handleDuplicate = async (id) => {
    try {
      const res = await api.post(`/api/games/${id}`);
      toast.success("Game duplicated successfully");
      await fetchGames();
    } catch (err) {
      console.error("Duplicate error:", err);
      toast.error(err.response?.data?.message || "Failed to duplicate game.");
    }
  };



  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-[color:var(--accent-color)]">Games</h1>
          <button onClick={() => {
            setEditGame(null);
            setShowForm((prev) => !prev);
          }} className="bg-[color:var(--accent-color)] hover:opacity-90 text-white px-4 py-2 rounded">
            {showForm ? "Close" : "Add Game"}
          </button>
        </div>

        {showForm && (
          <GameForm
            onSubmit={handleAddOrUpdate}
            initialData={editGame}
            onClose={() => setShowForm(false)}
          />
        )}

        <div className="mt-6">
          <GamesTable games={games} onEdit={(game) => {
            setEditGame(game);
            setShowForm(true);
          }} onDelete={handleDelete} 
          onDuplicate={handleDuplicate}/>
        </div>
      </div>
    </div>
  );
}
