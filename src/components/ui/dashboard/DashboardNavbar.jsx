import { Menu } from "lucide-react";
import { useEffect, useState } from "react";
import api from "@/utils/axios";

export default function DashboardNavbar({ onMenuClick }) {
  const [user, setUser] = useState(null);

   useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await api.get("/api/me"); // adjust this if your route differs
        setUser(res.data.data.user);
      } catch (err) {
        console.error("Failed to fetch user:", err);
      }
    };

    fetchUser();
  }, []);
  return (
    <header
      className="sticky top-0 z-30 w-full h-16 flex items-center justify-between px-6 bg-background"
      style={{ borderBottom: "1px solid var(--card-background)" }}
    >
      <div className="flex items-center gap-4">
        {/* Mobile menu button */}
        <button className="lg:hidden" onClick={onMenuClick}>
          <Menu size={24} />
        </button>

        <h1 className="text-lg font-semibold text-foreground">Dashboard</h1>
      </div>

      <div className="text-sm text-muted-foreground">
        {/* Hello, {user.username} */}
         {user ? `Hello, ${user.username}` : "Loading..."}
        </div>
    </header>
  );
}
