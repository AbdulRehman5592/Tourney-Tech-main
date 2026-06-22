import { useEffect, useState } from "react";
import api from "@/utils/axios";
import { useRouter } from "next/navigation";
import Loader from "@/components/Loader";

import { toast } from "react-hot-toast";

export default function UserGuard({ children }) {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkUserLogin = async () => {
      try {
        const res = await api.get("/api/me");
        const user = res?.data?.data?.user;

        if (user) {
          setAuthorized(true);
        } else {
            toast.error("You must be logged in to access this page.");
               setTimeout(() => {
            router.push("/auth/login");
          }, 100);
        }
      } catch (error) {
        toast.error("Unable to verify your session. Please log in again.");
         setTimeout(() => {
            router.push("/auth/login");
          }, 100);
      } finally {
        setLoading(false);
      }
    };

    checkUserLogin();
  }, []);

  if (loading) return <Loader />;
  if (!authorized) return null;

  return <>{children}</>;
}
