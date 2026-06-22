"use client";
import { useRouter } from "next/navigation";

export default function Unauthorized() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center h-screen text-center px-4">
      <h1 className="text-4xl font-bold mb-4">🚫 Access Denied</h1>
      <p className="text-lg text-gray-600 mb-6">
        You are not authorized to view this page.
      </p>
      <button
        onClick={() => router.push("/")}
        className="bg-yellow-400 text-black px-6 py-2 rounded hover:bg-yellow-600 transition"
      >
        Go to Homepage
      </button>
    </div>
  );
}
