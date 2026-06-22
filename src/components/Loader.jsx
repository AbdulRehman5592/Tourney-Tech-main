"use client";

export default function Loader() {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center  bg-opacity-40"
      style={{
        background: "var(--background)",
      }}
    >
      <div
        className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin"
        style={{
          borderColor: "var(--accent-color)",
          borderTopColor: "transparent",
        }}
      ></div>
    </div>
  );
}
