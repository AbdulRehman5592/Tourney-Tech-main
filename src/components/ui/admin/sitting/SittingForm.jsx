"use client";

import { useState, useEffect } from "react";
import api from "@/utils/axios";

export default function SittingForm({ onClose, onSuccess, editing }) {
  const [form, setForm] = useState({
    tournamentId: editing?.tournament?._id || "",
    gameId: editing?.game?._id || "",
    galleryId: editing?.gallery?._id || "", // ✅ store image ID instead of file
  });

  const [loading, setLoading] = useState(false);
  const [tournaments, setTournaments] = useState([]);
  const [games, setGames] = useState([]);
  const [images, setImages] = useState([]); // ✅ image gallery list

  // Fetch all tournaments
  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const res = await api.get("/api/tournaments");
        setTournaments(res.data.data || []);
      } catch (err) {
        console.error("Error fetching tournaments:", err);
      }
    };
    fetchTournaments();
  }, []);

  // Fetch all gallery images
  useEffect(() => {
    const fetchImages = async () => {
      try {
        const res = await api.get("/api/image-gallery");
        setImages(res?.data?.data || []);
      } catch (err) {
        console.error("Error fetching images:", err);
      }
    };
    fetchImages();
  }, []);

  // Update games when tournament changes
  useEffect(() => {
    if (form.tournamentId) {
      const selected = tournaments.find((t) => t._id === form.tournamentId);
      const gameList = selected?.games || [];
      setGames(gameList);

      if (!gameList.find((g) => g.game?._id === form.gameId)) {
        setForm((prev) => ({ ...prev, gameId: "" }));
      }
    }
  }, [form.tournamentId, tournaments]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        tournamentId: form.tournamentId,
        gameId: form.gameId,
        galleryId: form.galleryId,
      };

      if (editing) {
        await api.patch(`/api/sitting-arrangment/${editing._id}`, payload);
      } else {
        await api.post("/api/sitting-arrangment", payload);
      }

      onSuccess();
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setLoading(false);
    }
  };

  const selectedImage = images.find((img) => img._id === form.image);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
      <div
        className="w-full max-w-md rounded-xl shadow-lg p-6"
        style={{
          backgroundColor: "var(--card-background)",
          color: "var(--foreground)",
        }}
      >
        <h2
          className="text-xl font-bold mb-4"
          style={{ color: "var(--primary-color)" }}
        >
          {editing ? "Edit Arrangement" : "Add Arrangement"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tournament Dropdown */}
          <div>
            <label className="block text-sm font-medium mb-1">Tournament</label>
            <select
              name="tournamentId"
              value={form.tournamentId}
              onChange={handleChange}
              className="w-full rounded-lg p-2 outline-none"
              style={{
                backgroundColor: "var(--secondary-color)",
                border: "1px solid var(--border-color)",
                color: "var(--foreground)",
              }}
              required
            >
              <option value="">-- Select Tournament --</option>
              {tournaments.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Game Dropdown */}
          <div>
            <label className="block text-sm font-medium mb-1">Game</label>
            <select
              name="gameId"
              value={form.gameId}
              onChange={handleChange}
              className="w-full rounded-lg p-2 outline-none"
              style={{
                backgroundColor: "var(--secondary-color)",
                border: "1px solid var(--border-color)",
                color: "var(--foreground)",
              }}
              required
              disabled={!form.tournamentId}
            >
              <option value="">-- Select Game --</option>
              {games.map((g) => (
                <option key={g._id} value={g.game?._id}>
                  {g.game?.name}
                </option>
              ))}
            </select>
          </div>

          {/* Image Select (instead of upload) */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Select Image
            </label>
            <select
              name="galleryId"
              value={form.galleryId}
              onChange={handleChange}
              className="w-full rounded-lg p-2 outline-none"
              style={{
                backgroundColor: "var(--secondary-color)",
                border: "1px solid var(--border-color)",
                color: "var(--foreground)",
              }}
              required
            >
              <option value="">-- Select Image --</option>
              {images.map((img) => (
                <option key={img._id} value={img._id}>
                  {img.name}
                </option>
              ))}
            </select>

            {/* Show preview of selected image */}
            {selectedImage && (
              <img
                src={selectedImage.image}
                alt={selectedImage.name}
                className="mt-3 w-24 h-24 rounded object-cover"
                style={{ border: "1px solid var(--border-color)" }}
              />
            )}
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg"
              style={{
                border: "1px solid var(--border-color)",
                backgroundColor: "transparent",
                color: "var(--foreground)",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg text-white disabled:opacity-50"
              style={{
                backgroundColor: "var(--primary-color)",
              }}
            >
              {loading ? "Saving..." : editing ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
