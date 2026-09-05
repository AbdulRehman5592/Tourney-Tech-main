"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Loader from "@/components/Loader";
import api from "@/utils/axios";
import { toast } from "react-hot-toast";

// Gate for pages meant for tournament staff, not just global admins -- e.g.
// Check-In and Live Tables, which an owner/organizer/manager/support staffer
// needs to reach even if they're an ordinary player account otherwise.
// Unlike AdminGuard (global role === "admin" only), this also admits anyone
// who is staff on at least one tournament; per-tournament API routes still
// enforce exactly which tournament/actions each staff role may touch.
export default function StaffGuard({ children }) {
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

        if (user.role === "admin") {
          setAuthorized(true);
          return;
        }

        const tournamentsRes = await api.get("/api/tournaments?includeDrafts=true");
        const tournaments = tournamentsRes.data?.data || [];
        const isStaffAnywhere = tournaments.some((t) =>
          (t.staff || []).some((member) => member.user?._id === user._id)
        );

        if (isStaffAnywhere) {
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
