"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Loader from "@/components/Loader";
import api from "@/utils/axios";
import { toast } from "react-hot-toast";

// Gate for the new "create your own tournament" page -- admits a global
// admin OR any user an admin has promoted (User.canCreateTournaments).
// Unlike StaffGuard (staff on at least one EXISTING tournament), this checks
// the new global creation capability instead.
export default function CreatorGuard({ children }) {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const meRes = await api.get("/api/me");
        const user = meRes.data?.data?.user;

        if (!user) {
          router.push("/auth/login");
          return;
        }

        if (user.role === "admin" || user.canCreateTournaments) {
          setAuthorized(true);
        } else {
          router.push("/unauthorized");
        }
      } catch (err) {
        toast.error("Unable to verify your session. Please log in again.");
        setTimeout(() => {
          router.push("/auth/login");
        }, 100);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [router]);

  if (loading) return <Loader />;
  if (!authorized) return null;

  return <>{children}</>;
}
