"use client";
import { useEffect, useState } from "react";

export default function GameForm({ onSubmit, initialData = {}, onClose }) {
  const [formData, setFormData] = useState({
    name: "",
    genre: "",
    platform: "",
    description: "",
    rulesUrl: "",
  });

  const [iconFile, setIconFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [iconPreview, setIconPreview] = useState("");
  const [coverPreview, setCoverPreview] = useState("");

  useEffect(() => {
    setFormData({
      name: initialData?.name || "",
      genre: initialData?.genre || "",
      platform: initialData?.platform || "",
      description: initialData?.description || "",
      rulesUrl: initialData?.rulesUrl || "",
    });

    setIconFile(null);
    setCoverFile(null);
    setIconPreview(initialData?.icon || "");
    setCoverPreview(initialData?.coverImage || "");
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;

    if (name === "icon" && files?.[0]) {
      const file = files[0];
      setIconFile(file);
      setIconPreview(URL.createObjectURL(file));
    } else if (name === "coverImage" && files?.[0]) {
      const file = files[0];
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const data = new FormData();
    data.append("name", formData.name);
    data.append("genre", formData.genre);
    data.append("platform", formData.platform);
    data.append("description", formData.description);
    data.append("rulesUrl", formData.rulesUrl || "");

    if (iconFile) data.append("icon", iconFile);
    if (coverFile) data.append("coverImage", coverFile);

    for (let [key, val] of data.entries()) {
      console.log(`${key}:`, val);
    }

    await onSubmit(data);
    if (onClose) onClose();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-[var(--card-background)] shadow-md rounded-xl p-6 space-y-5"
      encType="multipart/form-data"
    >
      <h2 className="text-xl font-semibold text-white mb-2">Game Details</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <input
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Game Name *"
          required
          className="p-2 rounded border border-[var(--border-color)] bg-[var(--card-background)] text-[var(--foreground)]"
        />
        <input
          name="genre"
          value={formData.genre}
          onChange={handleChange}
          placeholder="Host"
          className="p-2 rounded border border-[var(--border-color)] bg-[var(--card-background)] text-[var(--foreground)]"
        />
        <input
          name="platform"
          value={formData.platform}
          onChange={handleChange}
          placeholder="Platform *"
          required
          className="p-2 rounded border border-[var(--border-color)] bg-[var(--card-background)] text-[var(--foreground)]"
        />
        <input
          name="rulesUrl"
          value={formData.rulesUrl}
          onChange={handleChange}
          placeholder="Rules URL"
          className="p-2 rounded border border-[var(--border-color)] bg-[var(--card-background)] text-[var(--foreground)]"
        />
      </div>

      <textarea
        name="description"
        value={formData.description}
        onChange={handleChange}
        placeholder="Game Description"
        className="p-2 w-full rounded border border-[var(--border-color)] bg-[var(--card-background)] text-[var(--foreground)] min-h-[100px]"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
        {/* Icon Upload */}
        <div className="space-y-2">
          <label className="font-semibold text-sm">Game Logo (Icon):</label>
          <div className="relative border-2 border-dashed border-[var(--accent-color)] rounded-lg p-4 text-center cursor-pointer hover:bg-[var(--accent-color-light)]">
            <input
              type="file"
              name="icon"
              accept="image/*"
              onChange={handleChange}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <p className="text-sm text-gray-500">Click or drag file to upload logo</p>
            {iconPreview && (
              <img
                src={iconPreview}
                alt="Icon Preview"
                className="mt-2 max-h-24 mx-auto rounded object-contain"
              />
            )}
          </div>
        </div>

        {/* Cover Upload */}
        <div className="space-y-2">
          <label className="font-semibold text-sm">Game Banner (Cover Image):</label>
          <div className="relative border-2 border-dashed border-[var(--accent-color)] rounded-lg p-4 text-center cursor-pointer hover:bg-[var(--accent-color-light)]">
            <input
              type="file"
              name="coverImage"
              accept="image/*"
              onChange={handleChange}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <p className="text-sm text-gray-500">Click or drag file to upload banner</p>
            {coverPreview && (
              <img
                src={coverPreview}
                alt="Cover Preview"
                className="mt-2 max-h-32 w-full object-cover rounded"
              />
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded border border-gray-400 hover:bg-gray-100"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="bg-[var(--accent-color)] hover:opacity-90 text-white px-6 py-2 rounded"
        >
          Save Game
        </button>
      </div>
    </form>
  );
}
