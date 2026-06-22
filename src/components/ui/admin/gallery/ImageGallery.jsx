"use client";

import { useEffect, useState } from "react";
import api from "@/utils/axios";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import UploadImg from "@/components/ui/admin/gallery/UploadImg"; // ✅ reuse same form

export default function ImageGallery({ refreshTrigger }) {
  const [images, setImages] = useState([]);
  const [visibleCount, setVisibleCount] = useState(8); // 👈 show 8 per page
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingImage, setEditingImage] = useState(null);

  // ✅ Fetch all images
  const fetchImages = async () => {
    try {
      const res = await api.get("/api/image-gallery");
      setImages(res.data.data || []);
    } catch (error) {
      console.error("Error fetching images:", error);
      toast.error("Failed to load images");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, [refreshTrigger]);

  // ✅ Handle delete
  const handleDelete = async (id) => {
    // if (!confirm("Are you sure you want to delete this image?")) return;
    try {
      const res = await api.delete(`/api/image-gallery/${id}`);
      toast.success(res.data?.message || "Image deleted");
      fetchImages();
    } catch (error) {
      console.error("Delete failed:", error);
      toast.error("Failed to delete image");
    }
  };

  // ✅ Handle edit (open same UploadImg form)
  const handleEdit = (item) => {
    setEditingImage(item);
    setEditModalOpen(true);
  };

  // ✅ Submit edit form
  const handleUpdate = async (formData) => {
    if (!editingImage?._id) return;
    try {
      await api.patch(`/api/image-gallery/${editingImage._id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Image updated successfully");
      setEditModalOpen(false);
      setEditingImage(null);
      fetchImages();
    } catch (error) {
      console.error("Update failed:", error);
      toast.error("Failed to update image");
    }
  };

  const handleViewMore = () => {
    setVisibleCount((prev) => prev + 8);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2
          className="animate-spin text-[var(--accent-color)]"
          size={40}
        />
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="text-center text-gray-400 py-10">
        No images found in the gallery.
      </div>
    );
  }

  return (
    <div>
      
      {/* ✅ Reuse UploadImg for Editing */}
      {editModalOpen && (
        <UploadImg
          open={editModalOpen}
          setOpen={setEditModalOpen}
          onSuccess={() => {
            setEditModalOpen(false);
            fetchImages();
          }}
          editData={editingImage} // 👈 pass current image for prefill
          isEdit
          handleUpdate={handleUpdate}
        />
      )}
      {/* ✅ Image Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {images.slice(0, visibleCount).map((item) => (
          <div
            key={item._id}
            className="bg-[var(--card-background)] border border-[var(--border-color)] rounded-2xl shadow-lg hover:shadow-[0_0_15px_var(--border-color)] hover:scale-[1.02] transition-transform duration-200"
          >
            <div className="relative w-full h-48 overflow-hidden rounded-t-2xl">
              <img
                src={item.image}
                alt={item.name}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              />
            </div>

            <div className="p-3 text-center space-y-3">
              <p className="text-lg font-semibold text-[var(--foreground)] truncate">
                {item.name}
              </p>

              {/* ✅ Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleEdit(item)}
                  className="flex items-center gap-1 bg-[var(--info-color)] hover:opacity-80 p-2 rounded-lg w-1/2 justify-center"
                >
                  <Pencil className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(item._id)}
                  className="flex items-center gap-1 bg-[var(--error-color)] hover:opacity-80 p-2 rounded-lg w-1/2 justify-center"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ✅ View More Button */}
      {visibleCount < images.length && (
        <div className="flex justify-center mt-8">
          <button
            onClick={handleViewMore}
            className="px-6 py-2 rounded-lg bg-[var(--accent-color)] text-[var(--background)] font-semibold hover:bg-[var(--accent-hover)] transition"
          >
            View More
          </button>
        </div>
      )}

    </div>
  );
}
