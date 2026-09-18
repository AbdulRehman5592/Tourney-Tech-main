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
      className="sticky top-0 z-30 w-full h-16 flex items-center justify-between gap-3 overflow-hidden px-6 bg-background"
      style={{ borderBottom: "1px solid var(--card-background)" }}
    >
      <div className="flex min-w-0 shrink items-center gap-4">
        {/* Mobile menu button */}
        <button className="shrink-0 lg:hidden" onClick={onMenuClick}>
          <Menu size={24} />
        </button>

        <h1 className="truncate text-lg font-semibold text-foreground">Dashboard</h1>
      </div>

      {/* Fixed height + no-wrap + truncate keeps this from ever overflowing
          the sticky header's bounds on a narrow window -- it used to be able
          to spill downward and cover the page's own controls underneath. */}
      <div className="shrink-0 truncate text-sm text-muted-foreground max-w-[45%]">
        {user ? `Hello, ${user.username}` : "Loading..."}
      </div>
    </header>
  );
}
