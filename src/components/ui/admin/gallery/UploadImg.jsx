"use client";

import api from "@/utils/axios";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";

const UploadImg = ({ open, setOpen, onSuccess, editData = null }) => {
  const [fileName, setFileName] = useState("No file chosen");
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [iconImage, setIconImage] = useState(null);
  const [name, setName] = useState("");

  // ✅ When editData changes, fill existing details
  useEffect(() => {
    if (editData) {
      setName(editData.name || "");
      setPreview(editData.image || null);
      setFileName(editData.image ? editData.image.split("/").pop() : "No file chosen");
    } else {
      resetForm();
    }
  }, [editData]);

  const resetForm = () => {
    setName("");
    setIconImage(null);
    setFileName("No file chosen");
    setPreview(null);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFileName(file.name);
      setIconImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Please enter a name.");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("name", name);
      if (iconImage) formData.append("iconImage", iconImage);

      let response;

      if (editData?._id) {
        // ✅ Edit mode
        response = await api.patch(`/api/image-gallery/${editData._id}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        // ✅ Upload mode
        response = await api.post(`/api/image-gallery`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      if (response.status === 200 || response.status === 201) {
        toast.success(
          editData ? "Image updated successfully" : "Image uploaded successfully"
        );
        onSuccess && onSuccess();
        resetForm();
        setOpen(false);
      }
    } catch (error) {
      console.log("Error:", error);
      toast.error("Something went wrong!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center">
      {open && (
        <div className="w-full max-w-md p-6 rounded-2xl bg-[var(--card-background)] shadow-md mb-8">
          <h1 className="text-2xl font-bold text-[var(--accent-color)] mb-6 text-center">
            {editData ? "Edit Image" : "Upload Image"}
          </h1>

          {/* Name Input */}
          <div className="mb-5">
            <label className="block mb-2 text-sm font-semibold text-[var(--foreground)]">
              Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              type="text"
              placeholder="Enter image name..."
              className="w-full p-2.5 rounded-lg border border-[var(--border-color)] bg-[var(--secondary-color)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] transition"
            />
          </div>

          {/* File Upload */}
          <div className="mb-4">
            <label className="flex flex-col items-center justify-center w-full p-6 border-2 border-dashed rounded-lg cursor-pointer border-[var(--border-color)] hover:border-[var(--accent-color)] hover:bg-[var(--card-hover)] transition">
              <span className="text-[var(--accent-color)] font-medium">
                Click to upload or drag & drop
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
            <p className="text-sm text-[var(--foreground)] mt-2 italic">
              {fileName}
            </p>
          </div>

          {/* Preview */}
          {preview && (
            <div className="mt-4">
              <img
                src={preview}
                alt="Preview"
                className="rounded-lg border border-[var(--border-color)] max-h-60 object-cover w-full"
              />
            </div>
          )}

          {/* Buttons */}
          <div className="mt-6 flex gap-4 items-center">
            <button
              className="w-1/2 py-2.5 rounded-lg bg-[var(--border-color)] text-white font-semibold transition cursor-pointer"
              onClick={() => {
                setOpen(false);
                resetForm();
              }}
            >
              Cancel
            </button>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-1/2 py-2.5 rounded-lg bg-[var(--accent-color)] text-[var(--background)] font-semibold hover:bg-[var(--accent-hover)] transition cursor-pointer"
            >
              {loading
                ? "Loading..."
                : editData
                ? "Update"
                : "Upload"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadImg;
