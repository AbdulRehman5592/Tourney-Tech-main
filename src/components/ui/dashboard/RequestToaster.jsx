"use client";
import { useEffect, useState, useRef } from "react";
import api from "@/utils/axios";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";

import Link from "next/link";

export default function RequestToaster() {
  const [requests, setRequests] = useState([]);
  const [userId, setUserId] = useState(null);
  const prevRequestsRef = useRef([]);
  const router = useRouter();

  // Load user & requests
  const loadRequests = async () => {
    try {
      const resUser = await api.get("/api/me");
      const id = resUser.data?.data?.user?._id;
      setUserId(id);

      const resRequests = await api.get("/api/teamup");
      setRequests(resRequests.data?.data?.requests || []);
    } catch (err) {
      console.error(err);
    }
  };

  // Auto-refresh every 5s
  useEffect(() => {
    loadRequests();
    const interval = setInterval(loadRequests, 5000);
    return () => clearInterval(interval);
  }, []);

  // Detect new requests & show toast
  useEffect(() => {
    const prevRequests = prevRequestsRef.current;

    const newRequests = requests.filter(
      (r) => !prevRequests.find((pr) => pr._id === r._id)
    );

    newRequests.forEach((req) => {
      if (req.to?._id === userId && req.status === "pending") {
        toast.custom(
          (t) => (
            <div className="p-4 rounded-lg shadow-lg bg-[var(--card-background)] border border-[var(--border-color)] flex flex-col">
              <p className="mb-2">
                <strong>{req.from?.username}</strong> sent you a team up request
              </p>
              <div className="flex gap-2">
                <Link href={`/dashboard/received-requests`}>
                  <button
                    className="px-3 py-1 rounded bg-[var(--success-color)] text-white"
                    onClick={() => {
                      toast.dismiss(t.id);
                      router.push(`/dashboard/players/${req.from?._id}`);
                    }}
                  >
                    View
                  </button>
                </Link>
                <button
                  className="px-3 py-1 rounded bg-[var(--error-color)] text-white"
                  onClick={() => toast.dismiss(t.id)}
                >
                  Cancel
                </button>
              </div>
            </div>
          ),
          { duration: 5000 }
        );
      }
    });

    prevRequestsRef.current = requests;
  }, [requests, userId, router]);

  return null; // no UI needed, just toast
}
