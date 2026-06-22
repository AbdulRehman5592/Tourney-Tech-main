import Link from "next/link";
import { X } from "lucide-react";
import Image from "next/image";

import api from "@/utils/axios";
import { toast } from "react-hot-toast";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import { useRouter } from "next/navigation"; // ✅ add this

const logo = "/img/logo.jpg";

export default function DashboardSidebar({ isOpen, onClose, navItems }) {
  const [openMenu, setOpenMenu] = useState(null);
  const router = useRouter(); // ✅ add this

  const toggleSubmenu = (label) => {
    setOpenMenu(openMenu === label ? null : label);
  };

  const handleLogout = async () => {
    try {
      await api.post("/api/logout"); // or use your `api.post("/logout")`
      toast.success("Logged out successfully");
      router.push("/auth/login"); // Redirect to login page
    } catch (error) {
      toast.error("Logout failed");
      console.error("Logout error:", error);
    }
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        ></div>
      )}

      <aside
        className={`fixed z-50 lg:static top-0 left-0 h-full w-64 transform transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
        style={{
          backgroundColor: "var(--card-background)",
          color: "var(--foreground)",
        }}
      >
        <div
          className="flex justify-between items-center h-16 px-4 py-4"
          style={{ borderBottom: "1px solid var(--card-hover)" }}
        >
          <div className="flex items-center gap-3">
            <Image
              src={logo}
              alt="Tourney Tech Logo"
              width={30}
              height={30}
              className="rounded-full"
            />
            <h2 className="text-lg font-bold">Tourney Tech</h2>
          </div>
          <button onClick={onClose} className="lg:hidden text-xl">
            <X size={20} />
          </button>
        </div>

        {/* Dynamic Navigation */}
        <nav className="py-4 pb-20 px-3 scrollbar overflow-auto h-full scrollbar-sidebar">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.label} className="list-none">
                {item.children ? (
                  <>
                    <button
                      onClick={() => toggleSubmenu(item.label)}
                      className="flex items-center justify-between w-full px-2 py-2 hover:bg-[var(--card-hover)] rounded"
                    >
                      <span className="flex items-center gap-2">
                        <item.icon size={18} />
                        {item.label}
                      </span>
                      {openMenu === item.label ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      )}
                    </button>

                    {openMenu === item.label && (
                      <ul className="ml-6 mt-1 space-y-1">
                        {item.children.map((subItem) => (
                          <li key={subItem.label}>
                            <Link
                              href={subItem.href}
                              className="block text-sm px-2 py-1 rounded hover:bg-[var(--card-hover)]"
                              onClick={() => {
                                setOpenMenu(null);
                                onClose(); // ✅ close sidebar on submenu click
                              }}
                            >
                              {subItem.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : item.label === "Logout" ? (
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-2 py-2 w-full text-left hover:bg-[var(--card-hover)] rounded"
                  >
                    <item.icon size={18} />
                    {item.label}
                  </button>
                ) : (
                  <Link
                    href={item.href}
                    className="flex items-center gap-2 px-2 py-2 hover:bg-[var(--card-hover)] rounded"
                    onClick={onClose} // ✅ close sidebar on normal link click
                  >
                    <item.icon size={18} />
                    {item.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </>
  );
}
