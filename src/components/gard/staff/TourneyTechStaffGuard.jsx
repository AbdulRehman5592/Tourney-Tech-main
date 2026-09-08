"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Loader from "@/components/Loader";
import api from "@/utils/axios";
import { toast } from "react-hot-toast";

// Gate for pages meant for "Tourney Techs Staff" -- the global,
// admin-granted capability (User.isTourneyTechStaff) for people entrusted
// with general Tourney Tech operations work, e.g. deciding which
// tournaments count toward national rankings. Distinct from StaffGuard
// (per-tournament owner/organizer/manager/support) -- this is a site-wide
// capability, not scoped to any one tournament. A full admin always
// qualifies too.
export default function TourneyTechStaffGuard({ children }) {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const res = await api.get("/api/me");
        const user = res.data?.data?.user;

        if (!user) {
          router.push("/auth/login");
          return;
        }

        if (user.role === "admin" || user.isTourneyTechStaff) {
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
