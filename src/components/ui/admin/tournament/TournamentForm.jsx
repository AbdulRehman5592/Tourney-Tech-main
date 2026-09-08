"use client";

import { useState, useEffect } from "react";
import { CalendarClock, Upload, X } from "lucide-react";
import api from "@/utils/axios";
import { toast } from "react-hot-toast";
import { toDateTimeLocalInput } from "@/utils/gameSchedule";
import GameForm from "@/components/ui/admin/games/GameForm";

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
  // Index of the game field that opened the "new game" modal, so the newly
  // created game can be auto-selected back into that specific field.
  const [newGameFieldIndex, setNewGameFieldIndex] = useState(null);

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
          scheduledAt: toDateTimeLocalInput(g.scheduledAt),
          eventTitle: g.eventTitle || "",
          locations: g.locations?.length ? g.locations : [""],
          format: g.format || "",
          meshRounds: g.meshRounds || "",
          standardRounds: g.standardRounds || "",
          standardDirection: g.standardDirection || "up",
          rewardByeType: g.rewardByeType || "none",
          winCriteria: g.winCriteria || "wins",
          playoffEnabled: g.playoffEnabled || false,
          playoffQualifiersCount: g.playoffQualifiersCount || "",
          playoffFormat: g.playoffFormat || "single_elimination",
          // "Team Based" used to be a separate checkbox but never drove any
          // real logic -- tournamentTeamType alone decides team size, so this
          // is now always true (fixes stale games that got stuck at false).
          teamBased: true,
          tournamentTeamType: g.tournamentTeamType || "double_player",
          doublesEnabled: g.doublesEnabled || false,
          doublesCost: g.doublesCost || "",
          mixedDoublesEnabled: g.mixedDoublesEnabled || false,
          mixedDoublesCost: g.mixedDoublesCost || "",
        }))
      );

      if (initialData.bannerUrl) {
        setPreviewUrl(initialData.bannerUrl);
      }
    }
  }, [initialData]);

  const fetchGames = async () => {
    try {
      const res = await api.get("/api/games");
      setGamesList(res.data.data || []);
    } catch (err) {
      console.error("Failed to load games", err);
      setGamesList([]);
    }
  };

  useEffect(() => {
    fetchGames();
  }, []);

  const handleCreateGame = async (data) => {
    try {
      const res = await api.post("/api/games", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const createdGame = res.data?.data;
      toast.success("Game created!");
      await fetchGames();

      if (createdGame?._id && newGameFieldIndex !== null) {
        handleGameFieldChange(newGameFieldIndex, "game", createdGame._id);
      }
      setNewGameFieldIndex(null);
    } catch (err) {
      console.error("Failed to create game", err);
      toast.error(err.response?.data?.message || "Failed to create game.");
    }
  };

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
      ...prev,
      {
        game: "",
        entryFee: "",
        scheduledAt: "",
        eventTitle: "",
        locations: [""],
        format: "",
        meshRounds: "",
        standardRounds: "",
        standardDirection: "up",
        rewardByeType: "none",
        winCriteria: "wins",
        playoffEnabled: false,
        playoffQualifiersCount: "",
        playoffFormat: "single_elimination",
        teamBased: true,
        tournamentTeamType: "double_player",
        doublesEnabled: false,
        doublesCost: "",
        mixedDoublesEnabled: false,
        mixedDoublesCost: "",
      },
    ]);
  };

  // The <input type="datetime-local"> value is a local wall-clock string with
  // no offset -- resolve it against the admin's timezone here so the server
  // never has to guess. Empty stays null so "no schedule yet" is preserved.
  const scheduledAtPayload = (value) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  };

  const handleGameFieldChange = (index, name, value) => {
    const updated = [...gameFields];
    if (["doublesEnabled", "mixedDoublesEnabled", "playoffEnabled"].includes(name)) {
      updated[index][name] = value === true || value === "true";
    } else if (
      ["entryFee", "meshRounds", "standardRounds", "doublesCost", "mixedDoublesCost", "playoffQualifiersCount"].includes(name)
    ) {
      updated[index][name] = value === "" ? "" : Number(value);
    } else {
      updated[index][name] = value;
    }
    setGameFields(updated);
  };

  // Each game can play at multiple locations at once (e.g. several courts
  // running the same round) -- kept as a free-text list, not a preset list.
  const handleLocationChange = (gameIndex, locIndex, value) => {
    const updated = [...gameFields];
    const locations = [...(updated[gameIndex].locations || [])];
    locations[locIndex] = value;
    updated[gameIndex].locations = locations;
    setGameFields(updated);
  };

  const handleAddLocation = (gameIndex) => {
    const updated = [...gameFields];
    updated[gameIndex].locations = [...(updated[gameIndex].locations || []), ""];
    setGameFields(updated);
  };

  const handleRemoveLocation = (gameIndex, locIndex) => {
    const updated = [...gameFields];
    const locations = (updated[gameIndex].locations || []).filter((_, i) => i !== locIndex);
    updated[gameIndex].locations = locations.length ? locations : [""];
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
    setStaffList((prev) => [{ userId: "", role: "" }, ...prev]);
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

    if (
      formData.startDate &&
      formData.endDate &&
      new Date(formData.endDate) <= new Date(formData.startDate)
    ) {
      toast.error("End date must be after the start date.");
      return;
    }

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

      const validGames = gameFields
        .filter(
          (g) =>
            g.game &&
            g.format &&
            g.eventTitle?.trim() &&
            (g.entryFee === "" || !isNaN(g.entryFee)) &&
            g.tournamentTeamType &&
            (g.format !== "mesh" || (g.meshRounds && Number(g.meshRounds) >= 1))
        )
        .map((g) => ({
          ...g,
          scheduledAt: scheduledAtPayload(g.scheduledAt),
          locations: (g.locations || []).map((l) => l.trim()).filter(Boolean),
          playoffQualifiersCount:
            g.playoffEnabled && g.playoffQualifiersCount
              ? Number(g.playoffQualifiersCount)
              : undefined,
        }));

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
            scheduledAt: scheduledAtPayload(g.scheduledAt),
            eventTitle: g.eventTitle?.trim(),
            locations: (g.locations || []).map((l) => l.trim()).filter(Boolean),
            format: g.format,
            meshRounds: g.format === "mesh" ? Number(g.meshRounds) : undefined,
            standardRounds:
              g.format === "standard" && g.standardRounds ? Number(g.standardRounds) : undefined,
            standardDirection: g.format === "standard" ? g.standardDirection || "up" : undefined,
            rewardByeType:
              g.format === "single_elimination" ? g.rewardByeType || "none" : "none",
            winCriteria: g.winCriteria || "wins",
            playoffEnabled:
              ["round_robin", "mesh", "standard"].includes(g.format) && Boolean(g.playoffEnabled),
            playoffQualifiersCount:
              g.playoffEnabled && g.playoffQualifiersCount ? Number(g.playoffQualifiersCount) : undefined,
            playoffFormat: g.playoffFormat || "single_elimination",
            teamBased: Boolean(g.teamBased),
            tournamentTeamType: g.tournamentTeamType,
            doublesEnabled: Boolean(g.doublesEnabled),
            doublesCost: g.doublesEnabled ? Number(g.doublesCost) || 0 : 0,
            mixedDoublesEnabled: Boolean(g.mixedDoublesEnabled),
            mixedDoublesCost: g.mixedDoublesEnabled ? Number(g.mixedDoublesCost) || 0 : 0,
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
          <div>
            <label htmlFor="startDate" className="block mb-1 text-sm font-medium">
              Start Date
            </label>
            <input
              id="startDate"
              type="date"
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
              required
              className="w-full p-3 rounded bg-[var(--card-background)] outline-none"
            />
          </div>
          <div>
            <label htmlFor="endDate" className="block mb-1 text-sm font-medium">
              End Date
            </label>
            <input
              id="endDate"
              type="date"
              name="endDate"
              value={formData.endDate}
              onChange={handleChange}
              required
              min={
                formData.startDate
                  ? new Date(
                      new Date(formData.startDate).getTime() + 86400000
                    )
                      .toISOString()
                      .slice(0, 10)
                  : undefined
              }
              className="w-full p-3 rounded bg-[var(--card-background)] outline-none"
            />
          </div>
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
          <option value="draft">Draft</option>
          <option value="upcoming">Upcoming</option>
          <option value="registration_closed">Registration Closed</option>
          <option value="ongoing">Ongoing</option>
          <option value="completed">Completed</option>
        </select>
        {gameFields.every((g) => !g.game) && (
          <p className="text-xs text-gray-400">
            No games added yet -- this tournament will be saved as Draft regardless of the status picked above.
          </p>
        )}

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

          {gameFields.map((field, index) => {
            const selectedGameName = gamesList.find((g) => g._id === field.game)?.name;
            return (
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

              {/* Numbering -- which game this is in the list, plus its
                  scheduled date/time (if set) so admins can tell games apart
                  at a glance without hunting through each card. */}
              <div className="flex flex-wrap items-center gap-2 mt-5 pr-8">
                <span
                  className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                  style={{ backgroundColor: "var(--accent-color)", color: "var(--background)" }}
                >
                  {index + 1}
                </span>
                <h4 className="font-semibold">
                  Game {index + 1}
                  {field.eventTitle?.trim()
                    ? ` — ${field.eventTitle.trim()}`
                    : selectedGameName
                      ? ` — ${selectedGameName}`
                      : ""}
                </h4>
                {field.scheduledAt && (
                  <span className="ml-auto text-xs text-gray-400">
                    {new Date(field.scheduledAt).toLocaleString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                )}
              </div>

              {/* Select Game */}
              <div className="flex gap-2">
                <select
                  value={field.game}
                  onChange={(e) =>
                    handleGameFieldChange(index, "game", e.target.value)
                  }
                  className="w-full p-2 rounded bg-[var(--background)] text-white focus:outline-none"
                >
                  <option value="">Select Game</option>
                  {gamesList.map((game) => (
                    <option key={game._id} value={game._id}>
                      {game.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setNewGameFieldIndex(index)}
                  className="shrink-0 text-sm px-3 py-1 rounded bg-green-600 hover:bg-green-700 whitespace-nowrap"
                >
                  + New Game
                </button>
              </div>

              {/* Entry Fee */}
              <input
                type="number"
                placeholder="please input fee in $"
                value={field.entryFee}
                onChange={(e) =>
                  handleGameFieldChange(index, "entryFee", e.target.value)
                }
                className="w-full p-2 rounded bg-[var(--background)] text-white focus:outline-none"
              />

              {/* When this game is played -- optional, shown as "Schedule TBA"
                  everywhere until it's set. */}
              <div>
                <label className="mb-1 flex items-center gap-2 text-sm font-medium text-gray-300">
                  <CalendarClock size={15} className="text-[var(--accent-color)]" />
                  Game date &amp; time
                </label>
                <input
                  type="datetime-local"
                  value={field.scheduledAt || ""}
                  onChange={(e) =>
                    handleGameFieldChange(index, "scheduledAt", e.target.value)
                  }
                  className="w-full p-2 rounded bg-[var(--background)] text-white focus:outline-none [color-scheme:dark]"
                />
                {!field.scheduledAt && (
                  <p className="mt-1 text-xs text-gray-400">
                    Optional -- players will see "Schedule TBA" until a date and
                    time is set.
                  </p>
                )}
              </div>

              {/* Event Title */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-300">
                  Event Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Morning Session, Round 1 Finals"
                  value={field.eventTitle || ""}
                  onChange={(e) =>
                    handleGameFieldChange(index, "eventTitle", e.target.value)
                  }
                  className="w-full p-2 rounded bg-[var(--background)] text-white focus:outline-none"
                />
              </div>

              {/* Location / Room -- free text, with as many entries as needed
                  when a game is played across multiple rooms/courts at once. */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-300">
                  Location / Room
                </label>
                <div className="space-y-2">
                  {(field.locations || [""]).map((loc, locIndex) => (
                    <div key={locIndex} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. Room 1, Court A"
                        value={loc}
                        onChange={(e) =>
                          handleLocationChange(index, locIndex, e.target.value)
                        }
                        className="w-full p-2 rounded bg-[var(--background)] text-white focus:outline-none"
                      />
                      {field.locations.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveLocation(index, locIndex)}
                          className="shrink-0 text-red-500 hover:text-red-400"
                        >
                          <X size={18} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => handleAddLocation(index)}
                  className="mt-2 text-sm px-3 py-1 rounded bg-blue-600 hover:bg-blue-700"
                >
                  + Add another location
                </button>
              </div>

              {/* Format */}
              <select
                value={field.format}
                onChange={(e) =>
                  handleGameFieldChange(index, "format", e.target.value)
                }
                className="w-full p-2 rounded bg-[var(--background)] text-white focus:outline-none"
              >
                <option value="">Select Format</option>
                <option value="round_robin">Round Robin</option>
                <option value="mesh">Mesh (Table Movement)</option>
                <option value="standard">Standard (Fixed Home Rotation)</option>
                <option value="single_elimination">Single Elimination</option>
                <option value="double_elimination">Double Elimination</option>
              </select>

              {/* Mesh rounds -- required, deliberately no default so it can't be skipped */}
              {field.format === "mesh" && (
                <div>
                  <input
                    type="number"
                    required
                    placeholder="Number of rounds (required)"
                    value={field.meshRounds || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      handleGameFieldChange(
                        index,
                        "meshRounds",
                        val === "" ? "" : Number(val)
                      );
                    }}
                    min={1}
                    className="w-full p-2 rounded bg-[var(--background)] text-white focus:outline-none"
                  />
                  {!field.meshRounds && (
                    <p className="text-xs text-red-400 mt-1">
                      Number of rounds is required for mesh.
                    </p>
                  )}
                </div>
              )}

              {/* Reward bye -- how deep a protected team's bye reaches. Which team
                  is protected is chosen later, once teams exist, right before the
                  bracket is generated. */}
              {field.format === "single_elimination" && (
                <select
                  value={field.rewardByeType || "none"}
                  onChange={(e) =>
                    handleGameFieldChange(index, "rewardByeType", e.target.value)
                  }
                  className="w-full p-2 rounded bg-[var(--background)] text-white focus:outline-none"
                >
                  <option value="none">Reward Bye: None</option>
                  <option value="first_round">Reward Bye: First Round</option>
                  <option value="quarterfinal">Reward Bye: Quarterfinal</option>
                  <option value="semifinal">Reward Bye: Semifinal</option>
                  <option value="final_four">Reward Bye: Final Four</option>
                  <option value="championship">Reward Bye: Championship</option>
                </select>
              )}

              {/* Standard rotation: direction + optional round cap (blank = indefinite,
                  runs one round at a time until the admin declines "another round?") */}
              {field.format === "standard" && (
                <>
                  <select
                    value={field.standardDirection || "up"}
                    onChange={(e) =>
                      handleGameFieldChange(index, "standardDirection", e.target.value)
                    }
                    className="w-full p-2 rounded bg-[var(--background)] text-white focus:outline-none"
                  >
                    <option value="up">Away team shifts up (e.g. table 15 → table 1)</option>
                    <option value="down">Away team shifts down (e.g. table 1 → table 15)</option>
                  </select>
                  <input
                    type="number"
                    placeholder="Number of rounds (blank = indefinite)"
                    value={field.standardRounds || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      handleGameFieldChange(
                        index,
                        "standardRounds",
                        val === "" ? "" : Number(val)
                      );
                    }}
                    min={1}
                    className="w-full p-2 rounded bg-[var(--background)] text-white focus:outline-none"
                  />
                  {!field.standardRounds && (
                    <p className="text-xs text-gray-400 mt-1">
                      No round count set -- the admin will be asked "another round?"
                      after each round during score entry.
                    </p>
                  )}
                </>
              )}

              {/* Win criteria -- how standings rank teams for round robin / mesh / standard */}
              {["round_robin", "mesh", "standard"].includes(field.format) && (
                <select
                  value={field.winCriteria || "wins"}
                  onChange={(e) =>
                    handleGameFieldChange(index, "winCriteria", e.target.value)
                  }
                  className="w-full p-2 rounded bg-[var(--background)] text-white focus:outline-none"
                >
                  <option value="wins">Rank by: Most Wins</option>
                  <option value="hands">Rank by: Most Hands</option>
                  <option value="points">Rank by: Most Points</option>
                </select>
              )}

              {/* Playoff plan -- round_robin/mesh/standard only. This is a
                  preset for planning/display; the admin still makes the real
                  go/no-go call live once Round 1 actually finishes. */}
              {["round_robin", "mesh", "standard"].includes(field.format) && (
                <div>
                  <label className="flex gap-2 items-center">
                    <input
                      type="checkbox"
                      checked={field.playoffEnabled}
                      onChange={(e) =>
                        handleGameFieldChange(index, "playoffEnabled", e.target.checked)
                      }
                    />
                    Will there be a Playoff?
                  </label>
                  {field.playoffEnabled && (
                    <>
                      <select
                        value={field.playoffFormat || "single_elimination"}
                        onChange={(e) =>
                          handleGameFieldChange(index, "playoffFormat", e.target.value)
                        }
                        className="w-full mt-2 p-2 rounded bg-[var(--background)] text-white focus:outline-none"
                      >
                        <option value="single_elimination">Single Elimination</option>
                        <option value="double_elimination">Double Elimination</option>
                      </select>
                      <input
                        type="number"
                        min={2}
                        placeholder="Teams advancing to the playoff bracket (e.g. 32, 16, 15 with a bye, 8)"
                        value={field.playoffQualifiersCount}
                        onChange={(e) =>
                          handleGameFieldChange(index, "playoffQualifiersCount", e.target.value)
                        }
                        className="w-full mt-2 p-2 rounded bg-[var(--background)] text-white focus:outline-none"
                      />
                      <p className="mt-1 text-xs text-gray-400">
                        This is the plan -- the admin can still change the format and
                        qualifier count live once qualifying rounds finish and the
                        playoff is actually started.
                      </p>
                    </>
                  )}
                  {!field.playoffEnabled && (
                    <p className="mt-1 text-xs text-gray-400">
                      Qualifying round standings crown the winner outright, no playoff bracket.
                    </p>
                  )}
                </div>
              )}

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

              {/* Doubles / Mixed Doubles overlay -- available for both single
                  and double player games. Bracket play is untouched; paired
                  players' scores (their own for single_player, their real
                  teammate's shared score for double_player) get summed for a
                  separate doubles/mixed-doubles ranking. */}
              <div className="border border-[var(--border-color)] rounded p-3 space-y-3">
                  <label className="flex gap-2 items-center">
                    <input
                      type="checkbox"
                      checked={field.doublesEnabled}
                      onChange={(e) =>
                        handleGameFieldChange(index, "doublesEnabled", e.target.checked)
                      }
                    />
                    Enable Doubles
                  </label>
                  {field.doublesEnabled && (
                    <input
                      type="number"
                      min={0.01}
                      step="0.01"
                      placeholder="Doubles team cost ($)"
                      value={field.doublesCost}
                      onChange={(e) =>
                        handleGameFieldChange(index, "doublesCost", e.target.value)
                      }
                      className="w-full p-2 rounded bg-[var(--background)] text-white focus:outline-none"
                    />
                  )}

                  <label className="flex gap-2 items-center">
                    <input
                      type="checkbox"
                      checked={field.mixedDoublesEnabled}
                      onChange={(e) =>
                        handleGameFieldChange(index, "mixedDoublesEnabled", e.target.checked)
                      }
                    />
                    Enable Mixed Doubles
                  </label>
                  {field.mixedDoublesEnabled && (
                    <input
                      type="number"
                      min={0.01}
                      step="0.01"
                      placeholder="Mixed doubles team cost ($)"
                      value={field.mixedDoublesCost}
                      onChange={(e) =>
                        handleGameFieldChange(index, "mixedDoublesCost", e.target.value)
                      }
                      className="w-full p-2 rounded bg-[var(--background)] text-white focus:outline-none"
                    />
                  )}
              </div>

              {field.gameConfigId && (
                <button
                  type="button"
                  onClick={() =>
                    updateTournamentGame(field.gameConfigId, {
                      game: field.game,
                      entryFee: field.entryFee,
                      scheduledAt: scheduledAtPayload(field.scheduledAt),
                      eventTitle: field.eventTitle?.trim(),
                      locations: (field.locations || []).map((l) => l.trim()).filter(Boolean),
                      format: field.format,
                      meshRounds:
                        field.format === "mesh" ? Number(field.meshRounds) : undefined,
                      standardRounds:
                        field.format === "standard" && field.standardRounds
                          ? Number(field.standardRounds)
                          : undefined,
                      standardDirection:
                        field.format === "standard" ? field.standardDirection || "up" : undefined,
                      rewardByeType:
                        field.format === "single_elimination"
                          ? field.rewardByeType || "none"
                          : "none",
                      winCriteria: field.winCriteria || "wins",
                      playoffEnabled:
                        ["round_robin", "mesh", "standard"].includes(field.format) &&
                        Boolean(field.playoffEnabled),
                      playoffQualifiersCount:
                        field.playoffEnabled && field.playoffQualifiersCount
                          ? Number(field.playoffQualifiersCount)
                          : undefined,
                      playoffFormat: field.playoffFormat || "single_elimination",
                      teamBased: field.teamBased,
                      tournamentTeamType: field.tournamentTeamType,
                      doublesEnabled: field.doublesEnabled,
                      doublesCost: field.doublesEnabled ? Number(field.doublesCost) || 0 : 0,
                      mixedDoublesEnabled: field.mixedDoublesEnabled,
                      mixedDoublesCost: field.mixedDoublesEnabled
                        ? Number(field.mixedDoublesCost) || 0
                        : 0,
                    })
                  }
                  className="bg-[var(--accent-color)] px-3 py-1 mt-2 rounded text-black text-sm"
                >
                  Update Game
                </button>
              )}
            </div>
            );
          })}

          {gameFields.length > 0 && (
            <button
              type="button"
              onClick={handleAddGameFields}
              className="text-sm px-3 py-1 bg-green-600 rounded hover:bg-green-700"
            >
              Add Game
            </button>
          )}
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

      {newGameFieldIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 overflow-y-auto">
          <div className="w-full max-w-2xl my-8">
            <GameForm
              onSubmit={handleCreateGame}
              initialData={null}
              onClose={() => setNewGameFieldIndex(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
