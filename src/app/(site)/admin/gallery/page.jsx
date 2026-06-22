"use client";
import React, { useState } from "react";
import UploadImg from "@/components/ui/admin/gallery/UploadImg";
import ImageGallery from "@/components/ui/admin/gallery/ImageGallery";
import { Plus } from "lucide-react";

const Gallery = () => {
  const [open, setOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleUploadSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div>
      <div className="flex items-center mb-8 justify-between">
        <h1 className="text-2xl font-bold">Image Gallery</h1>

        <button
          className="bg-[var(--accent-color)] text-[var(--background)] flex items-center gap-2 px-4 py-2 rounded-lg transition"
          onClick={() => setOpen(true)}
        >
          <Plus className="w-5 h-5" />
          <span>Add Image</span>
        </button>
      </div>

      <UploadImg open={open} setOpen={setOpen} onSuccess={handleUploadSuccess} />
      <ImageGallery refreshTrigger={refreshTrigger} />
    </div>
  );
};

export default Gallery;
