"use client";

import { useState, useEffect } from "react";
import { Upload, X } from "lucide-react";
import api from "@/utils/axios";
import { toast } from "react-hot-toast";

export default function TournamentForm({ initialData, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    location: "",
    startDate: "",
    endDate: "",
    status: "upcoming",
    bannerUrl: "",
  });

  const [image, setImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [gamesList, setGamesList] = useState([]);
  const [gameFields, setGameFields] = useState([]);

  // staff
  const [usersList, setUsersList] = useState([]);
  const [staffList, setStaffList] = useState([{ userId: "", role: "" }]);

  // Load users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await api.get("/api/users");
        setUsersList(res.data.data || []);
      } catch (err) {
        console.error("Failed to load users", err);
      }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    if (Array.isArray(initialData?.staff) && usersList.length) {
      const mappedStaff = initialData.staff.map((member) => {
        const user = member.userId || member.user || {}; // ✅ support both keys

        return {
          userId:
            typeof user === "object" ? user._id?.toString() : user?.toString(),
          role: member.role || "",
        };
      });

      setStaffList(mappedStaff);
    }
  }, [initialData, usersList]);

  useEffect(() => {
    if (initialData?.staff) {
      console.log("Initial Staff:", initialData.staff);
      console.log("Users List:", usersList);
      console.log("Mapped Staff:", staffList);
    }
  }, [initialData, usersList, staffList]);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || "",
        description: initialData.description || "",
        location: initialData.location || "",
        startDate: initialData.startDate?.slice(0, 10) || "",
        endDate: initialData.endDate?.slice(0, 10) || "",
        status: initialData.status || "upcoming",
        bannerUrl: initialData.bannerUrl || "",
      });
      setGameFields(
        (initialData.games || []).map((g) => ({
          gameConfigId: g._id || "",
          game: typeof g.game === "object" ? g.game._id : g.game,
          entryFee: g.entryFee,
          format: g.format || "double_elimination",
          teamBased: g.teamBased || false,
          tournamentTeamType: g.tournamentTeamType || "double_player",
          rounds: g.rounds || "",
        }))
      );

      if (initialData.bannerUrl) {
        setPreviewUrl(initialData.bannerUrl);
      }
    }
  }, [initialData]);

  useEffect(() => {
    const fetchGames = async () => {
      try {
        const res = await api.get("/api/games");
        setGamesList(res.data.data || []);
      } catch (err) {
        console.error("Failed to load games", err);
        setGamesList([]);
      }
    };
    fetchGames();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setImage(file);
    if (file) {
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleAddGameFields = () => {
    setGameFields((prev) => [
      {
        game: "",
        entryFee: 0,
        format: "double_elimination",
        teamBased: false,
        tournamentTeamType: "double_player",
      },
       ...prev,
    ]);
  };

  const handleGameFieldChange = (index, name, value) => {
    const updated = [...gameFields];
    if (name === "teamBased") {
      updated[index][name] = value === true || value === "true";
    } else if (["entryFee"].includes(name)) {
      updated[index][name] = value === "" ? "" : Number(value);
    } else {
      updated[index][name] = value;
    }
    setGameFields(updated);
  };

  const handleRemoveGameField = async (index) => {
    const field = gameFields[index];
    if (field.gameConfigId && initialData?._id) {
      try {
        await api.delete(
          `/api/tournaments/${initialData._id}/games/${field.gameConfigId}`
        );
        toast.success("Game deleted!");
      } catch (err) {
        console.error(err);
        toast.error("Failed to delete game.");
        return;
      }
    }
    setGameFields((prev) => prev.filter((_, i) => i !== index));
  };

  // staff
  const handleAddStaff = () => {
    setStaffList((prev) => [...prev, { userId: "", role: "" }]);
  };

  const handleStaffChange = (index, name, value) => {
    const updated = [...staffList];
    updated[index][name] = value;
    setStaffList(updated);
  };

  const handleRemoveStaff = (index) => {
    setStaffList((prev) => prev.filter((_, i) => i !== index));
  };

  const updateTournamentGame = async (gameConfigId, updatedGame) => {
    try {
      await api.patch(
        `/api/tournaments/${initialData._id}/games/${gameConfigId}`,
        updatedGame
      );
      toast.success("Game updated!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update game.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let bannerUrl = formData.bannerUrl;

      if (image && initialData?._id) {
        const imageForm = new FormData();
        imageForm.append("banner", image);
        const uploadRes = await api.patch(
          `/api/tournaments/${initialData._id}`,
          imageForm,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
        bannerUrl = uploadRes.data.bannerUrl;
      }

      const validGames = gameFields.filter(
        (g) => g.game && !isNaN(g.entryFee) && g.tournamentTeamType
      );

      const jsonPayload = {
        ...formData,
        bannerUrl,
        isPublic: true,
      };

      if (initialData?._id) {
        // 🔁 Update Tournament
        await api.patch(`/api/tournaments/${initialData._id}`, jsonPayload);

        // 🎯 Update or Add Games
        for (const g of validGames) {
          const gameData = {
            game: g.game,
            entryFee: Number(g.entryFee),
            format: g.format,
            teamBased: Boolean(g.teamBased),
            tournamentTeamType: g.tournamentTeamType,
            rounds: Number(g.rounds),
          };
          if (g.gameConfigId) {
            // ✅ Update existing game
            await api.patch(
              `/api/tournaments/${initialData._id}/games/${g.gameConfigId}`,
              gameData,
              { headers: { "Content-Type": "application/json" } }
            );
          } else {
            // ➕ Add new game
            await api.post(
              `/api/tournaments/${initialData._id}/games`,
              gameData,
              { headers: { "Content-Type": "application/json" } }
            );
          }
        }

        // staff
        // First, build easier lookups
        const initialStaff = (initialData.staff || []).map((s) => ({
          userId: (s.userId?._id || s.user?._id || s.userId || "").toString(),
          role: s.role,
        }));
        const currentStaff = staffList.filter((s) => s.userId && s.role);

        // Step 1: Add or update all current staff
        for (const newStaff of currentStaff) {
          const existing = initialStaff.find(
            (s) => s.userId === newStaff.userId
          );
          if (!existing) {
            // New staff — Add
            await api.post(`/api/tournaments/${initialData._id}/staff`, {
              userId: newStaff.userId,
              role: newStaff.role,
            });
          } else if (existing.role !== newStaff.role) {
            // Existing staff with role change — Update
            await api.patch(`/api/tournaments/${initialData._id}/staff`, {
              userId: newStaff.userId,
              role: newStaff.role,
            });
          }
        }

        // Step 2: Now safely remove staff that are no longer present
        for (const oldStaff of initialStaff) {
          const stillExists = currentStaff.some(
            (s) => s.userId === oldStaff.userId
          );
          if (!stillExists) {
            try {
              await api.delete(
                `/api/tournaments/${initialData._id}/staff?userId=${oldStaff.userId}`
              );
            } catch (err) {
              console.error("Failed to remove staff:", err);
              toast.error(
                err.response?.data?.message || "Failed to remove staff"
              );
            }
          }
        }

        toast.success("Tournament updated!");
      } else {
        // staff
        const createForm = new FormData();
        const organizers = staffList
          .filter((s) => s.userId && s.role === "organizer")
          .map((s) => s.userId);

        const managers = staffList
          .filter((s) => s.userId && s.role === "manager")
          .map((s) => s.userId);

        const support = staffList
          .filter((s) => s.userId && s.role === "support")
          .map((s) => s.userId);

        Object.entries({
          ...jsonPayload,
          games: validGames,
        }).forEach(([key, value]) => {
          createForm.append(
            key,
            key === "games" ? JSON.stringify(value) : value
          );
        });

        createForm.append("organizers", JSON.stringify(organizers));
        createForm.append("managers", JSON.stringify(managers));
        createForm.append("support", JSON.stringify(support));

        if (image) {
          createForm.append("banner", image);
        }

        await api.post("/api/tournaments", createForm, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        toast.success("Tournament created!");
      }

      onSuccess?.();
      onClose?.();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to save tournament.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-[var(--card)] text-white rounded-xl max-w-3xl mx-auto shadow-lg">
      <h2 className="text-2xl font-bold mb-6">
        {initialData ? "Edit Tournament" : "Create Tournament"}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          placeholder="Tournament name"
          className="w-full p-3 rounded bg-[var(--card-background)] outline-none"
        />

        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={4}
          className="w-full p-3 rounded bg-[var(--card-background)] outline-none resize-none"
          placeholder="Describe the tournament"
        />

        <input
          type="text"
          name="location"
          value={formData.location}
          onChange={handleChange}
          required
          placeholder="Enter location"
          className="w-full p-3 rounded bg-[var(--card-background)] outline-none"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input
            type="date"
            name="startDate"
            value={formData.startDate}
            onChange={handleChange}
            required
            className="w-full p-3 rounded bg-[var(--card-background)] outline-none"
          />
          <input
            type="date"
            name="endDate"
            value={formData.endDate}
            onChange={handleChange}
            required
            className="w-full p-3 rounded bg-[var(--card-background)] outline-none"
          />
        </div>

        <label htmlFor="status" className="block text-sm font-medium">
          Status
        </label>
        <select
          id="status"
          name="status"
          value={formData.status}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, status: e.target.value }))
          }
          className="w-full p-3 rounded bg-[var(--card-background)]"
        >
          <option value="upcoming">Upcoming</option>
          <option value="ongoing">Ongoing</option>
          <option value="completed">Completed</option>
        </select>

        <label className="block text-sm font-semibold text-white">
          Tournament Banner
        </label>
        <label
          htmlFor="imageUpload"
          className="w-full flex flex-col items-center justify-center gap-3 px-6 py-8 rounded-xl cursor-pointer border-2 border-dashed border-[var(--accent-color)] bg-[var(--card-bg)] text-white text-center"
        >
          <Upload size={20} />
          <span className="text-sm text-gray-300">
            {image ? image.name : "Click to upload image"}
          </span>
        </label>
        <input
          id="imageUpload"
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="hidden"
        />

        {previewUrl && (
          <img
            src={previewUrl}
            alt="Banner Preview"
            className="mt-4 w-full max-h-64 object-cover rounded-lg"
          />
        )}

        {/* add games */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Game Fields</h3>
            <button
              type="button"
              onClick={handleAddGameFields}
              className="text-sm px-3 py-1 bg-green-600 rounded hover:bg-green-700"
            >
              Add Game
            </button>
          </div>

          {gameFields.map((field, index) => (
            <div
              key={index}
              className="bg-[var(--card-background)] p-4 rounded-md space-y-3 relative"
            >
              <button
                type="button"
                onClick={() => handleRemoveGameField(index)}
                className="absolute top-2 right-2 text-red-500 cursor-pointer"
              >
                <X size={24} />
              </button>

              {/* Select Game */}
              <select
                value={field.game}
                onChange={(e) =>
                  handleGameFieldChange(index, "game", e.target.value)
                }
                className="w-full mt-5 p-2 rounded bg-[var(--background)] text-white focus:outline-none"
              >
                <option value="">Select Game</option>
                {gamesList.map((game) => (
                  <option key={game._id} value={game._id}>
                    {game.name}
                  </option>
                ))}
              </select>

              {/* Entry Fee */}
              <input
                type="number"
                placeholder="Entry Fee"
                value={field.entryFee}
                onChange={(e) =>
                  handleGameFieldChange(index, "entryFee", e.target.value)
                }
                className="w-full p-2 rounded bg-[var(--background)] text-white focus:outline-none"
              />

              {/* Format */}
              {/* <select
                value={field.format}
                onChange={(e) =>
                  handleGameFieldChange(index, "format", e.target.value)
                }
                className="w-full p-2 rounded bg-[var(--background)] text-white focus:outline-none"
              >
                <option value="single_elimination">Single Elimination</option>
                <option value="double_elimination">Double Elimination</option>
                <option value="round_robin">Round Robin</option>
              </select> */}

              {/* Rounds */}
              <input
                type="number"
                placeholder="Rounds"
                value={field.rounds || ""}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (val >= 1 && val <= 99) {
                    handleGameFieldChange(index, "rounds", val);
                  } else if (e.target.value === "") {
                    handleGameFieldChange(index, "rounds", "");
                  }
                }}
                min={1}
                max={99}
                className="w-full p-2 rounded bg-[var(--background)] text-white focus:outline-none"
              />

              {/* Team Based */}
              <label className="flex gap-2 items-center">
                <input
                  type="checkbox"
                  checked={field.teamBased}
                  onChange={(e) =>
                    handleGameFieldChange(index, "teamBased", e.target.checked)
                  }
                />
                Team Based?
              </label>

              {/* Tournament Team Type */}
              <select
                value={field.tournamentTeamType}
                onChange={(e) =>
                  handleGameFieldChange(
                    index,
                    "tournamentTeamType",
                    e.target.value
                  )
                }
                className="w-full p-2 rounded bg-[var(--background)] text-white focus:outline-none"
              >
                <option value="double_player">Double Player</option>
                <option value="single_player">Single Player</option>
              </select>

              {field.gameConfigId && (
                <button
                  type="button"
                  onClick={() =>
                    updateTournamentGame(field.gameConfigId, {
                      game: field.game,
                      entryFee: field.entryFee,
                      format: field.format,
                      teamBased: field.teamBased,
                      tournamentTeamType: field.tournamentTeamType,
                      rounds: field.rounds,
                    })
                  }
                  className="bg-[var(--accent-color)] px-3 py-1 mt-2 rounded text-black text-sm"
                >
                  Update Game
                </button>
              )}
            </div>
          ))}
        </div>

        {/* add staff */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Assign Staff</h3>
            <button
              type="button"
              onClick={handleAddStaff}
              className="text-sm px-3 py-1 bg-blue-600 rounded hover:bg-blue-700"
            >
              Add Staff
            </button>
          </div>

          {staffList.map((staff, index) => (
            <div
              key={index}
              className="bg-[var(--card-background)] p-4 rounded-md space-y-3 relative"
            >
              <button
                type="button"
                onClick={() => handleRemoveStaff(index)}
                className="absolute top-2 right-2 text-red-500 cursor-pointer"
              >
                <X size={24} />
              </button>
              <select
                value={staff.userId}
                onChange={(e) =>
                  handleStaffChange(index, "userId", e.target.value)
                }
                className="w-full p-2 rounded bg-[var(--background)] text-white"
              >
                <option value="">Select User</option>
                {usersList.map((user) => (
                  <option key={user._id} value={user._id.toString()}>
                    {user.username || user.email}
                  </option>
                ))}
              </select>

              <select
                value={staff.role}
                onChange={(e) =>
                  handleStaffChange(index, "role", e.target.value)
                }
                className="w-full p-2 rounded bg-[var(--background)] text-white"
              >
                <option value="">Select Role</option>
                <option value="organizer">Organizer</option>
                <option value="manager">Manager</option>
                <option value="support">Support</option>
              </select>
            </div>
          ))}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-[var(--accent-color)] w-full text-[var(--background)] font-medium px-4 py-3 rounded hover:opacity-90"
        >
          {loading
            ? "Saving..."
            : initialData
              ? "Update Tournament"
              : "Create Tournament"}
        </button>
      </form>
    </div>
  );
}
